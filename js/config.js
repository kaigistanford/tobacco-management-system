// =============================================
// TEMS — Configuration
// Update APPS_SCRIPT_URL after deploying your
// Google Apps Script web app.
// =============================================

const TEMS_CONFIG = {
  APP_NAME:        'TEMS',
  APP_FULL_NAME:   'Tobacco Enterprise Management System',
  VERSION:         '1.0.0',

  // ---- REPLACE THIS WITH YOUR DEPLOYED APPS SCRIPT URL ----
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwPZEKiLaWOvykKxYJl6FTd-Yp6PDKtIDIlYh2tBsI9d0JS-7XTQsgR62y-aqqQRbOi1A/exec',

  // Session token key in localStorage
  TOKEN_KEY:       'tems_auth_token',
  USER_KEY:        'tems_user_data',

  // Offline queue key in IndexedDB / localStorage
  QUEUE_KEY:       'tems_offline_queue',
  CACHE_KEY:       'tems_data_cache',

  // Pagination
  ROWS_PER_PAGE:   15,

  // Low stock threshold (units)
  LOW_STOCK_THRESHOLD: 50,

  // Currency
  CURRENCY:        'TZS',
  CURRENCY_SYMBOL: 'TZS',

  // Date format
  DATE_FORMAT:     'en-TZ',

  // Auto-sync interval when online (ms)
  SYNC_INTERVAL:   30000,

  // Roles
  ROLES: {
    ADMIN:   'admin',
    MANAGER: 'manager',
    STAFF:   'staff'
  },

  // Role permissions map
  PERMISSIONS: {
    admin: [
      'dashboard','products','suppliers','purchases','shipments',
      'sales','inventory','users','reports','settings'
    ],
    manager: [
      'dashboard','products','suppliers','purchases','shipments',
      'inventory','reports'
    ],
    staff: [
      'dashboard','sales','inventory'
    ]
  },

  // Navigation items
  NAV_ITEMS: [
    { id: 'dashboard',  label: 'Dashboard',  icon: '📊', href: 'dashboard.html' },
    { id: 'products',   label: 'Products',   icon: '🌿', href: 'products.html' },
    { id: 'suppliers',  label: 'Suppliers',  icon: '🏭', href: 'suppliers.html' },
    { id: 'purchases',  label: 'Purchases',  icon: '🛒', href: 'purchases.html' },
    { id: 'shipments',  label: 'Shipments',  icon: '🚚', href: 'shipments.html' },
    { id: 'sales',      label: 'Sales',      icon: '💰', href: 'sales.html' },
    { id: 'inventory',  label: 'Inventory',  icon: '📦', href: 'inventory.html' },
    { id: 'users',      label: 'Users',      icon: '👥', href: 'users.html',    adminOnly: true },
    { id: 'reports',    label: 'Reports',    icon: '📋', href: 'reports.html' },
    { id: 'settings',   label: 'Settings',   icon: '⚙️',  href: 'settings.html', adminOnly: true },
  ]
};

// Freeze config to prevent accidental mutation
Object.freeze(TEMS_CONFIG);
Object.freeze(TEMS_CONFIG.ROLES);
Object.freeze(TEMS_CONFIG.PERMISSIONS);
