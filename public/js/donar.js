/**
 * ImpactoPool — Donar Script
 * Incluir en donar.html
 * Carga asociaciones verificadas y permite enviar donaciones.
 */

let selectedAssociationId = null;
let selectedCampaignId = null;
let selectedPaymentMethod = 'crypto'; // default

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  const btnCrypto = document.getElementById('btn-crypto');
  const btnFiat = document.getElementById('btn-fiat');
  if (!btnCrypto || !btnFiat) return;

  if (method === 'crypto') {
    btnCrypto.classList.add('border-primary');
    btnCrypto.classList.remove('border-transparent');
    btnCrypto.querySelector('.font-bold').classList.add('text-primary');
    btnCrypto.querySelector('.font-bold').classList.remove('text-on-surface');
    btnFiat.classList.remove('border-primary');
    btnFiat.classList.add('border-transparent');
    btnFiat.querySelector('.font-bold').classList.remove('text-primary');
    btnFiat.querySelector('.font-bold').classList.add('text-on-surface');
  } else {
    btnFiat.classList.add('border-primary');
    btnFiat.classList.remove('border-transparent');
    btnFiat.querySelector('.font-bold').classList.add('text-primary');
    btnFiat.querySelector('.font-bold').classList.remove('text-on-surface');
    btnCrypto.classList.remove('border-primary');
    btnCrypto.classList.add('border-transparent');
    btnCrypto.querySelector('.font-bold').classList.remove('text-primary');
    btnCrypto.querySelector('.font-bold').classList.add('text-on-surface');
  }
}

// Exponer globalmente para el onclick del HTML
window.selectPaymentMethod = selectPaymentMethod;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sesión
  if (!Session.requireAuth()) return;

  // === Cargar asociaciones verificadas ===
  try {
    const associations = await Session.apiRequest('/associations?verified=true');
    populateAssociations(associations);
  } catch (err) {
    console.error('Error cargando asociaciones:', err);
  }

  // Detectar parámetros de campaña desde URL
  const urlParams = new URLSearchParams(window.location.search);
  const campaignParam = urlParams.get('campaign');
  const associationParam = urlParams.get('association');
  if (campaignParam) selectedCampaignId = campaignParam;
  if (associationParam) {
    selectedAssociationId = associationParam;
    const select = document.getElementById('association-select');
    if (select) select.value = associationParam;
  }

  // === Botón de donación — buscar "Confirmar Contribución" ===
  const allButtons = document.querySelectorAll('button');
  let donateBtn = null;
  allButtons.forEach(btn => {
    if (btn.textContent.includes('Confirmar Contribución')) {
      donateBtn = btn;
    }
  });

  if (donateBtn) {
    donateBtn.addEventListener('click', handleDonate);
  }

  // === Quick-select amount buttons ===
  const amountInput = document.querySelector('input[type="number"]');
  const quickBtns = document.querySelectorAll('button');
  quickBtns.forEach(btn => {
    const text = btn.textContent.trim();
    const match = text.match(/^\$([0-9,]+)$/);
    if (match && amountInput) {
      btn.addEventListener('click', () => {
        amountInput.value = match[1].replace(/,/g, '');
        updatePreview(amountInput.value);
      });
    }
  });

  if (amountInput) {
    amountInput.addEventListener('input', () => updatePreview(amountInput.value));
  }
});

function populateAssociations(associations) {
  const amountLabel = document.querySelector('label');
  if (!amountLabel) return;

  let select = document.getElementById('association-select');
  if (!select) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-6';
    wrapper.innerHTML = `
      <label class="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">ASOCIACIÓN DESTINO</label>
      <select id="association-select" class="w-full px-4 py-3 rounded-xl bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 text-on-surface">
        <option value="">Seleccioná una asociación...</option>
      </select>
    `;
    amountLabel.parentElement.insertBefore(wrapper, amountLabel.parentElement.firstChild);
    select = document.getElementById('association-select');
  }

  associations.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a._id;
    opt.textContent = `${a.name} — ${a.category || 'general'}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    selectedAssociationId = select.value;
  });
}

function updatePreview(value) {
  const amount = parseFloat(value) || 0;
  const previewEls = document.querySelectorAll('[data-preview]');
  previewEls.forEach(el => {
    if (el.dataset.preview === 'association') {
      el.textContent = (amount * 0.70).toFixed(2);
    } else if (el.dataset.preview === 'vault') {
      el.textContent = (amount * 0.30).toFixed(2);
    }
  });
}

async function handleDonate() {
  const amountInput = document.querySelector('input[type="number"]');
  const amount = parseFloat(amountInput ? amountInput.value : 0);

  if (!selectedAssociationId) {
    showDonateMessage('Seleccioná una asociación', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showDonateMessage('Ingresá un monto válido', 'error');
    return;
  }

  // Si eligió cripto, verificar wallet
  if (selectedPaymentMethod === 'crypto') {
    if (typeof window.ethereum === 'undefined') {
      showDonateMessage('MetaMask no detectado. Instalá la extensión para pagar con USDC.', 'error');
      return;
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch {
      showDonateMessage('Conectá tu wallet para pagar con USDC', 'error');
      return;
    }
  }

  try {
    const result = await Session.apiRequest('/donations', {
      method: 'POST',
      body: JSON.stringify({
        associationId: selectedAssociationId,
        amount,
        paymentMethod: selectedPaymentMethod,
        campaignId: selectedCampaignId || undefined
      }),
    });
    if (result.status === 'completed') {
      showDonateMessage(`¡Donación exitosa! ID: ${result.txHash || result._id}`, 'success');
    } else {
      showDonateMessage(`Donación registrada pero estado: ${result.status}. La transacción blockchain puede estar pendiente.`, 'error');
    }
    if (amountInput) amountInput.value = '';
  } catch (err) {
    showDonateMessage(err.message, 'error');
  }
}

function showDonateMessage(msg, type) {
  let el = document.getElementById('donate-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'donate-msg';
    el.className = 'text-center text-sm font-medium p-3 rounded-lg mt-4';
    const main = document.querySelector('main') || document.body;
    const form = document.querySelector('.relative.z-10') || main;
    form.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = type === 'error' ? '#ba1a1a' : '#0a6c44';
  el.style.backgroundColor = type === 'error' ? '#ffdad6' : '#9ff5c1';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}
