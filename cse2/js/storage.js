// =============================================
// STORAGE MODULE - CSE2
// =============================================
// Requer APP_CONFIG definido globalmente pelo HTML

function saveCache(registros) {
    if(!window.APP_CONFIG) return;
    try {
        localStorage.setItem(APP_CONFIG.CACHE_KEY, JSON.stringify(registros));
    } catch (e) { console.error('Error saving cache', e); }
}

function loadCache() {
    if(!window.APP_CONFIG) return [];
    try {
        const d = localStorage.getItem(APP_CONFIG.CACHE_KEY);
        if (d) return JSON.parse(d);
    } catch (e) { console.error('Error loading cache', e); }
    return [];
}

function savePendingQueue(pendingQueue) {
    if(!window.APP_CONFIG) return;
    try {
        localStorage.setItem(APP_CONFIG.PENDING_KEY, JSON.stringify(pendingQueue));
    } catch (e) { }
}

function loadPendingQueue() {
    if(!window.APP_CONFIG) return [];
    try {
        const d = localStorage.getItem(APP_CONFIG.PENDING_KEY);
        if (d) return JSON.parse(d);
    } catch (e) { }
    return [];
}

// ── Alertas de estoque ──────────────────────────────────────
// Formato: { 'material|||local': { medio: N, minimo: N } }
function saveAlertas(al) {
    if(!window.APP_CONFIG) return;
    try { localStorage.setItem(APP_CONFIG.CACHE_KEY + '_alertas', JSON.stringify(al)); } catch(e) {}
}

function loadAlertas() {
    if(!window.APP_CONFIG) return {};
    try {
        const d = localStorage.getItem(APP_CONFIG.CACHE_KEY + '_alertas');
        if(d) return JSON.parse(d);
    } catch(e) {}
    return {};
}

// ── Operador padrão (preenchido uma vez, reutilizado) ────────
function saveOperador(nome) {
    if(!window.APP_CONFIG) return;
    try { localStorage.setItem(APP_CONFIG.CACHE_KEY + '_operador', nome); } catch(e) {}
}

function loadOperador() {
    if(!window.APP_CONFIG) return '';
    try { return localStorage.getItem(APP_CONFIG.CACHE_KEY + '_operador') || ''; } catch(e) { return ''; }
}
