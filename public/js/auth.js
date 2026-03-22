/**
 * ImpactoPool — Auth Script
 * Incluir SOLO en login.html
 * Maneja login, registro de donadores con código de verificación, y solicitud de organizaciones
 */

let pendingDonorData = null;

function redirectByRole(user) {
  if (user.role === 'association') {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'vouchers.html';
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('#auth-tabs button').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.className = 'flex-1 py-3 text-sm font-bold rounded-md transition-all ' +
      (isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container');
  });
  // Show/hide panels
  document.getElementById('panel-login').classList.toggle('hidden', tabName !== 'login');
  document.getElementById('panel-register-donor').classList.toggle('hidden', tabName !== 'register-donor');
  document.getElementById('panel-register-org').classList.toggle('hidden', tabName !== 'register-org');

  // Always fully reset donor registration state
  pendingDonorData = null;
  const regDonorForm = document.getElementById('register-donor-form');
  const regDonorVerify = document.getElementById('reg-donor-verify');
  if (regDonorForm) regDonorForm.classList.remove('hidden');
  if (regDonorVerify) regDonorVerify.classList.add('hidden');
  // Reset donor form fields and button
  const regDonorBtn = document.getElementById('reg-donor-btn');
  if (regDonorBtn) { regDonorBtn.disabled = false; regDonorBtn.textContent = 'SEND VERIFICATION CODE'; }
  const regDonorCode = document.getElementById('reg-donor-code');
  if (regDonorCode) regDonorCode.value = '';
  const verifyDonorBtn = document.getElementById('verify-donor-btn');
  if (verifyDonorBtn) { verifyDonorBtn.disabled = false; verifyDonorBtn.textContent = 'VERIFY & CREATE ACCOUNT'; }
  // Hide demo code hint if present
  const demoHint = document.getElementById('demo-code-hint');
  if (demoHint) demoHint.classList.add('hidden');

  // Always fully reset org registration state
  const regOrgForm = document.getElementById('register-org-form');
  const regOrgConfirm = document.getElementById('reg-org-confirm');
  if (regOrgForm) regOrgForm.classList.remove('hidden');
  if (regOrgConfirm) regOrgConfirm.classList.add('hidden');
  const regOrgBtn = document.getElementById('reg-org-btn');
  if (regOrgBtn) { regOrgBtn.disabled = false; regOrgBtn.textContent = 'SUBMIT APPLICATION'; }

  // Hide any error message
  const errorDiv = document.getElementById('auth-error');
  if (errorDiv) errorDiv.style.display = 'none';
}

// Make switchTab global for inline onclick usage
window.switchTab = switchTab;

document.addEventListener('DOMContentLoaded', () => {
  // Si ya está logueado, redirigir según rol
  if (Session.isLoggedIn()) {
    const user = Session.getUser();
    redirectByRole(user);
    return;
  }

  // === Tab switching ===
  document.querySelectorAll('#auth-tabs button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // === LOGIN: email/password ===
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

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
        if (!res.ok) throw new Error(data.error || 'Invalid credentials');

        Session.save(data.token, data.user);
        redirectByRole(data.user);
      } catch (err) {
        showAuthError(err.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'SIGN IN';
      }
    });
  }

  // === REGISTER DONOR: Step 1 - Send verification code ===
  const regDonorBtn = document.getElementById('reg-donor-btn');
  if (regDonorBtn) {
    regDonorBtn.addEventListener('click', async () => {
      const name = document.getElementById('reg-donor-name').value.trim();
      const email = document.getElementById('reg-donor-email').value.trim();
      const password = document.getElementById('reg-donor-password').value.trim();

      if (!name || !email || !password) {
        showAuthError('Please fill in all fields');
        return;
      }
      if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
      }

      regDonorBtn.disabled = true;
      regDonorBtn.textContent = 'SENDING CODE...';

      try {
        const res = await fetch(`${API_BASE}/users/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error sending verification code');

        // Save pending registration data
        pendingDonorData = { name, email, password };

        // Show verification step
        document.getElementById('register-donor-form').classList.add('hidden');
        document.getElementById('reg-donor-verify').classList.remove('hidden');
        document.getElementById('verify-email-sent').textContent = `We sent a 6-digit code to ${email}`;

        // Show demo code hint if returned by server
        if (data.demoCode) {
          let hint = document.getElementById('demo-code-hint');
          if (!hint) {
            hint = document.createElement('div');
            hint.id = 'demo-code-hint';
            hint.className = 'mt-3 p-3 bg-secondary-container text-on-secondary-container text-center text-sm font-mono rounded-lg';
            document.getElementById('reg-donor-verify').insertBefore(hint, document.getElementById('reg-donor-code').parentElement);
          }
          hint.textContent = `Demo mode — your code: ${data.demoCode}`;
          hint.classList.remove('hidden');
        }
      } catch (err) {
        showAuthError(err.message);
        regDonorBtn.disabled = false;
        regDonorBtn.textContent = 'SEND VERIFICATION CODE';
      }
    });
  }

  // === REGISTER DONOR: Step 2 - Verify code & create account ===
  const verifyBtn = document.getElementById('verify-donor-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const code = document.getElementById('reg-donor-code').value.trim();
      if (!code || code.length !== 6) {
        showAuthError('Enter the 6-digit verification code');
        return;
      }
      if (!pendingDonorData) {
        showAuthError('Registration data lost. Please start over.');
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = 'VERIFYING...';

      try {
        // Verify the code
        const verifyRes = await fetch(`${API_BASE}/users/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingDonorData.email, code }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code');

        // Create the account
        const regRes = await fetch(`${API_BASE}/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pendingDonorData.name,
            email: pendingDonorData.email,
            password: pendingDonorData.password,
            role: 'donor',
          }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.error || 'Error creating account');

        Session.save(regData.token, regData.user);
        redirectByRole(regData.user);
      } catch (err) {
        showAuthError(err.message);
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'VERIFY & CREATE ACCOUNT';
      }
    });
  }

  // === REGISTER DONOR: Resend code ===
  const resendBtn = document.getElementById('resend-code-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!pendingDonorData) return;
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';
      try {
        await fetch(`${API_BASE}/users/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingDonorData.email }),
        });
        resendBtn.textContent = 'Code resent!';
        setTimeout(() => {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend code';
        }, 3000);
      } catch {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
      }
    });
  }

  // === REGISTER ORG: Submit application ===
  const regOrgBtn = document.getElementById('reg-org-btn');
  if (regOrgBtn) {
    regOrgBtn.addEventListener('click', async () => {
      const orgName = document.getElementById('reg-org-name').value.trim();
      const email = document.getElementById('reg-org-email').value.trim();

      if (!orgName || !email) {
        showAuthError('Please fill in all fields');
        return;
      }

      regOrgBtn.disabled = true;
      regOrgBtn.textContent = 'SUBMITTING...';

      try {
        const res = await fetch(`${API_BASE}/users/org-apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: orgName, email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error submitting application');

        // Show confirmation
        document.getElementById('register-org-form').classList.add('hidden');
        document.getElementById('reg-org-confirm').classList.remove('hidden');
      } catch (err) {
        showAuthError(err.message);
        regOrgBtn.disabled = false;
        regOrgBtn.textContent = 'SUBMIT APPLICATION';
      }
    });
  }

  // === Wallet connections ===
  const walletButtons = document.querySelectorAll('#panel-login .space-y-3 button');
  const metamaskButton = walletButtons[0];
  const coinbaseButton = walletButtons[1];

  if (metamaskButton) {
    metamaskButton.addEventListener('click', () => connectWallet('metamask'));
  }
  if (coinbaseButton) {
    coinbaseButton.addEventListener('click', () => connectWallet('coinbase'));
  }

  async function connectWallet(type) {
    if (typeof window.ethereum === 'undefined') {
      showAuthError(type === 'metamask'
        ? 'MetaMask not detected. Install the extension.'
        : 'No wallet provider detected.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts[0];
      // Try login first
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
      } catch { /* not registered yet */ }

      // Register with wallet
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
  }

  function showAuthError(msg) {
    let errorDiv = document.getElementById('auth-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'auth-error';
      errorDiv.className = 'text-sm text-center font-medium mt-4 p-3 rounded-lg';
      document.querySelector('.glass-card').appendChild(errorDiv);
    }
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    errorDiv.style.color = '#ba1a1a';
    errorDiv.style.backgroundColor = '#ffdad6';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
  }
});
