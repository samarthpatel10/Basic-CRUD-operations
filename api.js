/**
 * api.js — Items CRUD API
 * ─────────────────────────────────────────────
 * Full Create / Read / Update / Delete operations
 * for user records.
 *
 * All methods are scoped to the authenticated
 * user via their userId (uid).
 *
 * Depends on: db.js
 */

'use strict';

const ItemsAPI = (() => {

  const CATEGORIES = ['Work', 'Personal', 'Idea', 'Urgent', 'Archive'];

  /* ── Validation ── */
  function _validate({ title, category }) {
    if (!title || title.trim().length === 0) {
      return { error: 'Title is required.' };
    }
    if (title.trim().length > 120) {
      return { error: 'Title must be 120 characters or fewer.' };
    }
    if (category && !CATEGORIES.includes(category)) {
      return { error: 'Invalid category.' };
    }
    return null;
  }

  /* ── READ: List all items ── */
  function list(uid) {
    if (!uid) return [];
    return DB.getItems(uid);
  }

  /* ── READ: Get single item ── */
  function getById(uid, id) {
    return DB.getItems(uid).find(i => i.id === id) || null;
  }

  /* ── CREATE ── */
  function create(uid, { title, description = '', category = 'Work' }) {
    const err = _validate({ title, category });
    if (err) return err;

    const items = DB.getItems(uid);
    const item  = {
      id:          Date.now().toString(36) + Math.random().toString(36).slice(2),
      title:       title.trim(),
      description: description.trim(),
      category,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };

    DB.saveItems(uid, [item, ...items]);
    console.info(`[API] Created item: "${item.title}" (${item.id})`);
    return { item };
  }

  /* ── UPDATE ── */
  function update(uid, id, { title, description, category }) {
    const err = _validate({ title, category });
    if (err) return err;

    let updated = null;
    const items = DB.getItems(uid).map(i => {
      if (i.id !== id) return i;
      updated = {
        ...i,
        title:       title.trim(),
        description: description.trim(),
        category,
        updatedAt:   new Date().toISOString(),
      };
      return updated;
    });

    if (!updated) return { error: 'Item not found.' };

    DB.saveItems(uid, items);
    console.info(`[API] Updated item: "${updated.title}" (${id})`);
    return { item: updated };
  }

  /* ── DELETE ── */
  function remove(uid, id) {
    const items   = DB.getItems(uid);
    const exists  = items.some(i => i.id === id);
    if (!exists) return { error: 'Item not found.' };

    DB.saveItems(uid, items.filter(i => i.id !== id));
    console.info(`[API] Deleted item: (${id})`);
    return { ok: true };
  }

  /* ── STATS: count per category ── */
  function stats(uid) {
    const items  = DB.getItems(uid);
    const counts = { total: items.length };
    CATEGORIES.forEach(cat => {
      counts[cat.toLowerCase()] = items.filter(i => i.category === cat).length;
    });
    return counts;
  }

  return { list, getById, create, update, delete: remove, stats, CATEGORIES };

})();
