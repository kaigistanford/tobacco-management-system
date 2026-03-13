// =============================================
// TEMS — Shared Page Template Helper
// Generates sidebar + header HTML structure
// =============================================

const AppTemplate = {
  getSidebarHTML: () => `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">🌿</div>
        <div class="logo-text">TEMS <span>Tobacco Enterprise Mgmt</span></div>
      </div>
      <div class="sidebar-nav" id="sidebar-nav"></div>
      <div class="sidebar-footer">
        <div class="user-avatar" id="sidebar-avatar">A</div>
        <div class="user-info">
          <div class="user-name" id="sidebar-user-name">Loading…</div>
          <div class="user-role" id="sidebar-user-role"></div>
        </div>
        <button class="logout-btn" id="logout-btn" title="Logout">🚪</button>
      </div>
    </nav>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  `,

  getHeaderHTML: (title, breadcrumb = '') => `
    <header class="top-header">
      <button class="header-menu-btn" id="menu-btn">☰</button>
      <div>
        <div class="header-title">${title}</div>
        ${breadcrumb ? `<div class="header-breadcrumb">${breadcrumb}</div>` : ''}
      </div>
      <div class="header-spacer"></div>
      <div class="header-search">
        <span class="search-icon">🔍</span>
        <input type="text" id="global-search" placeholder="Search…">
      </div>
      <div class="sync-indicator" title="Sync status">
        <div class="sync-dot"></div>
        <span class="sync-label">Online</span>
      </div>
      <button class="notif-btn" id="notif-btn" title="Notifications">
        🔔
        <span class="notif-badge" id="notif-badge" style="display:none"></span>
      </button>
    </header>
  `,

  getToastContainer: () => `<div class="toast-container" id="toast-container"></div>`,

  getOfflineBanner: () => `
    <div class="offline-banner hidden" id="offline-banner">
      📡 You are currently offline. Changes will be queued and synced when your connection returns.
    </div>
  `,

  getInstallBanner: () => `
    <div class="install-banner hidden" id="install-banner">
      <span style="font-size:1.5rem">📲</span>
      <div class="install-banner-text">
        <strong>Install TEMS</strong> — Add to your home screen for offline access and a native app experience.
      </div>
      <button class="btn btn-primary btn-sm" id="install-btn">Install</button>
      <button class="btn btn-ghost btn-sm" id="install-dismiss">✕</button>
    </div>
  `
};
