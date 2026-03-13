// =============================================
// TEMS — API Module
// ALL requests sent as GET to avoid CORS
// =============================================

const API = (() => {
  const BASE = () => localStorage.getItem('tems_api_url') || TEMS_CONFIG.APPS_SCRIPT_URL;
  const getToken = () => localStorage.getItem(TEMS_CONFIG.TOKEN_KEY);

  // Every single request — reads AND writes — goes as a GET with data in the URL
  const call = async (action, params = {}) => {
    const token = getToken();
    const allParams = { action, ...params };
    if (token) allParams.token = token;

    // Encode any objects/arrays as JSON strings
    Object.keys(allParams).forEach(k => {
      if (typeof allParams[k] === 'object' && allParams[k] !== null) {
        allParams[k] = JSON.stringify(allParams[k]);
      }
    });

    const url = BASE() + '?' + new URLSearchParams(allParams).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  };

  return {
    login:              (u, p)  => call('login',             { username: u, password: p }),
    getDashboard:       ()      => call('getDashboard'),
    getProducts:        ()      => call('getProducts'),
    createProduct:      (d)     => call('createProduct',     d),
    updateProduct:      (d)     => call('updateProduct',     d),
    deleteProduct:      (id)    => call('deleteProduct',     { id }),
    getSuppliers:       ()      => call('getSuppliers'),
    createSupplier:     (d)     => call('createSupplier',    d),
    updateSupplier:     (d)     => call('updateSupplier',    d),
    deleteSupplier:     (id)    => call('deleteSupplier',    { id }),
    getPurchases:       ()      => call('getPurchases'),
    createPurchase:     (d)     => call('createPurchase',    d),
    deletePurchase:     (id)    => call('deletePurchase',    { id }),
    getShipments:       ()      => call('getShipments'),
    createShipment:     (d)     => call('createShipment',    d),
    updateShipment:     (d)     => call('updateShipment',    d),
    getSales:           ()      => call('getSales'),
    createSale:         (d)     => call('createSale',        d),
    deleteSale:         (id)    => call('deleteSale',        { id }),
    getInventory:       ()      => call('getInventory'),
    adjustStock:        (d)     => call('adjustStock',       d),
    getUsers:           ()      => call('getUsers'),
    createUser:         (d)     => call('createUser',        d),
    updateUser:         (d)     => call('updateUser',        d),
    deactivateUser:     (id)    => call('deactivateUser',    { id }),
    getSalesReport:     (p)     => call('getSalesReport',    p || {}),
    getInventoryReport: (p)     => call('getInventoryReport',p || {}),
    getSupplierReport:  (p)     => call('getSupplierReport', p || {}),
    getAuditLogs:       (p)     => call('getAuditLogs',      p || {}),

    // Offline fallback wrapper
    callWithFallback: async (action, payload, description) => {
      try { return await call(action, payload); }
      catch (err) {
        if (typeof OfflineSync !== 'undefined') OfflineSync.enqueue({ action, payload, description });
        return { success: true, offline: true, queued: true };
      }
    }
  };
})();
