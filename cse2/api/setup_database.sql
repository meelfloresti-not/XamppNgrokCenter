-- =============================================
-- ESTOQUE DB - Setup Script
-- Banco relacional para o controle de estoque CSE2
-- =============================================

CREATE DATABASE IF NOT EXISTS estoque_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE estoque_db;

-- ─── PRODUTOS ───────────────────────────────────────────
-- Cada material+local é um "produto" único com saldo calculado
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    tipo_material VARCHAR(100) NOT NULL,
    local_estoque VARCHAR(200) NOT NULL,
    estoque_medio INT DEFAULT 0,
    estoque_minimo INT DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_produto_local (nome, local_estoque)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── MOVIMENTAÇÕES ──────────────────────────────────────
-- Ledger (livro-razão): cada ação gera UMA nova linha imutável
CREATE TABLE IF NOT EXISTS movimentacoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_legado VARCHAR(50) DEFAULT NULL COMMENT 'ID original do Google Sheets para migração',
    id_produto INT NOT NULL,
    tipo ENUM('Entrada','Saída') NOT NULL,
    data_hora DATETIME NOT NULL,
    responsavel VARCHAR(100) NOT NULL,
    fornecedor VARCHAR(150) DEFAULT '',
    quem_recebeu VARCHAR(100) DEFAULT '',
    quem_cadastrou VARCHAR(100) DEFAULT '',
    qtd_pacotes INT DEFAULT 0,
    unid_pacote INT DEFAULT 0,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    observacao TEXT,
    status ENUM('ATIVO','EXCLUÍDO') DEFAULT 'ATIVO',
    motivo_exclusao TEXT DEFAULT NULL,
    data_exclusao DATETIME DEFAULT NULL,
    origem VARCHAR(10) DEFAULT 'CEQP' COMMENT 'CEF, CEQP ou CELF',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_produto) REFERENCES produtos(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── VIEW: SALDO POR PRODUTO ────────────────────────────
-- Consulta rápida de saldo sem precisar somar tudo no JS
CREATE OR REPLACE VIEW vw_saldo_produtos AS
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
LEFT JOIN movimentacoes m ON m.id_produto = p.id
GROUP BY p.id, p.nome, p.tipo_material, p.local_estoque, p.estoque_medio, p.estoque_minimo;


-- ─── ÍNDICES DE PERFORMANCE ─────────────────────────────
CREATE INDEX idx_mov_produto ON movimentacoes(id_produto);
CREATE INDEX idx_mov_tipo ON movimentacoes(tipo);
CREATE INDEX idx_mov_status ON movimentacoes(status);
CREATE INDEX idx_mov_data ON movimentacoes(data_hora);
CREATE INDEX idx_mov_origem ON movimentacoes(origem);
