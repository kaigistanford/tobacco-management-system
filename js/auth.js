// =============================================
// TEMS — Auth Module
// Handles login, logout, session, role checks
// =============================================

const Auth = (() => {

  const TOKEN_KEY = 'tems_auth_token';
  const USER_KEY  = 'tems_user_data';

  // ---- Get current session ----
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function hasPermission(page) {
    const user = getUser();
    if (!user) return false;
    const perms = TEMS_CONFIG.PERMISSIONS[user.role] || [];
    return perms.includes(page);
  }

  // ---- Login ----
  async function login(username, password) {
    // Build GET URL directly — no POST, no JSON headers
    const url = TEMS_CONFIG.APPS_SCRIPT_URL
      + '?action=login'
      + '&username=' + encodeURIComponent(username)
      + '&password=' + encodeURIComponent(password);

    const res  = await fetch(url);
    const data = await res.json();

    if (data.success) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
    }

    return data;
  }

  // ---- Logout ----
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
  }

  // ---- Protect pages ----
  // Call this at the top of every page except login.html
  function requireLogin(pageId) {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    if (pageId && !hasPermission(pageId)) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  return { login, logout, getToken, getUser, isLoggedIn, hasPermission, requireLogin };
})();
