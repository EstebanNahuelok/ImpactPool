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
    errorEl.textContent = 'Todos los campos son obligatorios';
    errorEl.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'EMITIENDO...';

  try {
    const voucher = await Session.apiRequest('/vouchers', {
      method: 'POST',
      body: JSON.stringify({ campaignId: currentCampaignId, dni, beneficiaryName }),
    });

    // Cerrar modal y recargar vouchers
    document.getElementById('voucher-modal').classList.add('hidden');
    await loadCampaignView(currentCampaignId);
  } catch (err) {
    errorEl.textContent = err.message || 'Error al emitir voucher';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'EMITIR VOUCHER';
  }
}

// ==================== VISTA CAMPAÑA ====================

async function loadCampaignView(campaignId) {
  try {
    const [campaign, vouchers] = await Promise.all([
      Session.apiRequest(`/campaigns/${campaignId}`),
      Session.apiRequest(`/vouchers?campaign=${campaignId}`),
    ]);
    renderCampaignDashboard(campaign, vouchers);
  } catch (err) {
    console.error('Error cargando campaña:', err);
  }
}

function renderCampaignDashboard(campaign, vouchers) {
  // Header
  const header = document.querySelector('header');
  if (header) {
    const h2 = header.querySelector('h2');
    const p = header.querySelector('p');
    if (h2) h2.textContent = campaign.name;
    if (p) p.textContent = `Campaña #${campaign.code} — ${campaign.benefit}`;
  }

  // Stats
  const activeVouchers = vouchers.filter(v => v.status === 'active');
  const totalAmount = vouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

  document.getElementById('stat-label-1').textContent = 'VALOR TOTAL EMITIDO';
  document.getElementById('stat-value-1').textContent = `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-label-2').textContent = 'VOUCHERS EMITIDOS';
  document.getElementById('stat-value-2').textContent = `${vouchers.length} / ${campaign.totalVouchers}`;
  document.getElementById('stat-label-3').textContent = 'VOUCHERS ACTIVOS';
  document.getElementById('stat-value-3').textContent = activeVouchers.length;

  // Preview amount en modal
  const amountPreview = document.getElementById('voucher-amount-preview');
  if (amountPreview) amountPreview.textContent = `$${campaign.voucherCost}`;

  // Voucher grid
  const grid = document.getElementById('vouchers-grid');
  grid.innerHTML = '';

  vouchers.forEach(v => {
    const statusConfig = {
      active: { label: 'Activo', bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
      redeemed: { label: 'Canjeado', bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' },
      expired: { label: 'Vencido', bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant' },
    };
    const st = statusConfig[v.status] || statusConfig.active;
    const date = new Date(v.createdAt).toLocaleDateString('es-AR');

    const card = document.createElement('div');
    card.className = `group relative bg-surface-container-lowest rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-4px] ${v.status !== 'active' ? 'opacity-75' : ''}`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div class="flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">NÚMERO DE SERIE</span>
          <code class="text-lg font-bold text-primary tracking-widest">${v.code}</code>
        </div>
        <span class="px-3 py-1 ${st.bg} ${st.text} text-[10px] font-black rounded-full tracking-widest uppercase">${st.label}</span>
      </div>
      <div class="flex flex-col gap-3 mb-4">
        <div>
          <span class="text-[10px] font-bold text-outline uppercase block">BENEFICIARIO</span>
          <span class="text-sm font-semibold">${v.beneficiary?.name || '—'}</span>
        </div>
        <div>
          <span class="text-[10px] font-bold text-outline uppercase block">DNI</span>
          <span class="text-sm font-mono">${v.beneficiary?.dni || '—'}</span>
        </div>
        <div class="flex justify-between">
          <div>
            <span class="text-[10px] font-bold text-outline uppercase block">MONTO</span>
            <span class="text-sm font-black text-secondary">$${(v.amount || 0).toFixed(2)}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] font-bold text-outline uppercase block">EMITIDO</span>
            <span class="text-sm">${date}</span>
          </div>
        </div>
      </div>
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
    <h3 class="text-lg font-bold text-primary">Emitir Nuevo Voucher</h3>
    <p class="text-xs text-on-surface-variant mt-2 max-w-[180px]">Asignar un voucher a un beneficiario de esta campaña</p>
  `;
  addCard.addEventListener('click', openModal);
  grid.appendChild(addCard);

  // Tabla con listado de vouchers
  document.getElementById('table-title').innerHTML = '<span class="material-symbols-outlined">receipt_long</span> Vouchers Emitidos';
  const tbody = document.getElementById('activity-tbody');
  tbody.innerHTML = '';

  if (vouchers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center text-on-surface-variant">Esta campaña aún no tiene vouchers emitidos</td></tr>';
  } else {
    vouchers.forEach(v => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-surface-container-lowest transition-colors border-t border-surface-variant/10';
      const stClass = v.status === 'active' ? 'text-secondary' : v.status === 'redeemed' ? 'text-primary' : 'text-error';
      const stLabel = v.status === 'active' ? 'ACTIVO' : v.status === 'redeemed' ? 'CANJEADO' : 'VENCIDO';
      row.innerHTML = `
        <td class="px-8 py-5 font-mono text-xs">${v.code}</td>
        <td class="px-8 py-5 font-bold">${v.beneficiary?.name || '—'}</td>
        <td class="px-8 py-5 font-mono text-sm">${v.beneficiary?.dni || '—'}</td>
        <td class="px-8 py-5 font-black text-secondary">$${(v.amount || 0).toFixed(2)}</td>
        <td class="px-8 py-5 text-right"><span class="text-[10px] font-black uppercase ${stClass}">${stLabel}</span></td>
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
    backBtn.innerHTML = `<a href="vouchers.html" class="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"><span class="material-symbols-outlined text-sm">arrow_back</span> Volver a Campañas</a>`;
    main.insertBefore(backBtn, main.firstChild);
  }
}

// ==================== VISTA GENERAL ORG ====================

async function loadOrgView() {
  try {
    const donations = await Session.apiRequest('/donations/org/me');
    renderOrgDashboard(donations);
  } catch (err) {
    console.error('Error cargando donaciones de org:', err);
  }
}

function renderOrgDashboard(donations) {
  const completedDonations = donations.filter(d => d.status === 'completed');
  const totalReceived = completedDonations.reduce((sum, d) => sum + (d.associationAmount || 0), 0);

  document.getElementById('stat-label-1').textContent = 'VALOR TOTAL RECIBIDO';
  document.getElementById('stat-value-1').textContent = `$${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-label-2').textContent = 'DONACIONES RECIBIDAS';
  document.getElementById('stat-value-2').textContent = completedDonations.length.toLocaleString();
  document.getElementById('stat-label-3').textContent = 'TOTAL DONACIONES';
  document.getElementById('stat-value-3').textContent = donations.length;

  // Ocultar grid de vouchers en vista general
  document.getElementById('vouchers-grid').classList.add('hidden');

  // Tabla de donaciones
  const thead = document.querySelector('table thead tr');
  if (thead) {
    thead.innerHTML = `
      <th class="px-8 py-4">ID</th>
      <th class="px-8 py-4">DONANTE</th>
      <th class="px-8 py-4">MONTO</th>
      <th class="px-8 py-4">MÉTODO</th>
      <th class="px-8 py-4 text-right">ESTADO</th>
    `;
  }

  document.getElementById('table-title').innerHTML = '<span class="material-symbols-outlined">history</span> Donaciones Recibidas';
  const tbody = document.getElementById('activity-tbody');
  tbody.innerHTML = '';

  if (donations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center text-on-surface-variant">Aún no has recibido donaciones</td></tr>';
    return;
  }

  donations.forEach(d => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-surface-container-lowest transition-colors border-t border-surface-variant/10';
    row.innerHTML = `
      <td class="px-8 py-5 font-mono text-xs text-on-surface-variant">#${(d._id || '').slice(-8)}</td>
      <td class="px-8 py-5 font-bold">${d.donor?.name || 'Donante anónimo'}</td>
      <td class="px-8 py-5 font-black text-secondary">$${(d.totalAmount || 0).toFixed(2)}</td>
      <td class="px-8 py-5 text-on-surface-variant">${d.paymentMethod === 'crypto' ? 'USDC' : 'USD'}</td>
      <td class="px-8 py-5 text-right">
        <span class="text-[10px] font-black uppercase ${d.status === 'completed' ? 'text-secondary' : d.status === 'failed' ? 'text-error' : 'text-on-surface-variant'}">${d.status === 'completed' ? 'VERIFICADO' : d.status === 'failed' ? 'FALLIDO' : 'PENDIENTE'}</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}
