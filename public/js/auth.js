/**
 * ImpactoPool — Auth Script
 * Incluir SOLO en login.html
 * Conecta el formulario de login/registro con la API y redirige según rol
 */

function redirectByRole(user) {
  if (user.role === 'association') {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'vouchers.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Si ya está logueado, redirigir según rol
  if (Session.isLoggedIn()) {
    const user = Session.getUser();
    redirectByRole(user);
    return;
  }

  // === Login con email/password ===
  const loginForm = document.querySelector('form');
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  const loginBtn = document.querySelector('button[type="button"]');

  if (loginBtn) {
    // Reemplazar el onclick hardcodeado
    loginBtn.removeAttribute('onclick');
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !password) {
        showAuthError('Enter your email and password');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'SIGNING IN...';

      try {
        const res = await fetch(`${API_BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        Session.save(data.token, data.user);
        redirectByRole(data.user);
      } catch (err) {
        showAuthError(err.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'SIGN IN';
      }
    });
  }

  // === Conectar MetaMask ===
  const metamaskBtn = document.querySelector('button .material-symbols-outlined[style*="account_balance_wallet"]');
  const metamaskParent = metamaskBtn ? metamaskBtn.closest('button') : null;
  if (metamaskParent) {
    metamaskParent.addEventListener('click', async () => {
      if (typeof window.ethereum === 'undefined') {
        showAuthError('MetaMask not detected. Install the extension.');
        return;
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const wallet = accounts[0];
        // Login por wallet: intentar login, si no existe crear cuenta
        try {
          const res = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `${wallet}@wallet.impactpool`, password: wallet }),
          });
          const data = await res.json();
          if (res.ok) {
            Session.save(data.token, data.user);
            redirectByRole(data.user);
            return;
          }
        } catch { /* no existe, registrar */ }

        // Registrar con wallet
        const res = await fetch(`${API_BASE}/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${wallet}@wallet.impactpool`,
            password: wallet,
            name: `Wallet ${wallet.slice(0, 8)}`,
            walletAddress: wallet,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error registering wallet');

        Session.save(data.token, data.user);
        redirectByRole(data.user);
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }

  function showAuthError(msg) {
    // Buscar o crear un div de error
    let errorDiv = document.getElementById('auth-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'auth-error';
      errorDiv.className = 'text-sm text-center font-medium mt-4 p-3 rounded-lg';
      const form = document.querySelector('form') || document.querySelector('.glass-card');
      if (form) form.appendChild(errorDiv);
    }
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    errorDiv.style.color = '#ba1a1a';
    errorDiv.style.backgroundColor = '#ffdad6';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
  }
});
