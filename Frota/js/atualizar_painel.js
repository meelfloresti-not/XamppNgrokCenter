window.atualizarPainel = async () => {
  if (typeof window.carregarDadosDespacho === 'function') {
      window.carregarDadosDespacho();
  }
  // Se for o ES6 do app.js ele foi bindado na module:
  if (window.AppCarregarStats) {
      window.AppCarregarStats();
  }
};
setInterval(() => {
    window.atualizarPainel();
}, 10000);
