// =============================================
// Integração GAS e Configurações
// =============================================

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjM35PU1rPeBtJFTjSnLdG9T4ivjTVaAGqKFjtyAc-sLxHoA-c72qtT_E3D0xi-yG0/exec";

function getScriptUrl() {
    return localStorage.getItem('gasUrl') || DEFAULT_SCRIPT_URL;
}

async function gasPost(payload) {
    const url = getScriptUrl();
    if (!url) throw new Error('URL do Apps Script não configurada');

    const res = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    });

    // no-cors mode makes it impossible to read res.ok or res.json(), 
    // it always returns an opaque response, which we treat as success if no throw.
    return res;
}

// Pelo Dashboard, é mandado request GET
async function gasGet(customUrl) {
    const url = customUrl || getScriptUrl();
    if (!url) throw new Error('URL do Apps Script não configurada');

    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na requisição. HTTP: ' + response.status);

    return await response.json();
}
