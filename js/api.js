// TEMS — API Module (CORS-safe)
const API = (() => {
  const BASE = () => localStorage.getItem('tems_api_url') || TEMS_CONFIG.APPS_SCRIPT_URL;
  const getToken = () => localStorage.getItem(TEMS_CONFIG.TOKEN_KEY);

  // All write calls use form-encoded POST — required for Google Apps Script CORS
  const post = async (action, payload = {}) => {
    const data = { action, ...payload };
    const token = getToken();
    if (token) data.token = token;
    const res = await fetch(BASE(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ payload: JSON.stringify(data) })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  };

  const get = async (action, params = {}) => {
    const token = getToken();
    const allParams = { action, ...params };
    if (token) allParams.token = token;
    const res = await fetch(BASE() + '?' + new URLSearchParams(allParams).toString());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  };

  const callWithFallback = async (action, payload, description) => {
    try { return await post(action, payload); }
    catch (err) {
      if (typeof OfflineSync !== 'undefined') OfflineSync.enqueue({ action, payload, description });
      return { success: true, offline: true, queued: true };
    }
  };

  return {
    get, post, callWithFallback,
    login:             (u, p)    => post('login', { username: u, password: p }),
    getDashboard:      ()        => get('getDashboard'),
    getProducts:       (p)       => get('getProducts', p || {}),
    createProduct:     (d)       => post('createProduct', d),
    updateProduct:     (d)       => post('updateProduct', d),
    deleteProduct:     (id)      => post('deleteProduct', { id }),
    getSuppliers:      (p)       => get('getSuppliers', p || {}),
    createSupplier:    (d)       => post('createSupplier', d),
    updateSupplier:    (d)       => post('updateSupplier', d),
    deleteSupplier:    (id)      => post('deleteSupplier', { id }),
    getPurchases:      (p)       => get('getPurchases', p || {}),
    createPurchase:    (d)       => post('createPurchase', d),
    deletePurchase:    (id)      => post('deletePurchase', { id }),
    getShipments:      (p)       => get('getShipments', p || {}),
    createShipment:    (d)       => post('createShipment', d),
    updateShipment:    (d)       => post('updateShipment', d),
    getSales:          (p)       => get('getSales', p || {}),
    createSale:        (d)       => post('createSale', d),
    deleteSale:        (id)      => post('deleteSale', { id }),
    getInventory:      (p)       => get('getInventory', p || {}),
    adjustStock:       (d)       => post('adjustStock', d),
    getUsers:          ()        => get('getUsers'),
    createUser:        (d)       => post('createUser', d),
    updateUser:        (d)       => post('updateUser', d),
    deactivateUser:    (id)      => post('deactivateUser', { id }),
    getSalesReport:    (p)       => get('getSalesReport', p || {}),
    getInventoryReport:(p)       => get('getInventoryReport', p || {}),
    getSupplierReport: (p)       => get('getSupplierReport', p || {}),
    getAuditLogs:      (p)       => get('getAuditLogs', p || {})
  };
})();
