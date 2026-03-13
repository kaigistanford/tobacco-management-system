// =============================================
// TEMS — Google Apps Script Backend
// File: apps-script/Code.gs
//
// SETUP INSTRUCTIONS:
// 1. Open https://script.google.com
// 2. Create a new project named "TEMS Backend"
// 3. Paste this entire file into Code.gs
// 4. Update SPREADSHEET_ID below
// 5. Deploy as Web App (Execute as: Me, Access: Anyone)
// 6. Copy the deployment URL into js/config.js
// =============================================

// ---- CONFIGURATION ----
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // <-- Replace this

// Sheet names
const SHEETS = {
  USERS:     'Users',
  PRODUCTS:  'Products',
  SUPPLIERS: 'Suppliers',
  PURCHASES: 'Purchases',
  PURCHASE_ITEMS: 'PurchaseItems',
  SHIPMENTS: 'Shipments',
  SALES:     'Sales',
  SALE_ITEMS:'SaleItems',
  INVENTORY: 'Inventory',
  AUDIT:     'AuditLog',
  SETTINGS:  'Settings',
  TOKENS:    'Tokens'
};

// ---- HELPERS ----
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheetHeaders(sheet, name);
  }
  return sheet;
}

function initSheetHeaders(sheet, name) {
  const headers = {
    Users:         ['id','username','fullName','email','phone','role','passwordHash','active','createdAt','updatedAt'],
    Products:      ['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'],
    Suppliers:     ['id','name','contactPerson','phone','email','region','address','notes','active','createdAt','updatedAt'],
    Purchases:     ['id','purchaseNo','supplierId','supplierName','purchaseDate','refNo','status','totalAmount','notes','createdBy','createdAt'],
    PurchaseItems: ['id','purchaseId','productId','productName','qty','unitPrice','subtotal'],
    Shipments:     ['id','trackingNo','purchaseId','purchaseRef','origin','destination','shipDate','eta','carrier','status','weight','units','notes','createdAt','updatedAt'],
    Sales:         ['id','receiptNo','saleDate','customer','payment','staffId','staffName','totalAmount','notes','createdAt'],
    SaleItems:     ['id','saleId','productId','productName','qty','unitPrice','subtotal','unit'],
    Inventory:     ['id','productId','productName','adjType','qtyChange','before','after','reason','notes','userId','userName','timestamp'],
    AuditLog:      ['id','action','module','description','userId','userName','timestamp','details'],
    Settings:      ['key','value','updatedAt'],
    Tokens:        ['token','userId','username','role','createdAt','expiresAt']
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.getRange(1, 1, 1, headers[name].length)
      .setBackground('#1c2230').setFontColor('#4ade80').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(r => r.id); // exclude empty rows
}

function appendRow(sheet, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRow(sheet, headers, obj) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(obj.id)) {
      const row = headers.map(h => obj[h] !== undefined ? obj[h] : (data[i][headers.indexOf(h)] || ''));
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return true;
    }
  }
  return false;
}

function deleteRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    password, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, '') + Date.now().toString(36);
}

function now() {
  return new Date().toISOString();
}

function generateSequentialNo(prefix, sheet) {
  const count = sheet.getLastRow();
  return `${prefix}-${String(count).padStart(5, '0')}`;
}

// ---- AUTH ----
function validateToken(token) {
  if (!token) return null;
  const sheet = getSheet(SHEETS.TOKENS);
  const tokens = sheetToObjects(sheet);
  const t = tokens.find(r => r.token === token);
  if (!t) return null;
  if (new Date(t.expiresAt) < new Date()) return null;
  return { userId: t.userId, username: t.username, role: t.role };
}

function getAuthUser(e) {
  const auth = (e.parameter && e.parameter.token) ||
    (e.postData && e.postData.contents
      ? (() => { try { return JSON.parse(e.postData.contents).token; } catch { return null; } })()
      : null);
  // Also check Authorization header if available (may not be in Apps Script)
  return validateToken(auth);
}

function handleLogin(payload) {
  const { username, password } = payload;
  if (!username || !password) return { success: false, message: 'Username and password required.' };

  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);
  const user  = users.find(u => u.username === username && u.active !== false && u.active !== 'FALSE');
  if (!user) return { success: false, message: 'Invalid username or password.' };

  const hash = hashPassword(password);
  if (user.passwordHash !== hash) return { success: false, message: 'Invalid username or password.' };

  // Generate token (24h expiry)
  const token     = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const tokenSheet = getSheet(SHEETS.TOKENS);
  appendRow(tokenSheet, ['token','userId','username','role','createdAt','expiresAt'], {
    token, userId: user.id, username: user.username, role: user.role, createdAt: now(), expiresAt
  });

  // Audit
  logAudit('LOGIN', 'Auth', `User ${username} logged in`, user.id, user.fullName || username);

  return {
    success: true,
    token,
    user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, email: user.email }
  };
}

// ---- DASHBOARD ----
function getDashboard() {
  const products  = sheetToObjects(getSheet(SHEETS.PRODUCTS));
  const suppliers = sheetToObjects(getSheet(SHEETS.SUPPLIERS));
  const purchases = sheetToObjects(getSheet(SHEETS.PURCHASES));
  const sales     = sheetToObjects(getSheet(SHEETS.SALES));
  const auditLogs = sheetToObjects(getSheet(SHEETS.AUDIT)).slice(-20).reverse();

  const totalRevenue = sales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const lowStock     = products.filter(p => (Number(p.stockQty) || 0) < 50 && p.active !== 'FALSE');

  // Monthly sales (last 6 months)
  const monthlySales = buildMonthlySales(sales);
  const purchaseTrend= buildPurchaseTrend(purchases);
  const topProducts  = buildTopProducts();
  const stockDist    = buildStockDistribution(products);

  return {
    totalProducts:  products.filter(p => p.active !== 'FALSE').length,
    totalSuppliers: suppliers.filter(s => s.active !== 'FALSE').length,
    totalPurchases: purchases.length,
    totalSales:     sales.length,
    totalRevenue,
    lowStockCount:  lowStock.length,
    lowStockItems:  lowStock.slice(0, 10),
    recentSales:    sales.slice(-5).reverse().map(s => ({
      receiptNo: s.receiptNo, saleDate: s.saleDate, itemCount: s.itemCount, totalAmount: Number(s.totalAmount) || 0
    })),
    activityFeed: auditLogs.slice(0, 10),
    monthlySales,
    purchaseTrend,
    topProducts,
    stockDistribution: stockDist
  };
}

function buildMonthlySales(sales) {
  const months = {};
  sales.forEach(s => {
    if (!s.saleDate) return;
    const m = s.saleDate.substring(0, 7);
    months[m] = (months[m] || 0) + (Number(s.totalAmount) || 0);
  });
  return Object.entries(months).sort().slice(-6).map(([month, total]) => ({ month, total }));
}

function buildPurchaseTrend(purchases) {
  const months = {};
  purchases.forEach(p => {
    if (!p.purchaseDate) return;
    const m = p.purchaseDate.substring(0, 7);
    months[m] = (months[m] || 0) + (Number(p.totalAmount) || 0);
  });
  return Object.entries(months).sort().slice(-6).map(([month, total]) => ({ month, total }));
}

function buildTopProducts() {
  const items = sheetToObjects(getSheet(SHEETS.SALE_ITEMS));
  const counts = {};
  items.forEach(i => {
    const name = i.productName || i.productId;
    counts[name] = (counts[name] || 0) + (Number(i.qty) || 0);
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity }));
}

function buildStockDistribution(products) {
  const cats = {};
  products.filter(p => p.active !== 'FALSE').forEach(p => {
    const cat = p.category || 'Other';
    cats[cat] = (cats[cat] || 0) + (Number(p.stockQty) || 0);
  });
  return Object.entries(cats).map(([category, quantity]) => ({ category, quantity }));
}

// ---- PRODUCTS CRUD ----
function getProducts() {
  const products = sheetToObjects(getSheet(SHEETS.PRODUCTS));
  return { success: true, products: products.map(p => ({ ...p, stockQty: Number(p.stockQty) || 0, unitPrice: Number(p.unitPrice) || 0 })) };
}

function createProduct(payload) {
  const sheet   = getSheet(SHEETS.PRODUCTS);
  const headers = ['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'];
  const id      = generateId();
  const products= sheetToObjects(sheet);
  const code    = payload.code || `TBC-${String(products.length + 1).padStart(3,'0')}`;
  appendRow(sheet, headers, { ...payload, id, code, active: true, createdAt: now(), updatedAt: now() });
  logAudit('CREATE', 'Products', `Created product: ${payload.name}`, payload.userId, payload.userName);
  return { success: true, id };
}

function updateProduct(payload) {
  const sheet   = getSheet(SHEETS.PRODUCTS);
  const headers = ['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'];
  const ok = updateRow(sheet, headers, { ...payload, updatedAt: now() });
  if (ok) logAudit('UPDATE', 'Products', `Updated product: ${payload.name}`, payload.userId, payload.userName);
  return { success: ok };
}

function deleteProduct(payload) {
  const ok = deleteRow(getSheet(SHEETS.PRODUCTS), payload.id);
  return { success: ok };
}

// ---- SUPPLIERS CRUD ----
function getSuppliers() {
  const suppliers = sheetToObjects(getSheet(SHEETS.SUPPLIERS));
  const purchases = sheetToObjects(getSheet(SHEETS.PURCHASES));
  return {
    success: true,
    suppliers: suppliers.map(s => {
      const purch = purchases.filter(p => p.supplierId === s.id);
      return {
        ...s,
        purchaseCount: purch.length,
        totalPurchases: purch.reduce((t, p) => t + (Number(p.totalAmount) || 0), 0)
      };
    })
  };
}

function createSupplier(payload) {
  const sheet   = getSheet(SHEETS.SUPPLIERS);
  const headers = ['id','name','contactPerson','phone','email','region','address','notes','active','createdAt','updatedAt'];
  const id      = generateId();
  appendRow(sheet, headers, { ...payload, id, active: true, createdAt: now(), updatedAt: now() });
  return { success: true, id };
}

function updateSupplier(payload) {
  const sheet   = getSheet(SHEETS.SUPPLIERS);
  const headers = ['id','name','contactPerson','phone','email','region','address','notes','active','createdAt','updatedAt'];
  return { success: updateRow(sheet, headers, { ...payload, updatedAt: now() }) };
}

function deleteSupplier(payload) {
  return { success: deleteRow(getSheet(SHEETS.SUPPLIERS), payload.id) };
}

// ---- PURCHASES CRUD ----
function getPurchases() {
  const purchases = sheetToObjects(getSheet(SHEETS.PURCHASES));
  const items     = sheetToObjects(getSheet(SHEETS.PURCHASE_ITEMS));
  return {
    success: true,
    purchases: purchases.map(p => ({
      ...p,
      totalAmount: Number(p.totalAmount) || 0,
      items: items.filter(i => i.purchaseId === p.id).map(i => ({
        ...i, qty: Number(i.qty) || 0, unitPrice: Number(i.unitPrice) || 0
      })),
      itemCount: items.filter(i => i.purchaseId === p.id).length
    }))
  };
}

function createPurchase(payload) {
  const pSheet   = getSheet(SHEETS.PURCHASES);
  const piSheet  = getSheet(SHEETS.PURCHASE_ITEMS);
  const prodSheet= getSheet(SHEETS.PRODUCTS);
  const pHeaders = ['id','purchaseNo','supplierId','supplierName','purchaseDate','refNo','status','totalAmount','notes','createdBy','createdAt'];
  const piHeaders= ['id','purchaseId','productId','productName','qty','unitPrice','subtotal'];
  const prodHeaders=['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'];

  const id         = generateId();
  const purchaseNo = generateSequentialNo('PO', pSheet);

  appendRow(pSheet, pHeaders, {
    id, purchaseNo,
    supplierId:   payload.supplierId,
    supplierName: payload.supplierName,
    purchaseDate: payload.purchaseDate,
    refNo:        payload.refNo || '',
    status:       payload.status || 'pending',
    totalAmount:  payload.totalAmount || 0,
    notes:        payload.notes || '',
    createdBy:    payload.staffId || '',
    createdAt:    now()
  });

  // Add purchase items & update stock
  (payload.items || []).forEach(item => {
    if (!item.productId) return;
    const iid = generateId();
    appendRow(piSheet, piHeaders, {
      id: iid, purchaseId: id,
      productId: item.productId,
      productName: item.productName || item.productId,
      qty: item.qty, unitPrice: item.unitPrice,
      subtotal: item.qty * item.unitPrice
    });

    // Update product stock if status is confirmed/received
    if (payload.status === 'confirmed' || payload.status === 'received') {
      updateProductStock(prodSheet, prodHeaders, item.productId, Number(item.qty), 'add');
    }
  });

  logAudit('CREATE', 'Purchases', `Created purchase ${purchaseNo} from ${payload.supplierName}`, payload.staffId, payload.staffName);
  return { success: true, id, purchaseNo };
}

function deletePurchase(payload) {
  const ok = deleteRow(getSheet(SHEETS.PURCHASES), payload.id);
  return { success: ok };
}

// ---- SHIPMENTS CRUD ----
function getShipments() {
  return { success: true, shipments: sheetToObjects(getSheet(SHEETS.SHIPMENTS)) };
}

function createShipment(payload) {
  const sheet   = getSheet(SHEETS.SHIPMENTS);
  const headers = ['id','trackingNo','purchaseId','purchaseRef','origin','destination','shipDate','eta','carrier','status','weight','units','notes','createdAt','updatedAt'];
  const id      = generateId();
  appendRow(sheet, headers, { ...payload, id, createdAt: now(), updatedAt: now() });
  return { success: true, id };
}

function updateShipment(payload) {
  const sheet   = getSheet(SHEETS.SHIPMENTS);
  const headers = ['id','trackingNo','purchaseId','purchaseRef','origin','destination','shipDate','eta','carrier','status','weight','units','notes','createdAt','updatedAt'];
  const ok = updateRow(sheet, headers, { ...payload, updatedAt: now() });
  return { success: ok };
}

// ---- SALES CRUD ----
function getSales() {
  const sales = sheetToObjects(getSheet(SHEETS.SALES));
  const items = sheetToObjects(getSheet(SHEETS.SALE_ITEMS));
  return {
    success: true,
    sales: sales.map(s => ({
      ...s,
      totalAmount: Number(s.totalAmount) || 0,
      items: items.filter(i => i.saleId === s.id).map(i => ({
        ...i, qty: Number(i.qty) || 0, unitPrice: Number(i.unitPrice) || 0
      })),
      itemCount: items.filter(i => i.saleId === s.id).length
    }))
  };
}

function createSale(payload) {
  const sSheet   = getSheet(SHEETS.SALES);
  const siSheet  = getSheet(SHEETS.SALE_ITEMS);
  const prodSheet= getSheet(SHEETS.PRODUCTS);
  const sHeaders = ['id','receiptNo','saleDate','customer','payment','staffId','staffName','totalAmount','notes','createdAt'];
  const siHeaders= ['id','saleId','productId','productName','qty','unitPrice','subtotal','unit'];
  const prodHeaders=['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'];

  // Re-validate stock server-side
  const products = sheetToObjects(prodSheet);
  for (const item of (payload.items || [])) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return { success: false, message: `Product not found: ${item.productId}` };
    if ((Number(prod.stockQty) || 0) < (Number(item.qty) || 0)) {
      return { success: false, message: `Insufficient stock for ${prod.name}. Available: ${prod.stockQty}.` };
    }
  }

  const id        = generateId();
  const receiptNo = generateSequentialNo('REC', sSheet);

  appendRow(sSheet, sHeaders, {
    id, receiptNo,
    saleDate:  payload.saleDate,
    customer:  payload.customer || '',
    payment:   payload.payment || 'cash',
    staffId:   payload.staffId || '',
    staffName: payload.staffName || '',
    totalAmount: payload.totalAmount || 0,
    notes:     payload.notes || '',
    createdAt: now()
  });

  // Add items and deduct stock
  (payload.items || []).forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    appendRow(siSheet, siHeaders, {
      id: generateId(), saleId: id,
      productId:   item.productId,
      productName: item.productName || (prod?.name || item.productId),
      qty:         item.qty,
      unitPrice:   item.unitPrice,
      subtotal:    item.qty * item.unitPrice,
      unit:        item.unit || prod?.unit || 'kg'
    });
    updateProductStock(prodSheet, prodHeaders, item.productId, Number(item.qty), 'remove');
  });

  logAudit('SALE', 'Sales', `Sale ${receiptNo} recorded — ${UI_formatCurrency(payload.totalAmount)}`, payload.staffId, payload.staffName);
  return { success: true, id, receiptNo };
}

function deleteSale(payload) {
  return { success: deleteRow(getSheet(SHEETS.SALES), payload.id) };
}

// ---- INVENTORY ----
function getInventory() {
  return getProducts();
}

function adjustStock(payload) {
  const prodSheet  = getSheet(SHEETS.PRODUCTS);
  const prodHeaders= ['id','code','name','category','unit','unitPrice','stockQty','description','active','createdAt','updatedAt'];
  const invSheet   = getSheet(SHEETS.INVENTORY);
  const invHeaders = ['id','productId','productName','adjType','qtyChange','before','after','reason','notes','userId','userName','timestamp'];

  const products = sheetToObjects(prodSheet);
  const prod     = products.find(p => p.id === payload.productId);
  if (!prod) return { success: false, message: 'Product not found.' };

  const before = Number(prod.stockQty) || 0;
  let after;
  if (payload.adjType === 'add')    after = before + (Number(payload.quantity) || 0);
  else if (payload.adjType === 'remove') after = Math.max(0, before - (Number(payload.quantity) || 0));
  else if (payload.adjType === 'set')    after = Number(payload.quantity) || 0;
  else return { success: false, message: 'Invalid adjustment type.' };

  updateProductStock(prodSheet, prodHeaders, payload.productId, after, 'set_exact');

  // Log adjustment
  appendRow(invSheet, invHeaders, {
    id:          generateId(),
    productId:   payload.productId,
    productName: prod.name,
    adjType:     payload.adjType,
    qtyChange:   Math.abs(after - before),
    before,
    after,
    reason:      payload.reason,
    notes:       payload.notes || '',
    userId:      payload.userId || '',
    userName:    payload.userName || '',
    timestamp:   now()
  });

  logAudit('STOCK_ADJUSTMENT', 'Inventory', `Stock adjusted: ${prod.name} ${payload.adjType} → ${after}`, payload.userId, payload.userName);
  return { success: true, before, after };
}

function updateProductStock(prodSheet, headers, productId, qty, mode) {
  const data = prodSheet.getDataRange().getValues();
  const stockIdx = headers.indexOf('stockQty');
  const updIdx   = headers.indexOf('updatedAt');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(productId)) {
      const current = Number(data[i][stockIdx]) || 0;
      let newQty;
      if (mode === 'add')        newQty = current + qty;
      else if (mode === 'remove') newQty = Math.max(0, current - qty);
      else                        newQty = qty; // set_exact
      prodSheet.getRange(i + 1, stockIdx + 1).setValue(newQty);
      if (updIdx >= 0) prodSheet.getRange(i + 1, updIdx + 1).setValue(now());
      return;
    }
  }
}

// ---- USERS ----
function getUsers() {
  const users = sheetToObjects(getSheet(SHEETS.USERS));
  return { success: true, users: users.map(u => ({ ...u, passwordHash: undefined })) };
}

function createUser(payload) {
  const sheet   = getSheet(SHEETS.USERS);
  const headers = ['id','username','fullName','email','phone','role','passwordHash','active','createdAt','updatedAt'];
  const users   = sheetToObjects(sheet);
  if (users.find(u => u.username === payload.username)) {
    return { success: false, message: 'Username already exists.' };
  }
  const id = generateId();
  appendRow(sheet, headers, {
    ...payload, id,
    passwordHash: hashPassword(payload.password),
    active: true, createdAt: now(), updatedAt: now()
  });
  return { success: true, id };
}

function updateUser(payload) {
  const sheet   = getSheet(SHEETS.USERS);
  const headers = ['id','username','fullName','email','phone','role','passwordHash','active','createdAt','updatedAt'];
  const users   = sheetToObjects(sheet);
  const user    = users.find(u => u.id === payload.id);
  if (!user) return { success: false, message: 'User not found.' };
  const updated = {
    ...user,
    fullName: payload.fullName || user.fullName,
    email:    payload.email    || user.email,
    phone:    payload.phone    || user.phone,
    role:     payload.role     || user.role,
    active:   payload.active !== undefined ? payload.active : user.active,
    passwordHash: payload.password ? hashPassword(payload.password) : user.passwordHash,
    updatedAt: now()
  };
  return { success: updateRow(sheet, headers, updated) };
}

function deactivateUser(payload) {
  return updateUser({ id: payload.id, active: false });
}

// ---- REPORTS ----
function getSalesReport(params) {
  const sales = sheetToObjects(getSheet(SHEETS.SALES));
  const items = sheetToObjects(getSheet(SHEETS.SALE_ITEMS));
  const filtered = filterByDate(sales, 'saleDate', params.from, params.to);
  return {
    success: true,
    sales: filtered.map(s => ({
      ...s,
      totalAmount: Number(s.totalAmount) || 0,
      itemCount: items.filter(i => i.saleId === s.id).length
    }))
  };
}

function getInventoryReport() {
  return getProducts();
}

function getSupplierReport(params) {
  const { suppliers } = getSuppliers();
  const purchases     = sheetToObjects(getSheet(SHEETS.PURCHASES));
  const filtered      = filterByDate(purchases, 'purchaseDate', params.from, params.to);
  return {
    success: true,
    suppliers: suppliers.map(s => {
      const sp = filtered.filter(p => p.supplierId === s.id);
      return { ...s, purchaseCount: sp.length, totalPurchases: sp.reduce((t, p) => t + (Number(p.totalAmount) || 0), 0) };
    })
  };
}

// ---- AUDIT LOG ----
function logAudit(action, module_, description, userId, userName) {
  const sheet   = getSheet(SHEETS.AUDIT);
  const headers = ['id','action','module','description','userId','userName','timestamp','details'];
  appendRow(sheet, headers, {
    id: generateId(), action, module: module_,
    description, userId: userId || '', userName: userName || '', timestamp: now(), details: ''
  });
}

function getAuditLogs(params) {
  let logs = sheetToObjects(getSheet(SHEETS.AUDIT)).reverse();
  if (params.type)  logs = logs.filter(l => l.action === params.type);
  if (params.from)  logs = logs.filter(l => l.timestamp >= params.from);
  if (params.to)    logs = logs.filter(l => l.timestamp <= params.to + 'T23:59:59');
  if (params.limit) logs = logs.slice(0, Number(params.limit));
  return { success: true, logs };
}

// ---- MISC HELPERS ----
function filterByDate(arr, dateField, from, to) {
  return arr.filter(r => {
    if (!r[dateField]) return true;
    if (from && r[dateField] < from) return false;
    if (to   && r[dateField] > to + 'T23:59:59') return false;
    return true;
  });
}

function UI_formatCurrency(amount) {
  return 'TZS ' + (Number(amount) || 0).toLocaleString();
}

function ping() {
  return { success: true, pong: true, time: now() };
}

// ---- MAIN REQUEST HANDLERS ----
function doGet(e) {
  try {
    const action = e.parameter.action;
    const result = routeAction(action, e.parameter, e);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const result = routeAction(action, body, e);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function routeAction(action, payload, e) {
  // Public endpoints
  if (action === 'ping')  return ping();
  if (action === 'login') return handleLogin(payload);

  // All other endpoints require valid token
  // Note: token comes as payload.token (passed by frontend)
  const tokenUser = validateToken(payload.token);
  if (!tokenUser) return { success: false, message: 'Unauthorized. Please log in again.', code: 401 };

  // Enrich payload with caller info
  payload.callerRole     = tokenUser.role;
  payload.callerUserId   = tokenUser.userId;
  payload.callerUsername = tokenUser.username;

  // Role guard helpers
  const isAdmin   = () => tokenUser.role === 'admin';
  const isManager = () => ['admin','manager'].includes(tokenUser.role);

  switch (action) {
    // Dashboard
    case 'getDashboard':      return getDashboard();

    // Products
    case 'getProducts':       return getProducts();
    case 'getProduct':        return { success: true, product: sheetToObjects(getSheet(SHEETS.PRODUCTS)).find(p => p.id === payload.id) };
    case 'createProduct':     return isManager() ? createProduct(payload) : { success: false, message: 'Access denied.' };
    case 'updateProduct':     return isManager() ? updateProduct(payload) : { success: false, message: 'Access denied.' };
    case 'deleteProduct':     return isAdmin()   ? deleteProduct(payload) : { success: false, message: 'Access denied.' };

    // Suppliers
    case 'getSuppliers':      return getSuppliers();
    case 'createSupplier':    return isManager() ? createSupplier(payload) : { success: false, message: 'Access denied.' };
    case 'updateSupplier':    return isManager() ? updateSupplier(payload) : { success: false, message: 'Access denied.' };
    case 'deleteSupplier':    return isAdmin()   ? deleteSupplier(payload) : { success: false, message: 'Access denied.' };

    // Purchases
    case 'getPurchases':      return getPurchases();
    case 'createPurchase':    return isManager() ? createPurchase(payload) : { success: false, message: 'Access denied.' };
    case 'deletePurchase':    return isAdmin()   ? deletePurchase(payload) : { success: false, message: 'Access denied.' };

    // Shipments
    case 'getShipments':      return getShipments();
    case 'createShipment':    return isManager() ? createShipment(payload) : { success: false, message: 'Access denied.' };
    case 'updateShipment':    return isManager() ? updateShipment(payload) : { success: false, message: 'Access denied.' };

    // Sales
    case 'getSales':          return getSales();
    case 'createSale':        return createSale(payload);
    case 'deleteSale':        return isAdmin() ? deleteSale(payload) : { success: false, message: 'Access denied.' };

    // Inventory
    case 'getInventory':      return getInventory();
    case 'adjustStock':       return isManager() ? adjustStock(payload) : { success: false, message: 'Access denied.' };

    // Users (admin only)
    case 'getUsers':          return isAdmin() ? getUsers()          : { success: false, message: 'Access denied.' };
    case 'createUser':        return isAdmin() ? createUser(payload) : { success: false, message: 'Access denied.' };
    case 'updateUser':        return isAdmin() ? updateUser(payload) : { success: false, message: 'Access denied.' };
    case 'deactivateUser':    return isAdmin() ? deactivateUser(payload) : { success: false, message: 'Access denied.' };

    // Reports
    case 'getSalesReport':    return isManager() ? getSalesReport(payload)    : { success: false, message: 'Access denied.' };
    case 'getInventoryReport':return isManager() ? getInventoryReport(payload): { success: false, message: 'Access denied.' };
    case 'getSupplierReport': return isManager() ? getSupplierReport(payload) : { success: false, message: 'Access denied.' };

    // Audit
    case 'getAuditLogs':      return isManager() ? getAuditLogs(payload) : { success: false, message: 'Access denied.' };

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

// ---- SETUP FUNCTION ----
// Run this once manually from the Apps Script editor to create default admin user and sheets
function setupTEMS() {
  // Init all sheets
  Object.values(SHEETS).forEach(name => getSheet(name));

  // Create default admin user if none exist
  const users = sheetToObjects(getSheet(SHEETS.USERS));
  if (users.length === 0) {
    createUser({
      username: 'admin',
      fullName: 'System Administrator',
      email:    'admin@tems.co.tz',
      phone:    '+255 000 000 000',
      role:     'admin',
      password: 'Admin@1234'
    });
    Logger.log('✅ Default admin created — username: admin, password: Admin@1234');
    Logger.log('⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
  }

  Logger.log('✅ TEMS setup complete. All sheets initialized.');
  Logger.log('✅ Deploy this script as a Web App (Execute as: Me, Access: Anyone)');
}
