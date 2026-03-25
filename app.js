/**
 * app.js — Application Controller
 * ─────────────────────────────────────────────
 * Wires together auth, API, and UI layers.
 * Handles all event listeners and app state.
 *
 * Depends on: db.js, auth.js, api.js, ui.js
 *
 * Keyboard shortcuts:
 *   Escape         → close any open modal
 *   Ctrl/Cmd+Enter → save item in modal
 *   Ctrl/Cmd+K     → focus search bar
 */

'use strict';

/* ═══════════════════════════════════════
   APP STATE
═══════════════════════════════════════ */
const State = {
  currentUser:  null,
  allItems:     [],
  searchQuery:  '',
  catFilter:    'All',
  editingId:    null,   // null = create mode
  deleteTarget: null,
};

/* ═══════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════ */
const el = {
  // Auth
  loginEmail:    () => document.getElementById('login-email'),
  loginPassword: () => document.getElementById('login-password'),
  loginBtn:      () => document.getElementById('login-btn'),
  goRegister:    () => document.getElementById('go-register'),

  regName:       () => document.getElementById('reg-name'),
  regEmail:      () => document.getElementById('reg-email'),
  regPassword:   () => document.getElementById('reg-password'),
  registerBtn:   () => document.getElementById('register-btn'),
  goLogin:       () => document.getElementById('go-login'),

  // App
  logoutBtn:     () => document.getElementById('logout-btn'),
  newRecordBtn:  () => document.getElementById('new-record-btn'),
  emptyCreateBtn:() => document.getElementById('empty-create-btn'),
  searchInput:   () => document.getElementById('search-input'),
  filterGroup:   () => document.getElementById('filter-group'),

  // Item modal
  modalSave:     () => document.getElementById('modal-save'),
  modalCancel:   () => document.getElementById('modal-cancel'),
  modalCloseX:   () => document.getElementById('modal-close-x'),
  modalItemTitle:() => document.getElementById('modal-item-title'),
  modalItemCat:  () => document.getElementById('modal-item-category'),
  modalItemDesc: () => document.getElementById('modal-item-desc'),
  descCount:     () => document.getElementById('desc-count'),

  // Delete modal
  deleteConfirm: () => document.getElementById('delete-confirm'),
  deleteCancel:  () => document.getElementById('delete-cancel'),

  // Overlays (for backdrop click)
  itemModalOverlay:   () => document.getElementById('item-modal'),
  deleteModalOverlay: () => document.getElementById('delete-modal'),
};

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function refreshView() {
  State.allItems = ItemsAPI.list(State.currentUser.id);
  const filtered = _applyFilters(State.allItems);
  UI.setEmptyState(State.searchQuery !== '' || State.catFilter !== 'All');
  UI.renderItems(filtered, { onEdit: openEditModal, onDelete: openDeleteConfirm });
  UI.renderStats(State.currentUser.id);
}

function _applyFilters(items) {
  return items.filter(item => {
    const q           = State.searchQuery.toLowerCase();
    const matchSearch = !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    const matchCat    = State.catFilter === 'All' || item.category === State.catFilter;
    return matchSearch && matchCat;
  });
}

/* ═══════════════════════════════════════
   AUTH HANDLERS
═══════════════════════════════════════ */
function handleLogin() {
  UI.setAuthError('');
  const email    = el.loginEmail().value.trim();
  const password = el.loginPassword().value;

  const res = AuthAPI.login({ email, password });
  if (res.error) { UI.setAuthError(res.error); return; }
  enterApp(res.user);
}

function handleRegister() {
  UI.setAuthError('');
  const name     = el.regName().value.trim();
  const email    = el.regEmail().value.trim();
  const password = el.regPassword().value;

  const res = AuthAPI.register({ name, email, password });
  if (res.error) { UI.setAuthError(res.error); return; }
  enterApp(res.user);
}

function handleLogout() {
  AuthAPI.logout();
  State.currentUser  = null;
  State.allItems     = [];
  State.searchQuery  = '';
  State.catFilter    = 'All';

  // Reset search/filter UI
  const si = el.searchInput();
  if (si) si.value = '';
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === 'All');
  });

  UI.showAuthScreen();
  UI.showLoginForm();
}

function enterApp(user) {
  State.currentUser = user;
  UI.setUserDisplay(user);
  UI.showAppScreen();
  refreshView();
}

/* ═══════════════════════════════════════
   ITEM MODAL HANDLERS
═══════════════════════════════════════ */
function openCreateModal() {
  State.editingId = null;
  UI.openItemModal({ item: null });
}

function openEditModal(id) {
  const item = ItemsAPI.getById(State.currentUser.id, id);
  if (!item) { UI.showToast('Record not found.', 'error'); return; }
  State.editingId = id;
  UI.openItemModal({ item });
}

function saveItem() {
  const title       = el.modalItemTitle().value.trim();
  const category    = el.modalItemCat().value;
  const description = el.modalItemDesc().value.trim();

  if (!title) {
    UI.markInvalid('modal-item-title');
    return;
  }

  let res;
  if (State.editingId) {
    res = ItemsAPI.update(State.currentUser.id, State.editingId, { title, category, description });
  } else {
    res = ItemsAPI.create(State.currentUser.id, { title, category, description });
  }

  if (res.error) { UI.showToast(res.error, 'error'); return; }

  UI.closeItemModal();
  refreshView();
  UI.showToast(State.editingId ? 'Record updated!' : 'Record created!');
  State.editingId = null;
}

/* ═══════════════════════════════════════
   DELETE HANDLERS
═══════════════════════════════════════ */
function openDeleteConfirm(id) {
  State.deleteTarget = id;
  UI.openDeleteModal();
}

function confirmDelete() {
  if (!State.deleteTarget) return;
  const res = ItemsAPI.delete(State.currentUser.id, State.deleteTarget);

  UI.closeDeleteModal();

  if (res.error) { UI.showToast(res.error, 'error'); return; }

  State.deleteTarget = null;
  refreshView();
  UI.showToast('Record deleted.', 'error');
}

/* ═══════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════ */
function bindEvents() {

  /* ── Auth ── */
  el.loginBtn().addEventListener('click', handleLogin);
  el.registerBtn().addEventListener('click', handleRegister);
  el.goRegister().addEventListener('click', () => UI.showRegisterForm());
  el.goLogin().addEventListener('click',    () => UI.showLoginForm());
  el.logoutBtn().addEventListener('click',  handleLogout);

  // Enter key on auth fields
  [el.loginEmail(), el.loginPassword()].forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
  [el.regName(), el.regEmail(), el.regPassword()].forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
  });

  /* ── New record ── */
  el.newRecordBtn().addEventListener('click',   openCreateModal);
  el.emptyCreateBtn().addEventListener('click', openCreateModal);

  /* ── Search ── */
  el.searchInput().addEventListener('input', e => {
    State.searchQuery = e.target.value;
    refreshView();
  });

  /* ── Category filter ── */
  el.filterGroup().addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    State.catFilter = btn.dataset.cat;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    refreshView();
  });

  /* ── Item modal ── */
  el.modalSave().addEventListener('click',    saveItem);
  el.modalCancel().addEventListener('click',  UI.closeItemModal);
  el.modalCloseX().addEventListener('click',  UI.closeItemModal);

  // Backdrop click
  el.itemModalOverlay().addEventListener('click', e => {
    if (e.target === el.itemModalOverlay()) UI.closeItemModal();
  });

  // Ctrl/Cmd+Enter to save
  el.modalItemTitle().addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveItem();
  });
  el.modalItemDesc().addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveItem();
  });

  // Character counter
  el.modalItemDesc().addEventListener('input', e => {
    const counter = el.descCount();
    if (counter) counter.textContent = e.target.value.length;
  });

  /* ── Delete modal ── */
  el.deleteConfirm().addEventListener('click', confirmDelete);
  el.deleteCancel().addEventListener('click',  UI.closeDeleteModal);

  el.deleteModalOverlay().addEventListener('click', e => {
    if (e.target === el.deleteModalOverlay()) UI.closeDeleteModal();
  });

  /* ── Global keyboard shortcuts ── */
  document.addEventListener('keydown', e => {
    // Escape → close modals
    if (e.key === 'Escape') {
      UI.closeItemModal();
      UI.closeDeleteModal();
    }

    // Ctrl/Cmd+K → focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const si = el.searchInput();
      if (si && !document.getElementById('app-screen').classList.contains('hidden')) {
        si.focus();
        si.select();
      }
    }
  });
}

/* ═══════════════════════════════════════
   INIT — Bootstrap the application
═══════════════════════════════════════ */
(function init() {
  bindEvents();

  // Restore session on page load / refresh
  const session = AuthAPI.me();
  if (session) {
    enterApp(session);
  } else {
    UI.showAuthScreen();
  }

  console.info('Nexus app initialized.');
})();
