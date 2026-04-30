<?php
// =============================================
// API: MOVIMENTAÇÕES - CSE2 Estoque
// =============================================
// POST → salvar / excluir movimentação
// GET  → listar movimentações (com filtros opcionais)
// GET ?acao=ping → health check

require_once __DIR__ . '/conexao.php';

$pdo = getConnection();

// ─── GET ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $acao   = $_GET['acao']   ?? 'listar';
    $origem = $_GET['origem'] ?? '';

    // Ping / health check
    if ($acao === 'ping') {
        jsonResponse(true, ['message' => 'pong', 'timestamp' => date('c')]);
    }

    // Listar movimentações
    if ($acao === 'listar') {
        $where  = [];
        $params = [];

        if ($origem) {
            $where[]           = 'm.origem = :origem';
            $params['origem']  = $origem;
        }

        $sql = "
            SELECT 
                m.id,
                m.id_legado,
                m.tipo,
                m.data_hora AS data,
                m.responsavel AS quem,
                m.fornecedor,
                m.quem_recebeu   AS quemRecebeu,
                m.quem_cadastrou AS quemCadastrou,
                p.local_estoque  AS local,
                p.nome           AS material,
                p.tipo_material  AS tipoMaterial,
                m.qtd_pacotes,
                m.unid_pacote,
                m.quantidade     AS qtd,
                m.valor_unitario AS vunit,
                m.valor_total    AS vtotal,
                m.observacao     AS obs,
                m.status,
                CASE WHEN m.status = 'EXCLUÍDO' THEN 1 ELSE 0 END AS deletado,
                m.motivo_exclusao  AS motivoExclusao,
                m.data_exclusao    AS dataExclusao,
                m.criado_em        AS criadoEm
            FROM movimentacoes m
            JOIN produtos p ON p.id = m.id_produto
        ";

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY m.data_hora DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $registros = $stmt->fetchAll();

        // Cast numéricos para o JS não tratar como string
        foreach ($registros as &$r) {
            $r['id']          = (int) $r['id'];
            $r['qtd_pacotes'] = (int) $r['qtd_pacotes'];
            $r['unid_pacote'] = (int) $r['unid_pacote'];
            $r['qtd']         = (int) $r['qtd'];
            $r['vunit']       = (float) $r['vunit'];
            $r['vtotal']      = (float) $r['vtotal'];
            $r['deletado']    = (bool) $r['deletado'];
        }
        unset($r);

        jsonResponse(true, ['registros' => $registros]);
    }

    jsonResponse(false, ['error' => 'Ação GET desconhecida: ' . $acao], 400);
}

// ─── POST ───────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        jsonResponse(false, ['error' => 'JSON inválido'], 400);
    }

    $acao   = $data['acao']   ?? '';
    $origem = $data['origem'] ?? 'CEQP';
    $r      = $data['registro'] ?? [];

    // ── SALVAR ──────────────────────────────────────────
    if ($acao === 'salvar') {
        $material     = trim($r['material'] ?? '');
        $tipoMaterial = trim($r['tipoMaterial'] ?? '');
        $local        = trim($r['local'] ?? '');

        if (!$material || !$local) {
            jsonResponse(false, ['error' => 'Material e Local são obrigatórios'], 400);
        }

        // Garantir que o produto existe (auto-cadastro)
        $idProduto = garantirProduto($pdo, $material, $tipoMaterial, $local);

        $stmt = $pdo->prepare("
            INSERT INTO movimentacoes 
                (id_legado, id_produto, tipo, data_hora, responsavel, fornecedor,
                 quem_recebeu, quem_cadastrou, qtd_pacotes, unid_pacote,
                 quantidade, valor_unitario, valor_total, observacao, origem)
            VALUES 
                (:legado, :prod, :tipo, :data, :resp, :forn,
                 :receb, :cad, :pac, :unidpac,
                 :qtd, :vunit, :vtotal, :obs, :origem)
        ");

        $dataHora = $r['data'] ?? date('Y-m-d H:i:s');
        // Normalizar formatos de data ISO
        if (strpos($dataHora, 'T') !== false) {
            $dataHora = date('Y-m-d H:i:s', strtotime($dataHora));
        }

        $stmt->execute([
            'legado'  => $r['id'] ?? null,
            'prod'    => $idProduto,
            'tipo'    => $r['tipo'] ?? 'Entrada',
            'data'    => $dataHora,
            'resp'    => $r['quem'] ?? '',
            'forn'    => $r['fornecedor'] ?? '',
            'receb'   => $r['quemRecebeu'] ?? '',
            'cad'     => $r['quemCadastrou'] ?? '',
            'pac'     => (int)($r['qtd_pacotes'] ?? 0),
            'unidpac' => (int)($r['unid_pacote'] ?? 0),
            'qtd'     => (int)($r['qtd'] ?? 0),
            'vunit'   => (float)($r['vunit'] ?? 0),
            'vtotal'  => (float)($r['vtotal'] ?? 0),
            'obs'     => $r['obs'] ?? '',
            'origem'  => $origem,
        ]);

        $newId = (int) $pdo->lastInsertId();
        jsonResponse(true, ['message' => 'Movimentação salva!', 'id' => $newId]);
    }

    // ── EXCLUIR ─────────────────────────────────────────
    if ($acao === 'excluir') {
        $idLegado = $r['id'] ?? '';
        $idMovimentacao = $r['idMovimentacao'] ?? null;
        
        if ($idMovimentacao) {
            // Exclusão pelo ID do MySQL
            $stmt = $pdo->prepare("
                UPDATE movimentacoes 
                SET status = 'EXCLUÍDO', 
                    motivo_exclusao = :motivo, 
                    data_exclusao = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                'id'     => $idMovimentacao,
                'motivo' => $r['motivoExclusao'] ?? '',
            ]);
        } else {
            // Fallback: exclusão pelo ID legado (migração)
            $stmt = $pdo->prepare("
                UPDATE movimentacoes 
                SET status = 'EXCLUÍDO', 
                    motivo_exclusao = :motivo, 
                    data_exclusao = NOW()
                WHERE id_legado = :legado
            ");
            $stmt->execute([
                'legado' => (string)$idLegado,
                'motivo' => $r['motivoExclusao'] ?? '',
            ]);
        }

        jsonResponse(true, ['message' => 'Registro excluído com sucesso!']);
    }

    jsonResponse(false, ['error' => 'Ação POST desconhecida: ' . $acao], 400);
}

jsonResponse(false, ['error' => 'Método não permitido'], 405);
