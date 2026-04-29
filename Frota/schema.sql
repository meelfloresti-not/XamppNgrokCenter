CREATE DATABASE IF NOT EXISTS logistica_frota;
USE logistica_frota;

CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(50) PRIMARY KEY,
    pedido VARCHAR(100),
    cliente VARCHAR(255),
    falecido VARCHAR(255),
    status VARCHAR(50),
    data_entrega DATE,
    local_entrega TEXT,
    itensJSON TEXT,
    viagem_id VARCHAR(50),
    motorista VARCHAR(100),
    agente VARCHAR(100),
    mesa VARCHAR(100),
    veiculo VARCHAR(50),
    distancia DECIMAL(10,2),
    combustivel_preco DECIMAL(10,2),
    custo_combustivel DECIMAL(10,2),
    quem_recebeu VARCHAR(100),
    hora_saida TIME,
    hora_entrega TIME,
    hora_retorno TIME,
    foto_entrega VARCHAR(255),
    data_finalizacao DATE,
    data_manual DATE DEFAULT CURRENT_DATE
);

-- Controle de baixas de coroas a retirar (F3 Formosa / FFQP Quarta Parada)
-- Preenchido pelo os.html quando o operador confirma a retirada
CREATE TABLE IF NOT EXISTS ocorrencias_coroas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    data         DATE NOT NULL,
    loja_chave   VARCHAR(10) NOT NULL,      -- 'F3' ou 'FFQP'
    loja_nome    VARCHAR(100),
    quantidade   DECIMAL(5,0) DEFAULT 0,
    observacao   TEXT,
    resolvida_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unica_loja_dia (data, loja_chave)  -- 1 registro por loja por dia
);
