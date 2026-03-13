// =============================================
// TEMS — Offline Sync Module
// IndexedDB queue + online sync + cache
// =============================================

const OfflineSync = (() => {
  const DB_NAME    = 'tems_offline_db';
  const DB_VERSION = 1;
  const STORE_Q    = 'sync_queue';
  const STORE_CACHE= 'data_cache';
  const STORE_CRED = 'credentials';

  let db = null;
  let syncTimer = null;
  let _isOnline = navigator.onLine;

  // ---- Open IndexedDB ----
  const openDB = () => new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const _db = e.target.result;
      if (!_db.objectStoreNames.contains(STORE_Q)) {
        _db.createObjectStore(STORE_Q, { keyPath: 'id', autoIncrement: true });
      }
      if (!_db.objectStoreNames.contains(STORE_CACHE)) {
        _db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!_db.objectStoreNames.contains(STORE_CRED)) {
        _db.createObjectStore(STORE_CRED, { keyPath: 'username' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = (e) => reject(e.target.error);
  });

  // ---- Queue a failed request ----
  const enqueue = async (item) => {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE_Q, 'readwrite');
      tx.objectStore(STORE_Q).add({
        ...item,
        timestamp: Date.now(),
        retries: 0
      });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  };

  // ---- Get all queued items ----
  const getQueue = async () => {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE_Q, 'readonly');
      const req = tx.objectStore(STORE_Q).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = reject;
    });
  };

  // ---- Remove a queued item by id ----
  const dequeue = async (id) => {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE_Q, 'readwrite');
      tx.objectStore(STORE_Q).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  };

  // ---- Cache data under a key ----
  const cacheSet = async (key, value) => {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE_CACHE, 'readwrite');
      tx.objectStore(STORE_CACHE).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  };

  // ---- Get cached data ----
  const cacheGet = async (key) => {
    const _db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror   = reject;
    });
  };

  // ---- Credentials cache (for offline login) ----
  const getCachedCredentials = () => {
    try {
      const raw = localStorage.getItem('tems_cred_cache');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  // ---- Sync all queued items to server ----
  const syncNow = async () => {
    if (!navigator.onLine) return;
    const queue = await getQueue();
    if (queue.length === 0) {
      UI.setSyncStatus('online');
      return;
    }
    UI.setSyncStatus('syncing');
    let synced = 0;
    for (const item of queue) {
      try {
        const res = await API.post(item.action, item.payload);
        if (res.success !== false) {
          await dequeue(item.id);
          synced++;
        }
      } catch {
        // Will retry next cycle
      }
    }
    if (synced > 0) {
      UI.showToast('success', 'Sync Complete', `${synced} pending change(s) synced.`);
    }
    const remaining = await getQueue();
    UI.setSyncStatus(remaining.length > 0 ? 'pending' : 'online');
  };

  // ---- Get queue count ----
  const getQueueCount = async () => {
    const q = await getQueue();
    return q.length;
  };

  // ---- Online / offline listeners ----
  const init = () => {
    openDB().catch(console.warn);

    window.addEventListener('online', async () => {
      _isOnline = true;
      UI.hideOfflineBanner();
      UI.setSyncStatus('syncing');
      await syncNow();
      // Refresh page data
      if (typeof loadPageData === 'function') loadPageData();
    });

    window.addEventListener('offline', () => {
      _isOnline = false;
      UI.showOfflineBanner();
      UI.setSyncStatus('offline');
    });

    if (!navigator.onLine) {
      UI.showOfflineBanner();
      UI.setSyncStatus('offline');
    }

    // Periodic sync
    syncTimer = setInterval(syncNow, TEMS_CONFIG.SYNC_INTERVAL);
  };

  const isOnline = () => navigator.onLine;

  return {
    openDB, enqueue, getQueue, dequeue,
    cacheSet, cacheGet, getCachedCredentials,
    syncNow, getQueueCount, init, isOnline
  };
})();
