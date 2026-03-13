// =============================================
// TEMS — Authentication Module
// Handles login, session, role-based access
// =============================================

const Auth = (() => {
  // ---- Getters ----
  const getToken = () => localStorage.getItem(TEMS_CONFIG.TOKEN_KEY);
  const getUser  = () => {
    try {
      const raw = localStorage.getItem(TEMS_CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const isLoggedIn = () => {
    const token = getToken();
    const user  = getUser();
    return !!(token && user);
  };

  const hasPermission = (page) => {
    const user = getUser();
    if (!user) return false;
    const perms = TEMS_CONFIG.PERMISSIONS[user.role] || [];
    return perms.includes(page);
  };

  const isAdmin = () => {
    const user = getUser();
    return user && user.role === TEMS_CONFIG.ROLES.ADMIN;
  };

  // ---- Login ----
  const login = async (username, password) => {
    try {
      const res = await API.post('login', { username, password });
      if (res.success) {
        localStorage.setItem(TEMS_CONFIG.TOKEN_KEY, res.token);
        localStorage.setItem(TEMS_CONFIG.USER_KEY, JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid credentials' };
    } catch (err) {
      // Offline: try local credential check
      const cachedCreds = OfflineSync.getCachedCredentials();
      if (cachedCreds && cachedCreds[username]) {
        const cached = cachedCreds[username];
        if (cached.passwordHash === hashPassword(password)) {
          localStorage.setItem(TEMS_CONFIG.TOKEN_KEY, 'offline_token');
          localStorage.setItem(TEMS_CONFIG.USER_KEY, JSON.stringify(cached.user));
          return { success: true, offline: true };
        }
      }
      return { success: false, message: 'Login failed. Check your connection.' };
    }
  };

  // ---- Logout ----
  const logout = () => {
    localStorage.removeItem(TEMS_CONFIG.TOKEN_KEY);
    localStorage.removeItem(TEMS_CONFIG.USER_KEY);
    window.location.href = 'login.html';
  };

  // ---- Guard page ----
  // Call at top of each protected page
  const guardPage = (pageId) => {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    if (pageId && !hasPermission(pageId)) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  };

  // ---- Simple password hash (client side only — real auth via Apps Script) ----
  const hashPassword = (pwd) => {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  };

  // ---- Cache credentials for offline login ----
  const cacheCredentials = (username, password, user) => {
    const existing = OfflineSync.getCachedCredentials() || {};
    existing[username] = { passwordHash: hashPassword(password), user };
    localStorage.setItem('tems_cred_cache', JSON.stringify(existing));
  };

  return {
    getToken, getUser, isLoggedIn, hasPermission, isAdmin,
    login, logout, guardPage, cacheCredentials
  };
})();
