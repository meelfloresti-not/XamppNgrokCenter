// =============================================
// Auto-Save Draft (Cache Dinâmico)
// =============================================

function saveDraft(formId, draftKey) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const draft = {};
    formData.forEach((value, key) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && input.type !== 'file') {
            draft[key] = value;
        }
    });
    localStorage.setItem(draftKey, JSON.stringify(draft));
}

function loadDraft(formId, draftKey) {
    const draftStr = localStorage.getItem(draftKey);
    if (!draftStr) return;
    try {
        const draft = JSON.parse(draftStr);
        const form = document.getElementById(formId);
        if (!form) return;

        Object.keys(draft).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`) || document.getElementById(key);
            if (input && input.type !== 'file') {
                input.value = draft[key];
            }
        });
    } catch (e) {
        console.error('Erro ao ler rascunho', e);
    }
}

function clearDraft(draftKey) {
    localStorage.removeItem(draftKey);
}
