/**
 * ImpactoPool - App Frontend
 * Lógica principal: auth, donaciones, UI
 */

const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('impactopool_token');

// =====================
// Utilidades
// =====================

function showNotification(message, type = 'success') {
  const el = document.getElementById('notification');
  el.textContent = message;
  el.className = `notification ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// =====================
// Auth
// =====================

function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

function onLoggedIn(data) {
  authToken = data.token;
  localStorage.setItem('impactopool_token', data.token);
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('donation-form').style.display = 'block';
  document.getElementById('my-donations').style.display = 'block';
  showNotification(`Bienvenido, ${data.user.name}!`);
  loadMyDonations();
}

async function login() {
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const data = await apiRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    onLoggedIn(data);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function register() {
  try {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const walletAddress = document.getElementById('reg-wallet').value || undefined;
    const data = await apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, walletAddress }),
    });
    onLoggedIn(data);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// =====================
// Donaciones
// =====================

function updateSplitPreview() {
  const amount = parseFloat(document.getElementById('donation-amount').value) || 0;
  document.getElementById('preview-association').textContent = (amount * 0.70).toFixed(2);
  document.getElementById('preview-vault').textContent = (amount * 0.30).toFixed(2);
}

async function makeDonation() {
  try {
    const associationId = document.getElementById('select-association').value;
    const amount = parseFloat(document.getElementById('donation-amount').value);

    if (!associationId) {
      return showNotification('Seleccioná una asociación', 'error');
    }
    if (!amount || amount <= 0) {
      return showNotification('Ingresá un monto válido', 'error');
    }

    const donation = await apiRequest('/donations', {
      method: 'POST',
      body: JSON.stringify({ associationId, amount }),
    });

    showNotification(`Donación de ${amount} USDC exitosa!`);
    document.getElementById('donation-amount').value = '';
    updateSplitPreview();
    loadMyDonations();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function loadMyDonations() {
  try {
    const donations = await apiRequest('/donations/donor/me');
    const container = document.getElementById('donations-list');
    container.innerHTML = '';

    if (donations.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No tenés donaciones aún.</p>';
      return;
    }

    donations.forEach(d => {
      const item = document.createElement('div');
      item.className = 'donation-item';
      item.innerHTML = `
        <div>
          <strong>${d.association?.name || 'Asociación'}</strong>
          <p style="color:var(--text-muted);font-size:0.85rem">${new Date(d.createdAt).toLocaleDateString()}</p>
        </div>
        <div style="text-align:right">
          <strong>${d.totalAmount} USDC</strong>
          <span class="status ${d.status}">${d.status}</span>
        </div>
      `;
      container.appendChild(item);
    });
  } catch {
    // No mostrar error si no está logueado
  }
}

// =====================
// Init
// =====================

document.addEventListener('DOMContentLoaded', () => {
  // Toggle forms
  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
  });
  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // Auth buttons
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('btn-register').addEventListener('click', register);

  // Donation
  document.getElementById('donation-amount').addEventListener('input', updateSplitPreview);
  document.getElementById('btn-donate').addEventListener('click', makeDonation);

  // Si hay token guardado, verificar sesión
  if (authToken) {
    apiRequest('/users/me')
      .then(user => {
        onLoggedIn({ user, token: authToken });
      })
      .catch(() => {
        localStorage.removeItem('impactopool_token');
        authToken = null;
      });
  }
});
