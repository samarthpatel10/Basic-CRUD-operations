/**
 * ui.js — UI Rendering Layer
 * ─────────────────────────────────────────────
 * All DOM manipulation, template rendering,
 * and UI helper functions.
 *
 * Depends on: db.js, api.js
 */

'use strict';

const UI = (() => {

  /* ── Category colors map ── */
  const CAT_COLORS = {
    Work:     '#4f8ef7',
    Personal: '#a78bfa',
    Idea:     '#34d399',
    Urgent:   '#f87171',
    Archive:  '#94a3b8',
  };

  /* ── Escape HTML to prevent XSS ── */
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  /* ── Format ISO date for display ── */
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  /* ── Get initials from name ── */
  function getInitials(name) {
    return String(name)
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /* ── Toast notification ── */
  let _toastTimer = null;
  function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;

    clearTimeout(_toastTimer);
    el.className    = `toast ${type}`;
    el.innerHTML    = `
      <i class="toast-icon">${type === 'success' ? '✓' : '✕'}</i>
      <span>${escHtml(msg)}</span>
    `;
    el.classList.remove('hidden');

    _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  /* ── Show/hide auth error ── */
  function setAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  /* ── Render stats bar ── */
  function renderStats(uid) {
    const s = ItemsAPI.stats(uid);
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('stat-total',   s.total);
    set('stat-work',    s.work    || 0);
    set('stat-personal',s.personal|| 0);
    set('stat-idea',    s.idea    || 0);
    set('stat-urgent',  s.urgent  || 0);
    set('stat-archive', s.archive || 0);
  }

  /* ── Render item card HTML ── */
  function _cardHTML(item) {
    const color = CAT_COLORS[item.category] || 'var(--accent)';
    const desc  = item.description
      ? escHtml(item.description)
      : '<em style="opacity:.35">No description</em>';

    return `
      <div class="item-card"
           role="listitem"
           style="--cat-color:${color}"
           data-id="${item.id}">
        <div class="item-cat">${escHtml(item.category)}</div>
        <div class="item-title">${escHtml(item.title)}</div>
        <div class="item-desc">${desc}</div>
        <div class="item-footer">
          <div class="item-date">Updated ${formatDate(item.updatedAt)}</div>
          <div class="item-actions">
            <button class="btn-icon edit-btn"
                    data-id="${item.id}"
                    aria-label="Edit ${escHtml(item.title)}"
                    title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon delete delete-btn"
                    data-id="${item.id}"
                    aria-label="Delete ${escHtml(item.title)}"
                    title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Render items grid ── */
  function renderItems(items, { onEdit, onDelete }) {
    const grid       = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');
    const emptyTitle = document.getElementById('empty-title');
    const emptySub   = document.getElementById('empty-sub');
    const emptyBtn   = document.getElementById('empty-create-btn');

    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    items.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = _cardHTML(item).trim();
      const card = wrapper.firstChild;
      grid.appendChild(card);
    });

    // Attach events
    grid.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => onEdit(btn.dataset.id));
    });
    grid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => onDelete(btn.dataset.id));
    });
  }

  /* ── Set empty state text ── */
  function setEmptyState(hasFilters) {
    const title = document.getElementById('empty-title');
    const sub   = document.getElementById('empty-sub');
    const btn   = document.getElementById('empty-create-btn');
    if (!title) return;

    if (hasFilters) {
      title.textContent = 'No matching records';
      sub.textContent   = 'Try a different search or filter.';
      btn.classList.add('hidden');
    } else {
      title.textContent = 'No records yet';
      sub.textContent   = 'Create your first record to get started.';
      btn.classList.remove('hidden');
    }
  }

  /* ── Update user chip in topbar ── */
  function setUserDisplay(user) {
    const avatar = document.getElementById('user-avatar');
    const label  = document.getElementById('user-name-label');
    if (avatar) avatar.textContent = getInitials(user.name);
    if (label)  label.textContent  = user.name;
  }

  /* ── Show/hide screens ── */
  function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  }

  function showAppScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
  }

  /* ── Switch auth forms ── */
  function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    setAuthError('');
  }

  function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    setAuthError('');
  }

  /* ── Open / close item modal ── */
  function openItemModal({ item = null } = {}) {
    const modal    = document.getElementById('item-modal');
    const title    = document.getElementById('modal-title');
    const saveBtn  = document.getElementById('modal-save');
    const fTitle   = document.getElementById('modal-item-title');
    const fCat     = document.getElementById('modal-item-category');
    const fDesc    = document.getElementById('modal-item-desc');
    const charCnt  = document.getElementById('desc-count');

    title.textContent   = item ? 'Edit Record'    : 'New Record';
    saveBtn.textContent = item ? 'Save Changes'   : 'Create Record';
    fTitle.value        = item ? item.title        : '';
    fCat.value          = item ? item.category     : 'Work';
    fDesc.value         = item ? item.description  : '';
    if (charCnt) charCnt.textContent = fDesc.value.length;

    fTitle.classList.remove('invalid');
    modal.classList.remove('hidden');
    setTimeout(() => fTitle.focus(), 60);
  }

  function closeItemModal() {
    document.getElementById('item-modal').classList.add('hidden');
  }

  /* ── Open / close delete modal ── */
  function openDeleteModal() {
    document.getElementById('delete-modal').classList.remove('hidden');
  }

  function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
  }

  /* ── Mark field invalid ── */
  function markInvalid(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.add('invalid');
    el.focus();
    setTimeout(() => el.classList.remove('invalid'), 1800);
  }

  return {
    escHtml,
    formatDate,
    showToast,
    setAuthError,
    renderStats,
    renderItems,
    setEmptyState,
    setUserDisplay,
    showAuthScreen,
    showAppScreen,
    showLoginForm,
    showRegisterForm,
    openItemModal,
    closeItemModal,
    openDeleteModal,
    closeDeleteModal,
    markInvalid,
  };

})();
