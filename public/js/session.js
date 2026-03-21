/**
 * ImpactoPool — Session Manager
 * Incluir en TODAS las páginas para manejo de sesión.
 * Detecta si el usuario está logueado, ajusta nav y redirige si es necesario.
 */

const SESSION_TOKEN_KEY = 'impactopool_token';
const SESSION_USER_KEY = 'impactopool_user';
const API_BASE = window.location.origin + '/api';

const Session = {
  getToken() {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_USER_KEY));
    } catch {
      return null;
    }
  },

  getUserRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isOrganization() {
    return this.getUserRole() === 'association';
  },

  isDonor() {
    const role = this.getUserRole();
    return role === 'donor' || !role;
  },

  save(token, user) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  },

  logout() {
    this.clear();
    window.location.href = 'inicio.html';
  },

  /** Redirigir a login si no está autenticado (usar en páginas protegidas) */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /** Helper para requests autenticados */
  async apiRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (res.status === 401) {
      this.clear();
      window.location.href = 'login.html';
      throw new Error('Sesión expirada');
    }
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  },

  /** Actualizar navbar según estado de sesión y rol */
  updateNav() {
    const logoutBtns = document.querySelectorAll('[data-action="logout"]');
    const loginBtns = document.querySelectorAll('[data-action="login"]');
    const authNavLinks = document.querySelectorAll('[data-auth="required"]');
    const guestNavLinks = document.querySelectorAll('[data-auth="guest"]');

    // Links según rol
    const donorLinks = document.querySelectorAll('[data-role="donor"]');
    const orgLinks = document.querySelectorAll('[data-role="organization"]');

    if (this.isLoggedIn()) {
      logoutBtns.forEach(btn => { btn.style.display = ''; });
      loginBtns.forEach(btn => { btn.style.display = 'none'; });
      authNavLinks.forEach(el => { el.style.display = ''; });
      guestNavLinks.forEach(el => { el.style.display = 'none'; });

      // Mostrar/ocultar links según rol
      if (this.isOrganization()) {
        donorLinks.forEach(el => { el.style.display = 'none'; });
        orgLinks.forEach(el => { el.style.display = ''; });
      } else {
        donorLinks.forEach(el => { el.style.display = ''; });
        orgLinks.forEach(el => { el.style.display = 'none'; });
      }
    } else {
      logoutBtns.forEach(btn => { btn.style.display = 'none'; });
      loginBtns.forEach(btn => { btn.style.display = ''; });
      authNavLinks.forEach(el => { el.style.display = 'none'; });
      guestNavLinks.forEach(el => { el.style.display = ''; });
      donorLinks.forEach(el => { el.style.display = 'none'; });
      orgLinks.forEach(el => { el.style.display = 'none'; });
    }
  }
};

// Auto-actualizar nav al cargar
document.addEventListener('DOMContentLoaded', () => {
  Session.updateNav();
});
