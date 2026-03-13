const TEMS_CONFIG = {
  APP_NAME:        'TEMS',
  APP_FULL_NAME:   'Tobacco Enterprise Management System',
  VERSION:         '1.0.0',

  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwPZEKiLaWOvykKxYJl6FTd-Yp6PDKtIDIlYh2tBsI9d0JS-7XTQsgR62y-aqqQRbOi1A/exec',

  TOKEN_KEY:   'tems_auth_token',
  USER_KEY:    'tems_user_data',

  ROWS_PER_PAGE:       15,
  LOW_STOCK_THRESHOLD: 50,
  CURRENCY:            'TZS',
  SYNC_INTERVAL:       30000,

  ROLES: { ADMIN: 'admin', MANAGER: 'manager', STAFF: 'staff' },

  PERMISSIONS: {
    admin:   ['dashboard','products','suppliers','purchases','shipments','sales','inventory','users','reports','settings'],
    manager: ['dashboard','products','suppliers','purchases','shipments','inventory','reports'],
    staff:   ['dashboard','sales','inventory']
  },

  NAV_ITEMS: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
    { id: 'products',  label: 'Products',  icon: '🌿', href: 'products.html' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭', href: 'suppliers.html' },
    { id: 'purchases', label: 'Purchases', icon: '🛒', href: 'purchases.html' },
    { id: 'shipments', label: 'Shipments', icon: '🚚', href: 'shipments.html' },
    { id: 'sales',     label: 'Sales',     icon: '💰', href: 'sales.html' },
    { id: 'inventory', label: 'Inventory', icon: '📦', href: 'inventory.html' },
    { id: 'users',     label: 'Users',     icon: '👥', href: 'users.html' },
    { id: 'reports',   label: 'Reports',   icon: '📋', href: 'reports.html' },
    { id: 'settings',  label: 'Settings',  icon: '⚙️',  href: 'settings.html' }
  ]
};
