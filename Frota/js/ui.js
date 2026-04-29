export function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : '● ') + msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function showLoading(msg) {
  const textEl = document.getElementById('loadingText');
  const overlayEl = document.getElementById('loadingOverlay');
  if (textEl) textEl.textContent = msg || 'Carregando...';
  if (overlayEl) overlayEl.classList.add('active');
}

export function hideLoading() {
  const overlayEl = document.getElementById('loadingOverlay');
  if (overlayEl) overlayEl.classList.remove('active');
}

export function mostrarStatus(msg, tipo) {
  const bar = document.getElementById('statusBar');
  if (!bar) return;
  bar.style.display = 'block';
  bar.textContent = msg;
  if (tipo === 'ok') { bar.style.borderColor = 'var(--green-dim)'; bar.style.color = 'var(--green)'; bar.style.background = 'var(--green-glow)'; }
  else if (tipo === 'erro') { bar.style.borderColor = 'var(--red-dim)'; bar.style.color = 'var(--red)'; bar.style.background = 'var(--red-glow)'; }
  else { bar.style.borderColor = 'var(--amber-dim)'; bar.style.color = 'var(--amber)'; bar.style.background = 'var(--amber-glow)'; }
  setTimeout(() => bar.style.display = 'none', 6000);
}

export function updateOnlineStatus() {
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

export function initUIListeners() {
  window.addEventListener('online', () => { updateOnlineStatus(); showToast('Conexão restaurada', 'success'); });
  window.addEventListener('offline', () => { updateOnlineStatus(); showToast('Sem conexão', 'error'); });
}
