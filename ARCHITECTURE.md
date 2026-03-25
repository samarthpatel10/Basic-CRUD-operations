# Architecture — Nexus CRUD App

## Overview

Nexus uses a strict separation-of-concerns pattern divided into four JavaScript modules, each with a single responsibility.

---

## Layer Diagram

```
┌──────────────────────────────────────────────────────┐
│                    index.html                        │
│          (markup, links CSS + JS files)              │
└──────────────────────────┬───────────────────────────┘
                           │  loads
           ┌───────────────▼───────────────┐
           │         app.js (Controller)   │
           │  - App state                  │
           │  - Event listeners            │
           │  - Calls auth/api/ui          │
           └──────┬─────────┬──────────────┘
                  │         │
        ┌─────────▼──┐  ┌───▼────────┐
        │  auth.js   │  │  api.js    │
        │  register  │  │  create    │
        │  login     │  │  read      │
        │  logout    │  │  update    │
        │  me()      │  │  delete    │
        └─────────┬──┘  └───┬────────┘
                  │         │
           ┌──────▼─────────▼──────────────┐
           │           db.js               │
           │   localStorage read/write     │
           └───────────────────────────────┘

           ┌───────────────────────────────┐
           │           ui.js               │
           │   DOM rendering               │
           │   Template functions          │
           │   Modal open/close            │
           │   Toast, error display        │
           └───────────────────────────────┘
```

---

## Module Responsibilities

### `db.js` — Database Layer
- Wraps `localStorage` with safe `JSON.parse/stringify`
- Exposes typed getters/setters: `getUsers`, `getItems(uid)`, `getSession`, etc.
- **Swap point**: Replace with `fetch('/api/...')` calls to use a real backend

### `auth.js` — Authentication
- `register({ name, email, password })` — validates, hashes password, saves user
- `login({ email, password })` — verifies credentials, saves session
- `logout()` — clears session
- `me()` — returns current session or `null`
- Returns `{ user }` or `{ error }` consistently

### `api.js` — CRUD Operations
- `list(uid)` — returns all items for user
- `getById(uid, id)` — returns single item
- `create(uid, data)` — validates + saves new item
- `update(uid, id, data)` — validates + updates existing item
- `delete(uid, id)` — removes item
- `stats(uid)` — returns count per category
- Returns `{ item }`, `{ ok }`, or `{ error }` consistently

### `ui.js` — Rendering
- `renderItems(items, { onEdit, onDelete })` — builds card grid
- `renderStats(uid)` — updates stat numbers
- `showToast(msg, type)` — shows notification
- `openItemModal({ item })` / `closeItemModal()` — modal management
- `escHtml(str)` — XSS-safe string escaping
- All DOM refs are accessed by ID — no global leakage

### `app.js` — Controller
- Bootstraps on page load
- Restores session if present
- Defines all event listeners
- Owns app state: `currentUser`, `allItems`, `searchQuery`, `catFilter`, `editingId`, `deleteTarget`
- Calls `refreshView()` after any data change

---

## Data Flow — Create a Record

```
User clicks "New Record"
        │
        ▼
app.js → openCreateModal()
        │
        ▼
ui.js  → openItemModal({ item: null })
        │  (clears form, shows modal)
        ▼
User fills form → clicks "Create Record"
        │
        ▼
app.js → saveItem()
        │
        ├─ validates title (not empty)
        │
        ▼
api.js → create(uid, { title, category, description })
        │
        ├─ validates inputs
        ├─ generates unique ID
        ├─ adds timestamps
        │
        ▼
db.js  → saveItems(uid, [...items, newItem])
        │
        ▼
app.js → refreshView()
        │
        ├─ loads from DB
        ├─ applies search + filter
        │
        ▼
ui.js  → renderItems(filtered)
         renderStats(uid)
         showToast("Record created!")
```

---

## Extending to a Real Backend

To replace `localStorage` with a real API server:

1. **Keep `auth.js` and `api.js` interfaces identical**
2. Replace `db.js` calls with `fetch()`:

```javascript
// Before (db.js)
function getItems(uid) {
  return JSON.parse(localStorage.getItem(`nx_items_${uid}`) || '[]');
}

// After (real backend)
async function getItems(uid) {
  const res = await fetch(`/api/items`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}
```

3. Add JWT token handling in `auth.js`
4. Make `api.js` methods `async` and `await` the DB calls
5. Update `app.js` to `await` API calls and handle loading states

---

## localStorage Schema

```
nx_users           → JSON array of User objects
nx_session         → JSON session object (or null)
nx_items_{userId}  → JSON array of Item objects per user
```
