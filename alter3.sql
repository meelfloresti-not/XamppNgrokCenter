USE logistica_frota;
ALTER TABLE pedidos
  ADD COLUMN florista VARCHAR(100),
  ADD COLUMN hora_inicio_producao TIME,
  ADD COLUMN hora_fim_producao TIME,
  ADD COLUMN foto_producao VARCHAR(255);
