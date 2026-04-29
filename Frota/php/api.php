<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// Tenta pegar o payload se for POST JSON principal
$postData = json_decode(file_get_contents('php://input'), true);
if ($postData && isset($postData['action'])) {
    $action = $postData['action'];
}

if (!$action) {
    echo json_encode(["status" => "erro", "mensagem" => "Ação não informada."]);
    exit;
}

function uniqid_short() {
    return 'PE' . substr(uniqid(), -5);
}

try {
    if ($method === 'GET') {
        if ($action === 'buscarRascunhos') {
            $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE status IN ('Rascunho', 'Em Producao', 'Aguardando Saida', 'Em Rota', 'Retornando') ORDER BY data_manual DESC, id DESC");
            $stmt->execute();
            $dados = $stmt->fetchAll();
            echo json_encode(["status" => "sucesso", "dados" => $dados]);
            exit;
        }

        if ($action === 'buscarRelatorios') {
            $dataInicio = $_GET['dataInicio'] ?? date('Y-m-d');
            $dataFim = $_GET['dataFim'] ?? date('Y-m-d');
            $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE data_finalizacao >= ? AND data_finalizacao <= ? ORDER BY data_finalizacao DESC");
            $stmt->execute([$dataInicio, $dataFim]);
            $dados = $stmt->fetchAll();
            echo json_encode(["status" => "sucesso", "dados" => $dados]);
            exit;
        }
        
        // Motorista lista suas OS Em Rota
        if ($action === 'buscarPedidosMotorista') {
            $motorista = $_GET['motorista'] ?? '';
            $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE motorista = ? AND status = 'Em Rota'");
            $stmt->execute([$motorista]);
            $dados = $stmt->fetchAll();
            echo json_encode(["status" => "sucesso", "dados" => $dados]);
            exit;
        }

        // Florista lista suas OS Em Producao
        if ($action === 'buscarPedidosFlorista') {
            $florista = $_GET['florista'] ?? '';
            $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE florista = ? AND status = 'Em Producao'");
            $stmt->execute([$florista]);
            $dados = $stmt->fetchAll();
            echo json_encode(["status" => "sucesso", "dados" => $dados]);
            exit;
        }

        if ($action === 'obterContadores') {
            $hoje = date('Y-m-d');
            $stmt1 = $pdo->prepare("SELECT COUNT(*) FROM pedidos WHERE data_manual = ?");
            $stmt1->execute([$hoje]); $h = $stmt1->fetchColumn();
            $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM pedidos WHERE status = 'Rascunho'");
            $stmt2->execute(); $p = $stmt2->fetchColumn();
            $stmt3 = $pdo->prepare("SELECT COUNT(*) FROM pedidos WHERE status = 'Finalizado' AND data_finalizacao = ?");
            $stmt3->execute([$hoje]); $f = $stmt3->fetchColumn();
            // Ocorrências de atraso (Consolare)
            $stmt4 = $pdo->prepare("SELECT COUNT(*) FROM pedidos WHERE is_ocorrencia = 1");
            $stmt4->execute(); $o = (int)$stmt4->fetchColumn();
            // Coroas a retirar hoje ainda não baixadas — o frontend soma via JS após chamar o GAS do F3
            // Aqui retornamos só as ocorrências de atraso para o badge
            echo json_encode(["status" => "sucesso", "dados" => [
                "pedidosHoje" => $h, "aguardandoDespacho" => $p, "finalizadosHoje" => $f, "ocorrencias" => $o
            ]]);
            exit;
        }

        if ($action === 'buscarOcorrencias') {
            $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE is_ocorrencia = 1 ORDER BY data_entrega DESC, hora_prazo DESC");
            $stmt->execute();
            $dados = $stmt->fetchAll();
            echo json_encode(["status" => "sucesso", "dados" => $dados]);
            exit;
        }

        // ✅ Verifica se coroas de determinada loja já foram baixadas hoje
        if ($action === 'buscarOcorrenciasCoroas') {
            $hoje = date('Y-m-d');
            $stmt  = $pdo->prepare("SELECT loja_chave FROM ocorrencias_coroas WHERE data = ?");
            $stmt->execute([$hoje]);
            $resolvidas = array_column($stmt->fetchAll(), 'loja_chave');
            echo json_encode(["status" => "sucesso", "dados" => $resolvidas]);
            exit;
        }
    }

    if ($method === 'POST') {
        if ($action === 'salvarPedido') {
            $d = $postData['dados'];
            $id = uniqid_short();
            $itensJSON = json_encode($d['itens']);
            $frase_coroa = $d['frase_coroa'] ?? '';
            $horaPrazo = $d['hora_entrega'] ?? null;
            
            $stmt = $pdo->prepare("INSERT INTO pedidos (id, pedido, cliente, falecido, status, data_entrega, hora_prazo, local_entrega, itensJSON, data_manual, frase_coroa) VALUES (?, ?, ?, ?, 'Rascunho', ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id, $d['pedido'], $d['cliente'], $d['falecido'], $d['data_entrega'], $horaPrazo, $d['local_entrega'], $itensJSON, $d['data_manual'], $frase_coroa
            ]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Rascunho salvo com sucesso!"]);
            exit;
        }

        if ($action === 'atribuirFlorista') {
            $d = $postData['dados'];
            $florista  = $d['florista'];
            $pedidoIds = $d['pedidoIds'] ?? [];
            if (empty($pedidoIds) || !$florista) {
                echo json_encode(["status" => "erro", "mensagem" => "Florista ou IDs não informados."]);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Em Producao', florista = ? WHERE id = ?");
            foreach ($pedidoIds as $pid) {
                $stmt->execute([$florista, $pid]);
            }
            echo json_encode(["status" => "sucesso", "dados" => "OS atribuída(s) a {$florista}!"]);
            exit;
        }

        if ($action === 'aceitarProducao') {
            $d    = $postData['dados'];
            $id   = $d['pedido_id'];
            $hora = date('H:i');
            $stmt = $pdo->prepare("UPDATE pedidos SET hora_inicio_producao = ? WHERE id = ?");
            $stmt->execute([$hora, $id]);
            echo json_encode(["status" => "sucesso", "dados" => "Produção iniciada às {$hora}!"]);
            exit;
        }

        if ($action === 'despachar') {
            $d = $postData['dados'];
            $viagemId = 'V' . substr(uniqid(), -4);
            $horaSaida = $d['horarios']['saida_fabrica'] ?? date('H:i');
            
            $fotoPath = null;
            if (!empty($d['fotoBase64'])) {
                $dir = "../../uploads/fotos/";
                if (!is_dir($dir)) mkdir($dir, 0777, true);
                
                $parts = explode(',', $d['fotoBase64']);
                $data = isset($parts[1]) ? base64_decode($parts[1]) : base64_decode($parts[0]);
                
                // Fetch pedidos info
                $idList = array_map(function($p) { return $p['id']; }, $d['pedidos']);
                $inQuery = implode(',', array_fill(0, count($idList), '?'));
                $stmt = $pdo->prepare("SELECT id, pedido FROM pedidos WHERE id IN ($inQuery)");
                $stmt->execute($idList);
                $rows = $stmt->fetchAll();
                
                $mapaPedidos = [];
                foreach ($rows as $r) {
                    $num = preg_replace('/[^A-Za-z0-9]/', '', $r['pedido']);
                    if (empty($num)) $num = 'SEMPEDIDO';
                    $mapaPedidos[$r['id']] = $num;
                }
                
                $osPrefixoArr = [];
                foreach ($d['pedidos'] as $p) {
                    $cleanId = preg_replace('/[^A-Za-z0-9]/', '', $p['id']);
                    $num = $mapaPedidos[$p['id']] ?? 'SEMPEDIDO';
                    $osPrefixoArr[] = $cleanId . "_PED" . $num;
                }
                $osPrefixo = implode('_', $osPrefixoArr);
                $nome_arquivo = $osPrefixo . "_DESPACHO_" . $viagemId . "_" . time() . ".jpg";
                
                if (file_put_contents($dir . $nome_arquivo, $data)) {
                    // Como a API roda em Frota/php, e os.html esta em Frota, ../ salva a URL correta 
                    // para visualizacao q eh ../uploads/fotos/
                    $fotoPath = "../uploads/fotos/" . $nome_arquivo; 
                }
            }
            
            $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Em Rota', viagem_id = ?, motorista = ?, agente = ?, mesa = ?, veiculo = ?, combustivel_preco = ?, distancia = ?, custo_combustivel = ?, hora_saida = ?, foto_despacho = ? WHERE id = ?");
            
            foreach ($d['pedidos'] as $ped) {
                // Para não quebrar XAMPP em múltiplas atualizações
                // NÃO sobrescreve local_entrega — preserva o endereço original do cadastro
                $stmt->execute([
                    $viagemId, $d['motorista'], $d['agente'], $d['mesa'], $d['veiculo'], $d['combustivel_preco'], $d['distancia_total'], $d['custo_combustivel'], $horaSaida, $fotoPath, $ped['id']
                ]);
            }
            
            echo json_encode(["status" => "sucesso", "dados" => "Pedidos despachados com sucesso!"]);
            exit;
        }

        if ($action === 'finalizarEntrega') {
            $d = $postData['dados'];
            $id = $d['id'];
            $quemRecebeu = $d['quem_recebeu'];
            $horaEntrega = empty($d['hora_entrega']) ? date('H:i') : $d['hora_entrega'];
            
            $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Retornando', quem_recebeu = ?, hora_entrega = ? WHERE id = ?");
            $stmt->execute([$quemRecebeu, $horaEntrega, $id]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Entrega finalizada com sucesso!"]);
            exit;
        }

        if ($action === 'aceitarViagem') {
            $d = $postData['dados'];
            $viagemId = $d['viagem_id'];
            $horaAceite = date('H:i');
            
            // Marca a saída / aceite
            $stmt = $pdo->prepare("UPDATE pedidos SET hora_saida = ? WHERE viagem_id = ?");
            $stmt->execute([$horaAceite, $viagemId]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Rota aceita às $horaAceite!"]);
            exit;
        }

        if ($action === 'aceitarEntrega') {
            $d = $postData['dados'];
            $id = $d['pedido_id'];
            $horaAceite = date('H:i');
            
            $stmt = $pdo->prepare("UPDATE pedidos SET hora_inicio_entrega = ? WHERE id = ?");
            $stmt->execute([$horaAceite, $id]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Entrega iniciada às $horaAceite!"]);
            exit;
        }

        if ($action === 'registrarRetornoViagem') {
            $d = $postData['dados'];
            $viagemId = $d['viagem_id'];
            $horaRetorno = empty($d['hora_retorno']) ? date('H:i') : $d['hora_retorno'];
            $dataHoje = date('Y-m-d');
            
            $stmt = $pdo->prepare("UPDATE pedidos SET status = 'Finalizado', hora_retorno = ?, data_finalizacao = ? WHERE viagem_id = ?");
            $stmt->execute([$horaRetorno, $dataHoje, $viagemId]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Retorno registrado com sucesso!"]);
            exit;
        }

        if ($action === 'resolverOcorrencia') {
            $d = $postData['dados'];
            $id = $d['id'];
            $motivo = $d['motivo'];
            
            $stmt = $pdo->prepare("UPDATE pedidos SET is_ocorrencia = 2, motivo_ocorrencia = ? WHERE id = ?");
            $stmt->execute([$motivo, $id]);
            
            echo json_encode(["status" => "sucesso", "dados" => "Ocorrência baixada com sucesso!"]);
            exit;
        }

        // ✅ Registra a retirada de coroas no banco (INSERT IGNORE evita duplicata no mesmo dia)
        if ($action === 'resolverOcorrenciaCoroas') {
            $d          = $postData['dados'];
            $hoje       = date('Y-m-d');
            $lojaChave  = $d['loja_chave']  ?? '';
            $lojaNome   = $d['loja_nome']   ?? $lojaChave;
            $quantidade = $d['quantidade']  ?? 0;
            $obs        = $d['observacao']  ?? '';

            if (!$lojaChave) {
                echo json_encode(["status" => "erro", "mensagem" => "loja_chave não informada."]);
                exit;
            }

            // INSERT IGNORE respeita UNIQUE KEY (data, loja_chave) — não gera erro se já existir
            $stmt = $pdo->prepare("INSERT IGNORE INTO ocorrencias_coroas (data, loja_chave, loja_nome, quantidade, observacao) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$hoje, $lojaChave, $lojaNome, $quantidade, $obs]);

            echo json_encode(["status" => "sucesso", "dados" => "Retirada de coroas confirmada — {$lojaNome} ({$quantidade} coroa(s))."]);
            exit;
        }
    }
    
    echo json_encode(["status" => "erro", "mensagem" => "Ação não encontrada."]);

} catch (\PDOException $e) {
    echo json_encode(["status" => "erro", "mensagem" => "Erro de Banco de Dados: " . $e->getMessage()]);
} catch (\Exception $e) {
    echo json_encode(["status" => "erro", "mensagem" => "Erro: " . $e->getMessage()]);
}
?>
