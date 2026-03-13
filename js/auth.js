// =============================================
// TEMS — Auth Module
// =============================================

const Auth = (() => {

  const TOKEN_KEY = () => TEMS_CONFIG.TOKEN_KEY;
  const USER_KEY  = () => TEMS_CONFIG.USER_KEY;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY());
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY())); }
    catch (e) { return null; }
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

  // Login using pure GET — no POST, no JSON headers, no CORS
  async function login(username, password) {
    const url = TEMS_CONFIG.APPS_SCRIPT_URL
      + '?action=login'
      + '&username=' + encodeURIComponent(username)
      + '&password=' + encodeURIComponent(password);

    const res  = await fetch(url);
    const data = await res.json();

    if (data.success) {
      localStorage.setItem(TOKEN_KEY(), data.token);
      localStorage.setItem(USER_KEY(),  JSON.stringify(data.user));
    }
    return data;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY());
    localStorage.removeItem(USER_KEY());
    window.location.href = 'login.html';
  }

  // guardPage — called by every page to check login and permissions
  // also aliased as requireLogin for compatibility
  function guardPage(pageId) {
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

  // Alias so both names work
  const requireLogin = guardPage;

  // initPage — called at bottom of every page
  function initPage(pageId) {
    return guardPage(pageId);
  }

  return {
    login, logout,
    getToken, getUser,
    isLoggedIn, hasPermission,
    guardPage, requireLogin, initPage
  };
})();
