// =============================================
// UI Helpers
// =============================================

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast toast--${type}`;

    // Force reflow
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Helpers adicionais do dashboard
function toggleLoading(show, message) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.classList.remove('hidden');
        const h2 = overlay.querySelector('h2');
        if (h2 && message) h2.textContent = message;
    } else {
        overlay.classList.add('hidden');
    }
}
