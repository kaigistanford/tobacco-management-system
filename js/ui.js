// =============================================
// TEMS — UI Module
// Shared UI helpers: nav, toasts, modals, etc.
// =============================================

const UI = (() => {

  // ---- Build Sidebar Navigation ----
  const buildNav = (activePageId) => {
    const user = Auth.getUser();
    if (!user) return;

    const navEl = document.getElementById('sidebar-nav');
    if (!navEl) return;

    const role = user.role;
    const perms = TEMS_CONFIG.PERMISSIONS[role] || [];

    let html = '';
    let currentSection = '';

    const sections = {
      dashboard: '',
      products:  'Operations',
      suppliers: 'Operations',
      purchases: 'Operations',
      shipments: 'Operations',
      sales:     'Operations',
      inventory: 'Operations',
      users:     'Administration',
      reports:   'Administration',
      settings:  'Administration',
    };

    TEMS_CONFIG.NAV_ITEMS.forEach(item => {
      if (!perms.includes(item.id)) return;

      const sec = sections[item.id] || '';
      if (sec && sec !== currentSection) {
        currentSection = sec;
        html += `<div class="nav-section">${sec}</div>`;
      }

      const active = item.id === activePageId ? 'active' : '';
      html += `
        <a class="nav-item ${active}" href="${item.href}" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `;
    });

    navEl.innerHTML = html;

    // User info in footer
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.fullName || user.username;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
  };

  // ---- Mobile sidebar toggle ----
  const initMobileSidebar = () => {
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    const open = () => {
      sidebar?.classList.add('open');
      backdrop?.classList.add('show');
    };
    const close = () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('show');
    };

    menuBtn?.addEventListener('click', open);
    backdrop?.addEventListener('click', close);
  };

  // ---- Logout button ----
  const initLogout = () => {
    document.getElementById('logout-btn')?.addEventListener('click', Auth.logout);
  };

  // ---- Toast Notifications ----
  let toastTimer = null;

  const showToast = (type, title, message, duration = 4000) => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const id = 'toast_' + Date.now();

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = id;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
    `;

    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  };

  // ---- Sync status indicator ----
  const setSyncStatus = async (status) => {
    const dot   = document.querySelector('.sync-dot');
    const label = document.querySelector('.sync-label');
    if (!dot) return;

    dot.className = 'sync-dot';
    if (status === 'offline') {
      dot.classList.add('offline');
      if (label) label.textContent = 'Offline';
    } else if (status === 'syncing') {
      dot.classList.add('syncing');
      if (label) label.textContent = 'Syncing…';
    } else if (status === 'pending') {
      dot.classList.add('offline');
      const count = await OfflineSync.getQueueCount();
      if (label) label.textContent = `${count} pending`;
    } else {
      if (label) label.textContent = 'Synced';
    }
  };

  // ---- Offline banner ----
  const showOfflineBanner = () => {
    document.querySelector('.offline-banner')?.classList.remove('hidden');
  };
  const hideOfflineBanner = () => {
    document.querySelector('.offline-banner')?.classList.add('hidden');
  };

  // ---- Modal helpers ----
  const openModal = (id) => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (id) => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  const initModalCloseButtons = () => {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.closeModal;
        closeModal(id);
      });
    });
    // Close on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });
  };

  // ---- Confirm dialog ----
  const confirm = (message, onConfirm, { title = 'Confirm', danger = false } = {}) => {
    const id = 'confirm-modal';
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = id;
      overlay.innerHTML = `
        <div class="modal confirm-modal">
          <div class="confirm-body">
            <div class="confirm-icon">${danger ? '⚠️' : '❓'}</div>
            <h3 class="modal-title" id="confirm-title">${title}</h3>
            <p class="confirm-msg" id="confirm-msg"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
            <button class="btn btn-${danger ? 'danger' : 'primary'}" id="confirm-ok">${danger ? 'Delete' : 'Confirm'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = message;
    openModal(id);

    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');

    const cleanup = () => {
      closeModal(id);
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
    };

    document.getElementById('confirm-ok').addEventListener('click', () => {
      cleanup();
      onConfirm();
    });
    document.getElementById('confirm-cancel').addEventListener('click', cleanup);
  };

  // ---- Format currency ----
  const formatCurrency = (amount) => {
    const n = Number(amount) || 0;
    return TEMS_CONFIG.CURRENCY_SYMBOL + ' ' + n.toLocaleString('en-TZ');
  };

  // ---- Format date ----
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-TZ', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  // ---- Pagination helper ----
  const buildPagination = (containerId, totalItems, currentPage, perPage, onPageChange) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / perPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const start = (currentPage - 1) * perPage + 1;
    const end   = Math.min(currentPage * perPage, totalItems);

    let pageButtons = '';
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
        pageButtons += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-p="${i}">${i}</button>`;
      } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
        pageButtons += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
      }
    }

    container.innerHTML = `
      <span>Showing ${start}–${end} of ${totalItems}</span>
      <div class="pagination-btns">
        <button class="page-btn" data-p="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
        ${pageButtons}
        <button class="page-btn" data-p="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
      </div>
    `;

    container.querySelectorAll('[data-p]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.p);
        if (p >= 1 && p <= totalPages && p !== currentPage) onPageChange(p);
      });
    });
  };

  // ---- Table helpers ----
  const showTableLoading = (tbodyId) => {
    const tbody = document.getElementById(tbodyId);
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="20">
        <div class="loading-spinner"><div class="spinner"></div> Loading…</div>
      </td></tr>`;
  };

  const showTableEmpty = (tbodyId, msg = 'No records found.') => {
    const tbody = document.getElementById(tbodyId);
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="20">
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-title">${msg}</div>
          <div class="empty-desc">Add your first record to get started.</div>
        </div>
      </td></tr>`;
  };

  // ---- Install prompt ----
  let _deferredInstallPrompt = null;
  const initInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredInstallPrompt = e;
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (!_deferredInstallPrompt) return;
      _deferredInstallPrompt.prompt();
      const { outcome } = await _deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('install-banner')?.classList.add('hidden');
      }
      _deferredInstallPrompt = null;
    });

    document.getElementById('install-dismiss')?.addEventListener('click', () => {
      document.getElementById('install-banner')?.classList.add('hidden');
    });
  };

  // ---- Page init (call on every protected page) ----
  const initPage = (pageId) => {
    if (!Auth.guardPage(pageId)) return false;
    buildNav(pageId);
    initMobileSidebar();
    initLogout();
    initModalCloseButtons();
    initInstallPrompt();
    OfflineSync.init();
    return true;
  };

  return {
    buildNav, initMobileSidebar, initLogout,
    showToast,
    setSyncStatus, showOfflineBanner, hideOfflineBanner,
    openModal, closeModal, initModalCloseButtons,
    confirm,
    formatCurrency, formatDate,
    buildPagination,
    showTableLoading, showTableEmpty,
    initInstallPrompt,
    initPage
  };
})();
