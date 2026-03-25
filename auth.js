/**
 * auth.js — Authentication API
 * ─────────────────────────────────────────────
 * Handles user registration, login, logout, and
 * session management.
 *
 * Returns:  { user } on success
 *           { error } on failure
 *
 * Depends on: db.js
 */

'use strict';

const AuthAPI = (() => {

  /* ── Validation helpers ── */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function hashPassword(password) {
    // NOTE: This is a simple hash for demo purposes.
    // In production use bcrypt on the server side.
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /* ── Register ── */
  function register({ name, email, password }) {
    // Validate inputs
    if (!name || name.trim().length < 2) {
      return { error: 'Name must be at least 2 characters.' };
    }
    if (!isValidEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    const users = DB.getUsers();

    // Check for duplicate email (case-insensitive)
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'An account with this email already exists.' };
    }

    // Create user record
    const user = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2),
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      password:  hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    DB.saveUsers([...users, user]);

    // Auto-login after register
    const session = _makeSession(user);
    DB.saveSession(session);

    console.info(`[Auth] Registered: ${user.email}`);
    return { user: session };
  }

  /* ── Login ── */
  function login({ email, password }) {
    if (!email || !password) {
      return { error: 'Please fill in all fields.' };
    }

    const users = DB.getUsers();
    const user  = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim()
        && u.password === hashPassword(password)
    );

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    const session = _makeSession(user);
    DB.saveSession(session);

    console.info(`[Auth] Logged in: ${user.email}`);
    return { user: session };
  }

  /* ── Logout ── */
  function logout() {
    DB.clearSession();
    console.info('[Auth] Logged out.');
    return { ok: true };
  }

  /* ── Get current session ── */
  function me() {
    return DB.getSession();
  }

  /* ── Private: build session object ── */
  function _makeSession(user) {
    return {
      id:    user.id,
      name:  user.name,
      email: user.email,
    };
  }

  return { register, login, logout, me };

})();
