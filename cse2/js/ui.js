// =============================================
// UI MODULE - CSE2
// =============================================

function showToast(msg, type = 'info') {
    const icons = { success: '✓', error: '✕', info: '◆' };
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoading(msg) {
    const txt = document.getElementById('loadingText');
    if (txt) txt.textContent = msg || 'Sincronizando...';
    document.getElementById('loadingOverlay')?.classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay')?.classList.remove('active');
}

function updateOnlineStatus() {
    const badge = document.getElementById('statusBadge');
    const text = document.getElementById('statusText');
    if (!badge || !text) return;
    if (navigator.onLine) {
        badge.className = 'status-badge online';
        text.textContent = 'Online';
    } else {
        badge.className = 'status-badge offline';
        text.textContent = 'Offline';
    }
}

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
    if (!d) return '-';
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return String(d);
    }
}

// Global modal handlers
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    const reasonGroup = document.getElementById('deleteReasonGroup');
    const reason = document.getElementById('deleteReason');
    if (overlay) overlay.classList.remove('open');
    if (reasonGroup) reasonGroup.style.display = 'none';
    if (reason) reason.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
});
