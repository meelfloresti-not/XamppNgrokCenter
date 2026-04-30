<?php
// =============================================
// API: PRODUTOS - CSE2 Estoque
// =============================================
// GET → retorna todos os produtos com saldo calculado via VIEW
// GET ?origem=CEQP → filtra por origem

require_once __DIR__ . '/conexao.php';

$pdo = getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $origem = $_GET['origem'] ?? '';

    if ($origem) {
        // Saldo filtrado por origem
        $sql = "
            SELECT 
                p.id AS id_produto,
                p.nome,
                p.tipo_material,
                p.local_estoque,
                p.estoque_medio,
                p.estoque_minimo,
                COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' AND m.status = 'ATIVO' THEN m.quantidade ELSE 0 END), 0) AS total_entrada,
                COALESCE(SUM(CASE WHEN m.tipo = 'Saída' AND m.status = 'ATIVO' THEN m.quantidade ELSE 0 END), 0) AS total_saida,
                COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' AND m.status = 'ATIVO' THEN m.quantidade ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN m.tipo = 'Saída' AND m.status = 'ATIVO' THEN m.quantidade ELSE 0 END), 0) AS saldo,
                COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' AND m.status = 'ATIVO' THEN m.qtd_pacotes ELSE 0 END), 0) AS entrada_pacotes,
                COALESCE(SUM(CASE WHEN m.tipo = 'Saída' AND m.status = 'ATIVO' THEN m.qtd_pacotes ELSE 0 END), 0) AS saida_pacotes,
                COALESCE(SUM(CASE WHEN m.status = 'ATIVO' THEN m.valor_total ELSE 0 END), 0) AS valor_total_movimentado,
                MAX(CASE WHEN m.unid_pacote > 0 THEN m.unid_pacote ELSE NULL END) AS unid_pacote
            FROM produtos p
            LEFT JOIN movimentacoes m ON m.id_produto = p.id AND m.origem = :origem
            GROUP BY p.id, p.nome, p.tipo_material, p.local_estoque, p.estoque_medio, p.estoque_minimo
            HAVING saldo != 0 OR total_entrada > 0
            ORDER BY p.nome
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['origem' => $origem]);
    } else {
        // Saldo geral (usa a view)
        $stmt = $pdo->query("SELECT * FROM vw_saldo_produtos ORDER BY nome");
    }

    $produtos = $stmt->fetchAll();

    // Cast numéricos
    foreach ($produtos as &$p) {
        $p['id_produto']             = (int) $p['id_produto'];
        $p['estoque_medio']          = (int) $p['estoque_medio'];
        $p['estoque_minimo']         = (int) $p['estoque_minimo'];
        $p['total_entrada']          = (int) $p['total_entrada'];
        $p['total_saida']            = (int) $p['total_saida'];
        $p['saldo']                  = (int) $p['saldo'];
        $p['entrada_pacotes']        = (int) $p['entrada_pacotes'];
        $p['saida_pacotes']          = (int) $p['saida_pacotes'];
        $p['valor_total_movimentado']= (float) $p['valor_total_movimentado'];
        $p['unid_pacote']            = (int) ($p['unid_pacote'] ?? 0);
    }
    unset($p);

    jsonResponse(true, ['produtos' => $produtos]);
}

jsonResponse(false, ['error' => 'Método não permitido'], 405);
