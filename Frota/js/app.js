import { initUIListeners, updateOnlineStatus, showToast, mostrarStatus } from './ui.js';
import { gasGET } from './api.js';
import { views } from './views.js';
import { initCadastrar } from './cadastrar.js';
import { initDespachar, initAutocomplete } from './despachar.js';
import { initRelatorios } from './relatorios.js';
import { initOcorrencias } from './ocorrencias.js';

const App = {
  init() {
    initUIListeners();
    updateOnlineStatus();

    document.getElementById('btnTestarConexao')?.addEventListener('click', this.testarConexao.bind(this));

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.target, btn));
    });

    this.carregarStats();

    const initTabBtn = document.querySelector('.tab-btn[data-target="tabCadastrar"]');
    if (initTabBtn) this.showTab('tabCadastrar', initTabBtn);
  },

  showTab(tabId, el) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const container = document.getElementById('app-content');
    if (container && views[tabId]) {
      container.innerHTML = views[tabId]();
    }

    if (tabId === 'tabCadastrar') initCadastrar();
    if (tabId === 'tabDespachar') { initDespachar(); initAutocomplete(); }
    if (tabId === 'tabOcorrencias') initOcorrencias();
    if (tabId === 'tabRelatorios') initRelatorios();
  },

  async carregarStats() {
    try {
      // ✅ Uma única chamada ao GAS — toda a lógica de contagem fica no servidor
      const res = await gasGET({ action: 'obterContadores' });

      if (res.status !== 'sucesso') {
        console.warn('obterContadores retornou erro:', res.mensagem);
        return;
      }

      const s = res.dados;

      const statH = document.getElementById('statPedidosHoje');
      const statP = document.getElementById('statPendentes');
      const statF = document.getElementById('statFinalizados');
      const statK = document.getElementById('statKmMes');

      if (statH) statH.textContent = s.pedidosHoje ?? '—';
      if (statP) statP.textContent = s.aguardandoDespacho ?? '—';
      if (statF) statF.textContent = s.finalizadosHoje ?? '—';

      const badgeOcorrencias = document.getElementById('badgeOcorrencias');
      if (badgeOcorrencias) {
          const qtdOcorrencias = parseInt(s.ocorrencias || 0);
          if (qtdOcorrencias > 0) {
              badgeOcorrencias.style.display = 'inline-block';
              badgeOcorrencias.textContent = qtdOcorrencias;
          } else {
              badgeOcorrencias.style.display = 'none';
          }
      }

      // KM Total Mês continua sendo calculado via buscarRelatorios separado
      // pois o GAS não agrega km no obterContadores (mantém chamada separada)
      this.carregarKmMes(statK);

    } catch (e) {
      console.warn('Falha ao carregar stats:', e);
    }
  },

  async carregarKmMes(statK) {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const hoje = `${yyyy}-${mm}-${String(now.getDate()).padStart(2, '0')}`;
      const mesI = `${yyyy}-${mm}-01`;

      const relRes = await gasGET({ action: 'buscarRelatorios', dataInicio: mesI, dataFim: hoje });

      if (relRes.status === 'sucesso' && statK) {
        let kmTotal = 0;
        (relRes.dados || []).forEach(r => {
          const km = parseFloat(String(r.distancia).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(km)) kmTotal += km;
        });
        statK.textContent = kmTotal > 0 ? kmTotal.toFixed(1) : '0';
      }
    } catch (e) {
      console.warn('Falha ao carregar KM mês:', e);
    }
  },

  async testarConexao() {
    showToast('Testando conexão...', 'info');
    gasGET({ action: 'obterContadores' }).then(json => {
      if (json.status === 'sucesso') {
        showToast('Conexão OK! Contadores carregados.', 'success');
        mostrarStatus('✅ Conectado ao Google Sheets', 'ok');
      } else {
        showToast('Erro: ' + (json.mensagem || ''), 'error');
      }
    }).catch(err => {
      showToast('Falha: ' + err.message, 'error');
      mostrarStatus('❌ Sem conexão', 'erro');
    });
  }
};

window.onload = () => App.init();

export const carregarStats = App.carregarStats.bind(App);
window.AppCarregarStats = carregarStats;