# 🌿 TEMS — Tobacco Enterprise Management System

A production-grade **Progressive Web App (PWA)** for managing large-scale tobacco enterprise operations. Works on desktop, Android, and iOS. Installable from the browser. Offline-capable.

---

## Why This Architecture Works on GitHub Pages

GitHub Pages hosts only **static files** — there is no Node.js, no Express, no MySQL. TEMS solves this by splitting the architecture into two layers:

| Layer | Technology | Hosts |
|-------|-----------|-------|
| Frontend | HTML + CSS + Vanilla JS (PWA) | GitHub Pages |
| Backend/Database | Google Apps Script + Google Sheets | Google Cloud |

**Google Apps Script** is deployed as a **Web App URL** that accepts HTTP GET and POST requests — essentially a REST API endpoint running on Google's infrastructure, completely free and accessible from any static frontend. All data (products, suppliers, sales, purchases, users) is stored in **Google Sheets tabs** as structured rows.

**IndexedDB** (via the OfflineSync module) caches data locally and queues writes when the user is offline. When internet returns, the queue automatically syncs to the Apps Script backend.

---

## Features

- ✅ Dashboard with charts (Chart.js): monthly sales, stock distribution, purchase trends, top products
- ✅ Products management (CRUD, categories, stock levels)
- ✅ Suppliers directory with purchase history
- ✅ Purchases with multi-item support, auto inventory update
- ✅ Shipments tracking (pending → in transit → delivered)
- ✅ Sales recording with printable receipts and stock deduction
- ✅ Inventory management with manual stock adjustments and history
- ✅ User management with role-based access control (Admin / Manager / Staff)
- ✅ Reports: Sales, Inventory, Suppliers — with CSV and Excel export, printable
- ✅ Audit log of all system activity
- ✅ Offline-first: full UI loads offline, writes queue and sync on reconnection
- ✅ PWA installable: "Add to Home Screen" on Android/desktop, standalone app mode
- ✅ Responsive: works on mobile, tablet, and desktop
- ✅ Dark professional dashboard UI

---

## Project Structure

```
tobacco-management-system/
├── index.html              # Entry redirect
├── login.html              # Login page
├── dashboard.html          # Main dashboard
├── products.html           # Product catalogue
├── suppliers.html          # Supplier directory
├── purchases.html          # Purchase records
├── shipments.html          # Shipment tracking
├── sales.html              # Sales recording
├── inventory.html          # Stock management
├── users.html              # User management (Admin only)
├── reports.html            # Reports & exports
├── settings.html           # App configuration
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── css/
│   └── main.css            # Complete stylesheet
├── js/
│   ├── config.js           # App configuration & constants
│   ├── app.js              # Shared HTML templates
│   ├── api.js              # All API calls to Apps Script
│   ├── auth.js             # Login, session, role checks
│   ├── ui.js               # UI helpers, toasts, modals, pagination
│   └── offline-sync.js     # IndexedDB queue & sync logic
├── assets/
│   └── icons/              # PWA icons (all sizes)
└── apps-script/
    ├── Code.gs             # Full Apps Script backend
    └── appsscript.json     # Apps Script config
```

---

## Deployment Guide

### Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**.
2. Name it `TEMS Database`.
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit
   ```

---

### Step 2 — Set Up Google Apps Script

1. Go to [script.google.com](https://script.google.com) and click **New Project**.
2. Name it `TEMS Backend`.
3. Delete all existing code and **paste the entire contents of `apps-script/Code.gs`**.
4. Update line 13:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
   ```
   Replace with the ID you copied in Step 1.
5. Click **Save** (Ctrl+S).

---

### Step 3 — Run the Setup Function

1. In the Apps Script editor, select the function `setupTEMS` from the dropdown.
2. Click **▶ Run**.
3. You will be prompted to authorise the script — click **Review Permissions → Allow**.
4. Check the **Execution Log** — you should see:
   ```
   ✅ TEMS setup complete. All sheets initialized.
   ✅ Default admin created — username: admin, password: Admin@1234
   ⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN
   ```

---

### Step 4 — Deploy the Apps Script as a Web App

1. In the Apps Script editor, click **Deploy → New Deployment**.
2. Click the gear icon ⚙️ next to **Type** and select **Web App**.
3. Set:
   - **Description**: TEMS Backend v1.0
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**.
5. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

---

### Step 5 — Connect the Frontend to Apps Script

Open `js/config.js` and replace line:
```javascript
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
```
with your actual Web App URL from Step 4.

Alternatively, after deployment you can set it in the app via **Settings → Connection → Apps Script Web App URL**.

---

### Step 6 — Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `tobacco-management-system`).
2. Push all files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial TEMS deployment"
   git remote add origin https://github.com/YOUR_USERNAME/tobacco-management-system.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**.
4. Under **Source**, select `main` branch and `/ (root)` folder.
5. Click **Save**. GitHub will give you a URL like:
   ```
   https://YOUR_USERNAME.github.io/tobacco-management-system/
   ```

---

### Step 7 — Test the App

**Login:**
- Open your GitHub Pages URL
- Login with: `admin` / `Admin@1234`
- Change the password immediately in **Users → Edit User**

**Test PWA installability:**
- On **Chrome desktop**: Look for the install icon (⊕) in the address bar or click the install banner
- On **Android Chrome**: Tap the three-dot menu → "Add to Home Screen"
- The app should appear in your app drawer and open in standalone mode

**Test offline behavior:**
1. Load the dashboard while online — data caches locally
2. Turn off your internet connection
3. Reload — the app should still load and show cached data
4. Try making a sale — it will be queued
5. Turn internet back on — the queue syncs automatically and you will see a toast notification

**Test sync status:**
- The header shows a green dot (online), amber dot (offline), or blue dot (syncing)
- Queued changes count is visible in **Settings → Connection**

**Test reports:**
- Go to Reports, select a date range, click "Generate Reports"
- Try "Export CSV" and "Export Excel"
- Try "Print" — a print-optimised view opens in a new tab

---

## Default Login Credentials

| Username | Password    | Role    |
|----------|-------------|---------|
| admin    | Admin@1234  | Admin   |

⚠️ **Change the default password immediately after first login.**

---

## Creating Additional Users

1. Log in as Admin
2. Go to **Users → Add User**
3. Set username, full name, role, and password
4. The new user can log in immediately

---

## Data Architecture Summary

| Data | Storage Location |
|------|-----------------|
| Users, Products, Suppliers | Google Sheets tabs |
| Purchases, Purchase Items | Google Sheets tabs |
| Shipments, Sales, Sale Items | Google Sheets tabs |
| Inventory Adjustments, Audit Log | Google Sheets tabs |
| Auth tokens | Google Sheets (Tokens tab) |
| Offline write queue | IndexedDB (browser) |
| Read cache (for offline) | IndexedDB (browser) |
| Login credentials cache | localStorage (browser) |
| App settings | localStorage (browser) |

---

## Updating the Apps Script

After any code changes in `Code.gs`:
1. Click **Deploy → Manage Deployments**
2. Click ✏️ Edit on your deployment
3. Under **Version**, select **New Version**
4. Click **Deploy**

The frontend URL does **not** change when you create a new version.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login fails with "Connection failed" | Check that the Apps Script URL is correct in `js/config.js` or Settings |
| "Unauthorized" errors | Session expired — log out and back in |
| Charts not showing | Check internet for Chart.js CDN; it caches after first load |
| Install banner not showing | Must be served over HTTPS (GitHub Pages uses HTTPS automatically) |
| Sales not deducting stock | Ensure Apps Script is deployed with correct permissions |
| Excel export fails | Check browser console; SheetJS CDN must have loaded |

---

## License

Free to use and modify for non-commercial purposes within your tobacco enterprise operations.
