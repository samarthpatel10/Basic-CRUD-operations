/**
 * db.js — Database Layer
 * ─────────────────────────────────────────────
 * Simulates a real database using localStorage.
 * In a production app, replace these calls with
 * fetch() requests to your backend REST API.
 *
 * Storage keys:
 *   nx_users          → array of user objects
 *   nx_session        → current logged-in user
 *   nx_items_{userId} → per-user records array
 */

'use strict';

const DB = (() => {

  const KEYS = {
    USERS:   'nx_users',
    SESSION: 'nx_session',
    items:   (uid) => `nx_items_${uid}`,
  };

  /* ── Helpers ── */
  function read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error(`[DB] read error for "${key}":`, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[DB] write error for "${key}":`, e);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── Users ── */
  function getUsers()    { return read(KEYS.USERS, []); }
  function saveUsers(u)  { return write(KEYS.USERS, u); }

  /* ── Session ── */
  function getSession()     { return read(KEYS.SESSION, null); }
  function saveSession(s)   { return write(KEYS.SESSION, s); }
  function clearSession()   { return remove(KEYS.SESSION); }

  /* ── Items ── */
  function getItems(uid)         { return read(KEYS.items(uid), []); }
  function saveItems(uid, items) { return write(KEYS.items(uid), items); }

  /* ── Dev helper: wipe everything ── */
  function clearAll() {
    localStorage.clear();
    console.info('[DB] All data cleared.');
  }

  return {
    getUsers, saveUsers,
    getSession, saveSession, clearSession,
    getItems, saveItems,
    clearAll,
  };

})();
