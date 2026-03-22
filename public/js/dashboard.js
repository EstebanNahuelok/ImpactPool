/**
 * ImpactoPool — Dashboard Script
 * Incluir en dashboard.html
 * Solo accesible por organizaciones.
 * Si llega con ?campaign=ID, muestra vouchers de esa campaña + botón emitir.
 * Si no, muestra vista general con donaciones recibidas.
 */

let currentCampaignId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Session.requireAuth()) return;

  // Dashboard solo para organizaciones
  if (!Session.isOrganization()) {
    window.location.href = 'donar.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  currentCampaignId = params.get('campaign');

  // Setup modal
  setupModal();

  if (currentCampaignId) {
    await loadCampaignView(currentCampaignId);
  } else {
    await loadOrgView();
  }
});

// ==================== MODAL ====================

function setupModal() {
  const modal = document.getElementById('voucher-modal');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('voucher-form');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }
  if (form) {
    form.addEventListener('submit', handleVoucherSubmit);
  }
}

function openModal() {
  const modal = document.getElementById('voucher-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('voucher-dni').value = '';
    document.getElementById('voucher-name').value = '';
    document.getElementById('voucher-error').classList.add('hidden');
  }
}

async function handleVoucherSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('voucher-error');
  const submitBtn = document.getElementById('voucher-submit');
  errorEl.classList.add('hidden');

  const dni = document.getElementById('voucher-dni').value.trim();
  const beneficiaryName = document.getElementById('voucher-name').value.trim();

  if (!dni || !beneficiaryName) {
    errorEl.textContent = 'All fields are required';
    errorEl.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'ISSUING...';

  try {
    const voucher = await Session.apiRequest('/vouchers', {
      method: 'POST',
      body: JSON.stringify({ campaignId: currentCampaignId, dni, beneficiaryName }),
    });
    console.log('Voucher creado:', voucher.code);

    // Cerrar modal y recargar vouchers
    document.getElementById('voucher-modal').classList.add('hidden');
  } catch (err) {
    errorEl.textContent = err.message || 'Error issuing voucher';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ISSUE VOUCHER';
  }

  // Siempre recargar datos de la campaña después del intento
  try {
    await loadCampaignView(currentCampaignId);
  } catch (err) {
    console.error('Error reloading campaign view:', err);
  }
}

// ==================== VISTA CAMPAÑA ====================

async function loadCampaignView(campaignId) {
  try {
    const [campaign, vouchers, donations] = await Promise.all([
      Session.apiRequest(`/campaigns/${campaignId}`),
      Session.apiRequest(`/vouchers?campaign=${campaignId}`),
      Session.apiRequest(`/campaigns/${campaignId}/donations`),
    ]);
    renderCampaignDashboard(campaign, vouchers, donations);
  } catch (err) {
    console.error('Error loading campaign:', err);
  }
}

function renderCampaignDashboard(campaign, vouchers, donations = []) {
  // Header
  const header = document.querySelector('header');
  if (header) {
    const h2 = header.querySelector('h2');
    const p = header.querySelector('p');
    if (h2) h2.textContent = campaign.name;
    if (p) p.textContent = `Campaign #${campaign.code} — ${campaign.benefit}`;
  }

  // Stats
  const activeVouchers = vouchers.filter(v => v.status === 'active');
  const completedDonations = donations.filter(d => d.status === 'completed');
  const totalDonated = completedDonations.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const assocReceived = completedDonations.reduce((sum, d) => sum + (d.associationAmount || 0), 0);
  const suggestedVouchers = campaign.voucherCost > 0 ? Math.floor(assocReceived / campaign.voucherCost) : 0;

  document.getElementById('stat-label-1').textContent = 'DONATIONS RECEIVED';
  document.getElementById('stat-value-1').textContent = `$${totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-label-2').textContent = 'VOUCHERS ISSUED';
  document.getElementById('stat-value-2').textContent = `${vouchers.length} / ${campaign.totalVouchers}`;
  document.getElementById('stat-label-3').textContent = 'ACTIVE VOUCHERS';
  document.getElementById('stat-value-3').textContent = activeVouchers.length;

  // Donation info panel
  let donationPanel = document.getElementById('donation-info-panel');
  if (!donationPanel) {
    donationPanel = document.createElement('div');
    donationPanel.id = 'donation-info-panel';
    const statsSection = document.getElementById('stats-overview');
    if (statsSection) {
      statsSection.parentNode.insertBefore(donationPanel, statsSection.nextSibling);
    } else {
      const grid = document.getElementById('vouchers-grid');
      if (grid) grid.parentNode.insertBefore(donationPanel, grid);
    }
  }
  donationPanel.className = 'mt-6 mb-6 p-6 bg-surface-container-low rounded-2xl';
  donationPanel.innerHTML = `
    <div class="flex flex-wrap items-center gap-6">
      <div>
        <span class="text-[10px] font-bold text-outline uppercase block mb-1">TOTAL DONATED</span>
        <span class="text-2xl font-black text-secondary">$${totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-outline uppercase block mb-1">AVAILABLE FOR VOUCHERS (70%)</span>
        <span class="text-2xl font-black text-primary">$${assocReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-outline uppercase block mb-1">SUGGESTED VOUCHERS</span>
        <span class="text-2xl font-black text-on-tertiary-container">${suggestedVouchers}</span>
        <span class="text-xs text-on-surface-variant"> ($${campaign.voucherCost}/each)</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-outline uppercase block mb-1">ALREADY ISSUED</span>
        <span class="text-2xl font-black text-primary">${vouchers.length}</span>
      </div>
    </div>
  `;

  // Preview amount en modal
  const amountPreview = document.getElementById('voucher-amount-preview');
  if (amountPreview) amountPreview.textContent = `$${campaign.voucherCost}`;

  // Voucher grid
  const grid = document.getElementById('vouchers-grid');
  grid.innerHTML = '';

  vouchers.forEach(v => {
    const statusConfig = {
      active: { label: 'Active', bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
      redeemed: { label: 'Redeemed', bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' },
      expired: { label: 'Expired', bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant' },
      cancelled: { label: 'Cancelled', bg: 'bg-error-container', text: 'text-on-error-container' },
    };
    const st = statusConfig[v.status] || statusConfig.active;
    const date = new Date(v.createdAt).toLocaleDateString('es-AR');

    const cancelBtn = v.status === 'active'
      ? `<button onclick="confirmCancelVoucher('${v._id}', '${v.code}')" class="mt-3 w-full py-2 rounded-lg bg-error/10 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/20 transition-colors">Cancel Voucher</button>`
      : '';

    const card = document.createElement('div');
    card.className = `group relative bg-surface-container-lowest rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-4px] ${v.status !== 'active' ? 'opacity-75' : ''}`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div class="flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">SERIAL NUMBER</span>
          <code class="text-lg font-bold text-primary tracking-widest">${v.code}</code>
        </div>
        <span class="px-3 py-1 ${st.bg} ${st.text} text-[10px] font-black rounded-full tracking-widest uppercase">${st.label}</span>
      </div>
      <div class="flex flex-col gap-3 mb-4">
        <div>
          <span class="text-[10px] font-bold text-outline uppercase block">BENEFICIARY</span>
          <span class="text-sm font-semibold">${v.beneficiary?.name || '—'}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-outline uppercase block">DNI</span>
          <span class="text-sm font-mono">${v.beneficiary?.dni || '—'}</span>
        </div>
        <div class="flex justify-between">
          <div>
            <span class="text-[10px] font-bold text-outline uppercase block">AMOUNT</span>
            <span class="text-sm font-black text-secondary">$${(v.amount || 0).toFixed(2)}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] font-bold text-outline uppercase block">ISSUED</span>
            <span class="text-sm">${date}</span>
          </div>
        </div>
      </div>
      ${cancelBtn}
    `;
    grid.appendChild(card);
  });

  // Botón "Emitir Nuevo Voucher"
  const addCard = document.createElement('div');
  addCard.className = 'group relative bg-surface-container-high rounded-2xl p-6 border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-highest transition-all';
  addCard.innerHTML = `
    <div class="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
      <span class="material-symbols-outlined text-3xl text-primary">add_circle</span>
    </div>
    <h3 class="text-lg font-bold text-primary">Issue New Voucher</h3>
    <p class="text-xs text-on-surface-variant mt-2 max-w-[180px]">Assign a voucher to a beneficiary of this campaign</p>
  `;
  addCard.addEventListener('click', openModal);
  grid.appendChild(addCard);

  // Tabla con listado de vouchers
  document.getElementById('table-title').innerHTML = '<span class="material-symbols-outlined">receipt_long</span> Vouchers Issued';
  const tbody = document.getElementById('activity-tbody');
  tbody.innerHTML = '';

  if (vouchers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center text-on-surface-variant">This campaign has no issued vouchers yet</td></tr>';
  } else {
    vouchers.forEach(v => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-surface-container-lowest transition-colors border-t border-surface-variant/10';
      const stClass = v.status === 'active' ? 'text-secondary' : v.status === 'redeemed' ? 'text-primary' : v.status === 'cancelled' ? 'text-error' : 'text-error';
      const stLabel = v.status === 'active' ? 'ACTIVE' : v.status === 'redeemed' ? 'REDEEMED' : v.status === 'cancelled' ? 'CANCELLED' : 'EXPIRED';
      const cancelAction = v.status === 'active'
        ? `<button onclick="confirmCancelVoucher('${v._id}', '${v.code}')" class="ml-3 text-[10px] font-bold text-error hover:underline">CANCEL</button>`
        : '';
      row.innerHTML = `
        <td class="px-8 py-5 font-mono text-xs">${v.code}</td>
        <td class="px-8 py-5 font-bold">${v.beneficiary?.name || '—'}</td>
        <td class="px-8 py-5 font-mono text-sm">${v.beneficiary?.dni || '—'}</td>
        <td class="px-8 py-5 font-black text-secondary">$${(v.amount || 0).toFixed(2)}</td>
        <td class="px-8 py-5 text-right"><span class="text-[10px] font-black uppercase ${stClass}">${stLabel}</span>${cancelAction}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Botón volver
  const main = document.querySelector('main');
  if (main && !document.getElementById('back-btn')) {
    const backBtn = document.createElement('div');
    backBtn.id = 'back-btn';
    backBtn.className = 'mb-6';
    backBtn.innerHTML = `<a href="vouchers.html" class="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"><span class="material-symbols-outlined text-sm">arrow_back</span> Back to Campaigns</a>`;
    main.insertBefore(backBtn, main.firstChild);
  }
}

// ==================== VISTA GENERAL ORG ====================

async function loadOrgView() {
  try {
    const donations = await Session.apiRequest('/donations/org/me');
    renderOrgDashboard(donations);
  } catch (err) {
    console.error('Error loading org donations:', err);
  }
}

function renderOrgDashboard(donations) {
  const completedDonations = donations.filter(d => d.status === 'completed');
  const totalReceived = completedDonations.reduce((sum, d) => sum + (d.associationAmount || 0), 0);

  document.getElementById('stat-label-1').textContent = 'TOTAL RECEIVED VALUE';
  document.getElementById('stat-value-1').textContent = `$${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-label-2').textContent = 'DONATIONS RECEIVED';
  document.getElementById('stat-value-2').textContent = completedDonations.length.toLocaleString();
  document.getElementById('stat-label-3').textContent = 'TOTAL DONATIONS';
  document.getElementById('stat-value-3').textContent = donations.length;

  // Ocultar grid de vouchers en vista general
  document.getElementById('vouchers-grid').classList.add('hidden');

  // Tabla de donaciones
  const thead = document.querySelector('table thead tr');
  if (thead) {
    thead.innerHTML = `
      <th class="px-8 py-4">ID</th>
      <th class="px-8 py-4">DONOR</th>
      <th class="px-8 py-4">AMOUNT</th>
      <th class="px-8 py-4">METHOD</th>
      <th class="px-8 py-4 text-right">STATUS</th>
    `;
  }

  document.getElementById('table-title').innerHTML = '<span class="material-symbols-outlined">history</span> Donations Received';
  const tbody = document.getElementById('activity-tbody');
  tbody.innerHTML = '';

  if (donations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center text-on-surface-variant">You haven\'t received any donations yet</td></tr>';
    return;
  }

  donations.forEach(d => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-surface-container-lowest transition-colors border-t border-surface-variant/10';
    row.innerHTML = `
      <td class="px-8 py-5 font-mono text-xs text-on-surface-variant">#${(d._id || '').slice(-8)}</td>
      <td class="px-8 py-5 font-bold">${d.donor?.name || 'Anonymous donor'}</td>
      <td class="px-8 py-5 font-black text-secondary">$${(d.totalAmount || 0).toFixed(2)}</td>
      <td class="px-8 py-5 text-on-surface-variant">${d.paymentMethod === 'crypto' ? 'USDC' : 'USD'}</td>
      <td class="px-8 py-5 text-right">
        <span class="text-[10px] font-black uppercase ${d.status === 'completed' ? 'text-secondary' : d.status === 'failed' ? 'text-error' : 'text-on-surface-variant'}">${d.status === 'completed' ? 'VERIFIED' : d.status === 'failed' ? 'FAILED' : 'PENDING'}</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== CANCEL VOUCHER ====================

function confirmCancelVoucher(voucherId, voucherCode) {
  // Create confirmation modal dynamically
  let modal = document.getElementById('cancel-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cancel-modal';
    document.body.appendChild(modal);
  }

  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
      <div class="flex items-center gap-3 mb-4">
        <span class="material-symbols-outlined text-error text-3xl">warning</span>
        <h3 class="text-xl font-bold text-primary">Cancel Voucher</h3>
      </div>
      <p class="text-on-surface-variant mb-2">Are you sure you want to cancel voucher <strong class="text-primary font-mono">${voucherCode}</strong>?</p>
      <p class="text-xs text-error mb-6">This action cannot be undone.</p>
      <div class="flex gap-3">
        <button id="cancel-modal-dismiss" class="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-colors">No, Keep It</button>
        <button id="cancel-modal-confirm" class="flex-1 py-3 rounded-lg bg-error text-on-error font-bold hover:bg-error/90 transition-colors">Yes, Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('cancel-modal-dismiss').addEventListener('click', () => {
    modal.remove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.getElementById('cancel-modal-confirm').addEventListener('click', async () => {
    await cancelVoucher(voucherId);
    modal.remove();
  });
}

async function cancelVoucher(voucherId) {
  try {
    await Session.apiRequest(`/vouchers/${voucherId}/cancel`, { method: 'PATCH' });
    await loadCampaignView(currentCampaignId);
  } catch (err) {
    console.error('Error cancelling voucher:', err);
    alert(err.message || 'Error cancelling voucher');
  }
}
