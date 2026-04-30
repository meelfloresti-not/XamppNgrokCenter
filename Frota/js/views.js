export const views = {
  tabCadastrar: () => `
    <div class="form-card">
      <div class="form-title">Novo Pedido</div>

      <!-- Integração FlowFlora -->
      <div class="form-grid" style="background:rgba(99,102,241,0.05); padding:16px; border-radius:8px; margin-bottom:16px; border:1px solid rgba(99,102,241,0.2);">
        <div class="form-group span2">
          <label style="color:var(--primary, #a5b4fc); font-weight:600;">🌸 Buscar OS na FlowFlora</label>
          <div style="display:flex; gap:8px; margin-top:4px;">
            <input type="text" id="cad_busca_os" placeholder="Nº da OS (ex: 99064)" style="flex:1;">
            <button class="btn btn-primary" id="btnBuscarFlowFlora" type="button" style="width:auto; white-space:nowrap; background:var(--primary, #6366f1); border-color:var(--primary, #6366f1); color:#fff;">🔍 Puxar Dados</button>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Data</label>
          <input type="date" id="cad_data_manual">
        </div>
        <div class="form-group">
          <label>Nº do Pedido</label>
          <input type="text" id="cad_pedido" placeholder="Ex: 5678">
        </div>
        <div class="form-group">
          <label>Funerária</label>
          <select id="cad_cliente_select" style="margin-bottom:8px;">
            <option value="">Selecione...</option>
            <option value="Consolare">Consolare</option>
            <option value="Avelino">Avelino</option>
            <option value="Tatuapé">Tatuapé</option>
            <option value="Anjo Luz">Anjo Luz</option>
            <option value="Outra">Outra...</option>
          </select>
          <input type="text" id="cad_cliente" placeholder="Nome completo" style="display:none;">
        </div>
        <div class="form-group">
          <label>Nome do Falecido</label>
          <input type="text" id="cad_falecido" placeholder="Nome do homenageado">
        </div>
        <div class="form-group">
          <label>Data de Entrega</label>
          <input type="date" id="cad_data_entrega">
        </div>
        <div class="form-group">
          <label>Hora de Entrega</label>
          <input type="time" id="cad_hora_entrega">
        </div>
        <div class="form-group span2">
          <label>Local de Entrega</label>
          <input type="text" id="cad_local_entrega" placeholder="Ex: Cemitério da Paz, São Paulo">
        </div>
        <div class="form-group">
          <label>Quantidade de Itens</label>
          <select id="cad_numItens">
            <option value="0">Selecionar...</option>
            <option value="1">1 Item</option>
            <option value="2">2 Itens</option>
            <option value="3">3 Itens</option>
            <option value="4">4 Itens</option>
            <option value="5">5 Itens</option>
            <option value="6">6 Itens</option>
            <option value="7">7 Itens</option>
            <option value="8">8 Itens</option>
            <option value="9">9 Itens</option>
            <option value="10">10 Itens</option>
          </select>
        </div>
      </div>

      <div id="containerItens"></div>

      <div class="form-group" id="grupoFrasesCoroas" style="margin-top:16px;">
        <label>Frases das Coroas</label>
        <textarea id="cad_frases_coroas" placeholder="Ex: Saudades eternas..." style="min-height: 60px;"></textarea>
      </div>

      <div class="form-group" style="margin-top:16px;">
        <label>Observação</label>
        <textarea id="cad_observacao" placeholder="Anotações adicionais sobre o pedido..."></textarea>
      </div>

      <button class="btn btn-draft" id="btnSalvarPedido">📌 Salvar como Rascunho</button>
    </div>
  `,

  tabDespachar: () => `
    <div class="kanban-header">
      <div class="form-title" style="margin:0;">Painel de Despacho</div>
      <button class="btn" id="btnRefreshDespacho">⟳ Atualizar</button>
    </div>

    <div class="kanban-board">
      <!-- Col 1: Pendente -->
      <div class="kanban-column">
        <div class="kanban-col-header amber">
          📌 Pendente
          <span class="kanban-count" id="countPendente">0</span>
        </div>
        <div class="kanban-cards" id="listaRascunhosDespacho">
          <div class="kanban-empty">Clique "Atualizar" para carregar</div>
        </div>
        <div id="areaAtribuirFlorista" style="padding:12px; display:none;">
          <button class="btn btn-florista" id="btnAbrirAtribuirFlorista">🌸 Atribuir Florista</button>
        </div>
      </div>

      <!-- Col 2: Em Produção -->
      <div class="kanban-column">
        <div class="kanban-col-header purple">
          🌸 Em Produção
          <span class="kanban-count" id="countEmProducao">0</span>
        </div>
        <div class="kanban-cards" id="listaEmProducao">
          <div class="kanban-empty">Nenhuma OS em produção</div>
        </div>
      </div>

      <!-- Col 3: Aguardando Saída -->
      <div class="kanban-column">
        <div class="kanban-col-header cyan">
          📦 Aguardando Saída
          <span class="kanban-count" id="countAguardandoSaida">0</span>
        </div>
        <div class="kanban-cards" id="listaAguardandoSaida">
          <div class="kanban-empty">Nenhuma OS pronta para saída</div>
        </div>
      </div>

      <!-- Col 4: Em Rota -->
      <div class="kanban-column">
        <div class="kanban-col-header blue">
          🚚 Em Rota
          <span class="kanban-count" id="countEmRota">0</span>
        </div>
        <div class="kanban-cards" id="listaEmRota">
          <div class="kanban-empty">Nenhum pedido em rota</div>
        </div>
      </div>

      <!-- Col 5: Retornando -->
      <div class="kanban-column">
        <div class="kanban-col-header orange">
          🔄 Retornando
          <span class="kanban-count" id="countRetornando">0</span>
        </div>
        <div class="kanban-cards" id="listaRetornando">
          <div class="kanban-empty">Nenhum veículo retornando</div>
        </div>
      </div>

      <!-- Col 6: Finalizado -->
      <div class="kanban-column">
        <div class="kanban-col-header green">
          ✅ Finalizado Hoje
          <span class="kanban-count" id="countFinalizado">0</span>
        </div>
        <div class="kanban-cards" id="listaFinalizados">
          <div class="kanban-empty">Nenhum despacho hoje</div>
        </div>
      </div>
    </div>

    <!-- Painel de Despacho (ativado por Aguardando Saída) -->
    <div id="painelDespacho" class="hidden">
      <div class="form-card">
        <div class="section-title">Pedidos Selecionados para Despacho</div>
        <div id="containerPedidosSelecionados" style="margin-bottom:16px;">Nenhum selecionado</div>

        <div class="dispatch-section">
          <div class="section-title">Veículo e Motorista</div>
          <div class="form-group">
            <label>Veículo Utilizado</label>
            <div class="vehicle-grid">
              <label>
                <input type="radio" name="desp_veiculo" value="Fiorino" class="vehicle-radio" checked>
                <div class="vehicle-card">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <span>Fiorino</span>
                </div>
              </label>
              <label>
                <input type="radio" name="desp_veiculo" value="Kangoo" class="vehicle-radio">
                <div class="vehicle-card">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                  <span>Kangoo</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Preço Combustível (R$/L)</label>
              <input type="number" step="0.01" id="desp_gasPrice" value="4.39">
            </div>
            <div class="form-group">
              <label>Motorista</label>
              <select id="desp_motorista">
                <option value="">Selecione...</option>
                <option>Fernando</option><option>Gilberto</option><option>Leonardo</option>
                <option>Ronie</option>
              </select>
            </div>
            <div class="form-group">
              <label>Agente</label>
              <input type="text" id="desp_agente" placeholder="Nome do agente">
            </div>
            <div class="form-group">
              <label>Mesa / Setor</label>
              <input type="text" id="desp_mesa" placeholder="Setor responsável">
            </div>
          </div>
        </div>

        <div class="dispatch-section">
          <div class="section-title">Rota e Horários</div>
          <div class="form-grid">
            <div class="form-group" style="position:relative;">
              <label>Ponto A (Base)</label>
              <input type="text" id="desp_pontoA" value="Av. flor de vila formosa 692, São Paulo, SP" autocomplete="off">
              <div id="desp_pontoA_drop" class="autocomplete-dropdown"></div>
            </div>
            <div class="form-group">
              <label>🕐 Saída da Fábrica</label>
              <input type="time" id="desp_hora_saida">
            </div>
          </div>

          <div id="desp_stopsContainer">
            <div class="stop-row stop-group">
              <div class="addr" style="position:relative;">
                <label class="stop-label">Ponto B (Entrega)</label>
                <input type="text" class="stop-input" placeholder="Endereço de entrega" autocomplete="off">
                <div class="autocomplete-dropdown"></div>
              </div>
              <button type="button" class="btn btn-danger remove-btn hidden">✕</button>
            </div>
          </div>

          <button type="button" class="btn btn-outline" id="btnAdicionarParada">+ Adicionar Outra Parada</button>

          <div class="form-grid" style="margin-top:16px;">
            <div class="form-group">
              <button type="button" class="btn" id="btnCalcularDist" style="width:100%;">
                <span id="btnCalcularText">📍 Calcular Rota</span>
              </button>
            </div>
          </div>

          <div class="result-box" id="distanceResult">
            <div class="result-header">Distância Total (Ida e Volta)</div>
            <div class="result-value" id="distanceValue">— km</div>
            <div class="result-grid">
              <div class="result-item"><label>Custo Total Combustível</label><div id="totalCost">R$ —</div></div>
              <div class="result-item"><label>Custo p/ Km Rodado</label><div id="costPerKm">R$ — / km</div></div>
            </div>
          </div>

          <div id="miniMapContainer" style="display:none; margin-top:16px; border-radius:10px; overflow:hidden; border:1px solid var(--border);">
            <div style="padding:8px 12px; background:var(--surface-2,var(--surface2)); font-size:12px; font-weight:600; color:var(--text-sec); border-bottom:1px solid var(--border);">🗺️ Visualização da Rota</div>
            <div id="miniMap" style="height:280px; width:100%;"></div>
          </div>

          <div class="form-grid" style="margin-top:16px; margin-bottom:16px;">
            <div class="form-group span2">
              <label>📷 Foto da Coroa (Opcional)</label>
              <input type="file" id="desp_fotoCoroa" accept="image/*" capture="environment" style="width:100%; border:1px solid var(--border); padding:8px; border-radius:6px; background:var(--surface2);">
              <small style="color:var(--text-dim); display:block; margin-top:4px;">Foto no momento da saída da base.</small>
            </div>
          </div>

          <button class="btn-final btn" id="btnFinalizar">✔ Finalizar Despacho</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Atribuir Florista -->
    <div id="modalAtribuirFlorista" class="modal hidden">
      <div class="modal-content">
        <div class="form-title">🌸 Atribuir Florista</div>
        <p style="margin-top:0; color:var(--text-dim); margin-bottom:16px;">Selecione o florista que irá confeccionar as OS marcadas.</p>
        <div class="form-group">
          <label>Florista Responsável</label>
          <select id="selFlorista">
            <option value="">Selecione...</option>
            <option>Davi</option><option>Felipe</option><option>Luana</option>
            <option>Pedro</option>
          </select>
        </div>
        <div class="modal-actions" style="margin-top:20px; display:flex; gap:12px;">
          <button class="btn btn-outline" id="btnCancelarAtribuir" style="flex:1;">Cancelar</button>
          <button class="btn btn-florista" id="btnConfirmarAtribuir" style="flex:1; width:auto;">🌸 Confirmar Atribuição</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Finalizar Entrega -->
    <div id="modalFinalizar" class="modal hidden">
      <div class="modal-content">
        <div class="form-title">Finalizar Entrega</div>
        <p style="margin-top:0; color:var(--text-dim);">Confirme a entrega do pedido <strong id="lblFinalizarPedido"></strong>.</p>
        <div class="form-group" style="margin-top:16px;">
          <label>Quem Recebeu?</label>
          <input type="text" id="inpQuemRecebeu" placeholder="Nome de quem recebeu">
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>🕐 Horário da Entrega</label>
          <input type="time" id="inpHoraEntrega">
        </div>
        <div class="modal-actions" style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-outline" id="btnCancelarFinalizar" style="flex:1;">Cancelar</button>
          <button class="btn btn-final" id="btnConfirmarFinalizar" style="flex:1;">✔ Confirmar Entrega</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Retorno à Base -->
    <div id="modalRetorno" class="modal hidden">
      <div class="modal-content">
        <div class="form-title">Confirmar Retorno à Base</div>
        <p style="margin-top:0; color:var(--text-dim);">Viagem <strong id="lblRetornoViagem"></strong> — <span id="lblRetornoPedidos"></span> pedido(s).</p>
        <div class="form-group" style="margin-top:16px;">
          <label>🕐 Hora de Chegada na Base</label>
          <input type="time" id="inpHoraRetorno">
        </div>
        <div class="modal-actions" style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-outline" id="btnCancelarRetorno" style="flex:1;">Cancelar</button>
          <button class="btn btn-primary" id="btnConfirmarRetorno" style="flex:1; width:auto;">✔ Confirmar Chegada</button>
        </div>
      </div>
    </div>
  `,

  tabOcorrencias: () => `
    <div class="form-card">
      <div class="form-title">Painel de Ocorrências</div>
      <p style="color:var(--text-sec); font-size:14px; margin-top:-10px;">Entregas atrasadas (Consolare) e coroas a retirar (Formosa / Quarta Parada).</p>
      
      <div id="listaOcorrenciasContainer" style="margin-top:24px;">
        <div style="text-align:center; padding:30px; color:var(--text-dim);">Carregando ocorrências...</div>
      </div>
    </div>
    
    <!-- MODAL: Resolver Atraso (Consolare) -->
    <div id="modalResolverOcorrencia" class="modal hidden">
      <div class="modal-content">
        <div class="form-title">Justificar Ocorrência</div>
        <p style="margin-top:0; color:var(--text-dim);">Descreva o motivo do atraso para o pedido <strong id="lblOcorrenciaId"></strong>.</p>
        <div class="form-group" style="margin-top:16px;">
          <label>Motivo / Observação</label>
          <textarea id="inpMotivoOcorrencia" placeholder="Ex: Trânsito, Motorista demorou na base..." style="min-height: 80px;"></textarea>
        </div>
        <div class="modal-actions" style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-outline" id="btnCancelarOcorrencia" style="flex:1;">Cancelar</button>
          <button class="btn btn-primary" id="btnConfirmarOcorrencia" style="flex:1; width:auto; background:var(--danger); border-color:var(--danger); color:var(--amber);">✔ Dar Baixa</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Confirmar Retirada de Coroas -->
    <div id="modalCoroas" class="modal hidden">
      <div class="modal-content">
        <div class="form-title">🌺 Retirada de Coroas</div>
        <p style="margin-top:0; color:var(--text-dim);">Confirme a retirada das coroas da loja <strong id="lblCoroasLoja"></strong>.</p>
        <div style="text-align:center; margin:16px 0;">
          <span style="font-size:48px; font-weight:bold; color:var(--amber);" id="lblCoroasQtd">0</span>
          <div style="font-size:14px; color:var(--text-sec);">coroa(s) a retirar</div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <label>Observação (opcional)</label>
          <textarea id="inpObsCoroas" placeholder="Ex: Coroas entregues ao cliente X..." style="min-height: 60px;"></textarea>
        </div>
        <div class="modal-actions" style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-outline" id="btnCancelarCoroas" style="flex:1;">Cancelar</button>
          <button class="btn" id="btnConfirmarCoroas" style="flex:1; width:auto; background:var(--amber); color:#000; font-weight:bold;">✅ Confirmar Retirada</button>
        </div>
      </div>
    </div>
  `,

  tabRelatorios: () => `
    <div class="form-card">
      <div class="form-title">Filtrar OS Finalizadas</div>
      <div class="filters-bar" style="background:transparent;padding:0;border:0;">
        <div class="filter-group">
          <label>Data Início</label>
          <input type="date" id="rel_data_inicio">
        </div>
        <div class="filter-group">
          <label>Data Fim</label>
          <input type="date" id="rel_data_fim">
        </div>
        <button type="button" class="btn btn-primary" id="btnRelatorio" style="align-self:flex-end;width:auto;">🔍 Buscar</button>
        <button type="button" class="btn" id="btnDebugRelatorio" style="align-self:flex-end;width:auto;font-size:10px;">🔧 Debug</button>
      </div>
    </div>

    <div id="debugInfo" class="debug-info"></div>

    <div class="table-wrapper" id="boxTabelaRelatorio" style="display:none;">
      <div class="table-header-bar">
        <span class="table-title">📋 Resultados</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Veículo</th>
              <th>Viagem</th>
              <th>Distância</th>
              <th>Custo R$</th>
            </tr>
          </thead>
          <tbody id="corpoTabelaRelatorio"></tbody>
        </table>
      </div>
      <div id="relMsgEmpty" class="msg-empty hidden">Nenhum registro encontrado neste período</div>
    </div>
  `
};
