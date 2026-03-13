// =============================================
// TEMS — API Module (CORS-safe version)
// Uses URL-encoded form POST to avoid CORS
// preflight issues with Google Apps Script
// =============================================

const API = (() => {
  const BASE = () => {
    // Check if user saved a custom URL in settings
    return localStorage.getItem('tems_api_url') || TEMS_CONFIG.APPS_SCRIPT_URL;
  };

  const getToken = () => localStorage.getItem(TEMS_CONFIG.TOKEN_KEY);

  // POST using form-encoded body (avoids CORS preflight with Apps Script)
  const post = async (action, payload = {}) => {
    const token = getToken();
    const data  = { action, ...payload };
    if (token) data.token = token;

    const res = await fetch(BASE(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ payload: JSON.stringify(data) })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  // GET with query string parameters
  const get = async (action, params = {}) => {
    const token = getToken();
    const allParams = { action, ...params };
    if (token) allParams.token = token;
    const qs  = new URLSearchParams(allParams).toString();
    const url = `${BASE()}?${qs}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  // ---- Auth ----
  const login = (username, password) => post('login', { username, password });

  // ---- Dashboard ----
  const getDashboard = () => get('getDashboard');

  // ---- Products ----
  const getProducts   = (params) => get('getProducts', params || {});
  const getProduct    = (id)     => get('getProduct', { id });
  const createProduct = (data)   => post('createProduct', data);
  const updateProduct = (data)   => post('updateProduct', data);
  const deleteProduct = (id)     => post('deleteProduct', { id });

  // ---- Suppliers ----
  const getSuppliers   = (params) => get('getSuppliers', params || {});
  const getSupplier    = (id)     => get('getSupplier', { id });
  const createSupplier = (data)   => post('createSupplier', data);
  const updateSupplier = (data)   => post('updateSupplier', data);
  const deleteSupplier = (id)     => post('deleteSupplier', { id });

  // ---- Purchases ----
  const getPurchases   = (params) => get('getPurchases', params || {});
  const getPurchase    = (id)     => get('getPurchase', { id });
  const createPurchase = (data)   => post('createPurchase', data);
  const updatePurchase = (data)   => post('updatePurchase', data);
  const deletePurchase = (id)     => post('deletePurchase', { id });

  // ---- Shipments ----
  const getShipments   = (params) => get('getShipments', params || {});
  const getShipment    = (id)     => get('getShipment', { id });
  const createShipment = (data)   => post('createShipment', data);
  const updateShipment = (data)   => post('updateShipment', data);

  // ---- Sales ----
  const getSales    = (params) => get('getSales', params || {});
  const getSale     = (id)     => get('getSale', { id });
  const createSale  = (data)   => post('createSale', data);
  const deleteSale  = (id)     => post('deleteSale', { id });

  // ---- Inventory ----
  const getInventory = (params) => get('getInventory', params || {});
  const adjustStock  = (data)   => post('adjustStock', data);

  // ---- Users ----
  const getUsers       = ()     => get('getUsers');
  const createUser     = (data) => post('createUser', data);
  const updateUser     = (data) => post('updateUser', data);
  const deactivateUser = (id)   => post('deactivateUser', { id });

  // ---- Reports ----
  const getSalesReport     = (params) => get('getSalesReport', params);
  const getInventoryReport = (params) => get('getInventoryReport', params);
  const getSupplierReport  = (params) => get('getSupplierReport', params);

  // ---- Audit Logs ----
  const getAuditLogs = (params) => get('getAuditLogs', params);

  // ---- Helper: call with offline queue fallback ----
  const callWithFallback = async (action, payload, description) => {
    try {
      return await post(action, payload);
    } catch (err) {
      OfflineSync.enqueue({ action, payload, description });
      return { success: true, offline: true, queued: true };
    }
  };

  return {
    get, post,
    login,
    getDashboard,
    getProducts, getProduct, createProduct, updateProduct, deleteProduct,
    getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
    getPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase,
    getShipments, getShipment, createShipment, updateShipment,
    getSales, getSale, createSale, deleteSale,
    getInventory, adjustStock,
    getUsers, createUser, updateUser, deactivateUser,
    getSalesReport, getInventoryReport, getSupplierReport,
    getAuditLogs,
    callWithFallback
  };
})();
