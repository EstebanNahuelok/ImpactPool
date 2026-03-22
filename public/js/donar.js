/**
 * ImpactoPool — Donate Script
 * For donar.html
 * Loads campaign info (if selected) or associations, handles donation flow.
 */

let selectedAssociationId = null;
let selectedCampaignId = null;
let selectedPaymentMethod = 'crypto';
let currentCampaign = null;

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

window.selectPaymentMethod = selectPaymentMethod;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Session.requireAuth()) return;

  const urlParams = new URLSearchParams(window.location.search);
  const campaignParam = urlParams.get('campaign');
  const associationParam = urlParams.get('association');

  if (campaignParam) {
    selectedCampaignId = campaignParam;
    await loadCampaignInfo(campaignParam);
  }

  if (associationParam) {
    selectedAssociationId = associationParam;
  }

  // If no campaign selected, show association dropdown and use static quick-select
  if (!selectedCampaignId) {
    try {
      const associations = await Session.apiRequest('/associations?verified=true');
      populateAssociations(associations);
    } catch (err) {
      console.error('Error loading associations:', err);
    }
    setupStaticQuickSelect();
  }

  // Donate button
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    if (btn.textContent.includes('Confirm Contribution')) {
      btn.addEventListener('click', handleDonate);
    }
  });

  // Amount input listener
  const amountInput = document.getElementById('amount-input');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      updatePreview(amountInput.value);
      updateVoucherCount(amountInput.value);
    });
  }
});

// ==================== CAMPAIGN MODE ====================

async function loadCampaignInfo(campaignId) {
  try {
    const campaign = await Session.apiRequest(`/campaigns/${campaignId}`);
    currentCampaign = campaign;

    // Auto-set association from campaign
    if (campaign.association) {
      selectedAssociationId = campaign.association._id || campaign.association;
    }

    // Show campaign label
    const labelEl = document.getElementById('campaign-label');
    const labelText = document.getElementById('campaign-label-text');
    if (labelEl && labelText) {
      labelText.textContent = `Campaign: ${campaign.name} — ${campaign.benefit}`;
      labelEl.style.display = '';
    }

    // Show voucher legend
    const legendEl = document.getElementById('voucher-legend');
    if (legendEl) legendEl.style.display = '';

    // Generate dynamic quick-select buttons based on voucherCost
    generateQuickSelect(campaign.voucherCost);

  } catch (err) {
    console.error('Error loading campaign:', err);
  }
}

function generateQuickSelect(voucherCost) {
  const container = document.getElementById('quick-select');
  if (!container) return;

  const presets = [2, 10, 20, 100];
  container.innerHTML = presets.map(count => {
    const amount = count * voucherCost;
    const formatted = amount.toLocaleString('en-US');
    return `<button class="px-5 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-bold hover:bg-secondary-container hover:text-on-secondary-container transition-colors" onclick="setQuickAmount(${amount})">$${formatted} (${count} Vouchers)</button>`;
  }).join('');
}

function setQuickAmount(val) {
  const input = document.getElementById('amount-input');
  if (input) {
    input.value = val;
    updatePreview(val);
    updateVoucherCount(val);
  }
}
window.setQuickAmount = setQuickAmount;

function updateVoucherCount(value) {
  const countEl = document.getElementById('voucher-count');
  if (!countEl || !currentCampaign) return;
  const amount = parseFloat(value) || 0;
  countEl.textContent = Math.floor(amount / currentCampaign.voucherCost);
}

// ==================== NON-CAMPAIGN MODE ====================

function setupStaticQuickSelect() {
  const container = document.getElementById('quick-select');
  if (!container) return;
  const amountInput = document.getElementById('amount-input');
  container.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim();
    const match = text.match(/^\$([0-9,]+)$/);
    if (match && amountInput) {
      btn.addEventListener('click', () => {
        amountInput.value = match[1].replace(/,/g, '');
        updatePreview(amountInput.value);
      });
    }
  });
}

function populateAssociations(associations) {
  let select = document.getElementById('association-select');
  if (!select) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-2';
    wrapper.innerHTML = `
      <label class="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">TARGET ASSOCIATION</label>
      <select id="association-select" class="w-full px-4 py-3 rounded-xl bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 text-on-surface">
        <option value="">Select an association...</option>
      </select>
    `;
    const spaceContainer = document.querySelector('.space-y-6');
    if (spaceContainer) {
      spaceContainer.insertBefore(wrapper, spaceContainer.firstChild);
    }
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

// ==================== SHARED ====================

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
  const amountInput = document.getElementById('amount-input');
  const amount = parseFloat(amountInput ? amountInput.value : 0);

  if (!selectedAssociationId) {
    showDonateMessage('Select an association', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showDonateMessage('Enter a valid amount', 'error');
    return;
  }

  if (selectedPaymentMethod === 'crypto') {
    if (typeof window.ethereum === 'undefined') {
      showDonateMessage('MetaMask not detected. Install the extension to pay with USDC.', 'error');
      return;
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch {
      showDonateMessage('Connect your wallet to pay with USDC', 'error');
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
        campaignId: selectedCampaignId || undefined,
      }),
    });
    if (result.status === 'completed') {
      showDonateMessage(`Donation successful! ID: ${result.txHash || result._id}`, 'success');
    } else {
      showDonateMessage(`Donation registered but status: ${result.status}. The blockchain transaction may be pending.`, 'error');
    }
    if (amountInput) amountInput.value = '';
    updateVoucherCount(0);
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
    const form = document.querySelector('.relative.z-10') || document.querySelector('main') || document.body;
    form.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = type === 'error' ? '#ba1a1a' : '#0a6c44';
  el.style.backgroundColor = type === 'error' ? '#ffdad6' : '#9ff5c1';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}
