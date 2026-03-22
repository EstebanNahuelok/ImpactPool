/**
 * ImpactoPool — Campaigns Script
 * Incluir en vouchers.html (campañas)
 * Carga campañas desde la API y renderiza cards con botón según rol.
 * Org puede crear, editar y eliminar campañas.
 */

let allCampaigns = [];

async function loadCampaigns() {
  try {
    allCampaigns = await Session.apiRequest('/campaigns');
    renderCampaigns(allCampaigns);
  } catch (err) {
    console.error('Error loading campaigns:', err);
    document.getElementById('campaigns-grid').innerHTML =
      '<div class="col-span-full text-center py-12 text-error">Error loading campaigns</div>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!Session.requireAuth()) return;

  // Cargar campañas
  await loadCampaigns();
  // Cargar stats del usuario
  loadUserImpact();

  // Filtros de categoría
  setupCategoryFilters();

  // Setup campaign form for org
  if (Session.isOrganization()) {
    setupCampaignForm();
  }
});

// Recargar campañas al volver con navegación back/forward (bfcache)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    loadCampaigns();
  }
});

function setupCategoryFilters() {
  const filtersContainer = document.getElementById('category-filters');
  if (!filtersContainer) return;

  filtersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;

    // Actualizar estilos activo/inactivo
    filtersContainer.querySelectorAll('[data-category]').forEach(b => {
      b.className = b.className
        .replace('bg-primary text-on-primary', 'bg-surface-container-low text-on-surface')
        .replace('font-semibold shadow-sm', 'font-medium');
    });
    // El botón urgente mantiene su estilo propio
    if (btn.dataset.category !== 'urgent') {
      btn.className = btn.className
        .replace('bg-surface-container-low text-on-surface', 'bg-primary text-on-primary')
        .replace('font-medium', 'font-semibold shadow-sm');
    }

    const category = btn.dataset.category;
    if (category === 'all') {
      renderCampaigns(allCampaigns);
    } else if (category === 'urgent') {
      renderCampaigns(allCampaigns.filter(c => c.urgent));
    } else {
      renderCampaigns(allCampaigns.filter(c => c.category === category));
    }
  });
}

function renderCampaigns(campaigns) {
  const grid = document.getElementById('campaigns-grid');
  if (!grid) return;

  const isOrg = Session.isOrganization();

  // Org: show a small "Create New Campaign" button above the grid
  const existingBtn = document.getElementById('create-campaign-btn');
  if (isOrg && !existingBtn) {
    const btn = document.createElement('button');
    btn.id = 'create-campaign-btn';
    btn.onclick = () => openCampaignModal();
    btn.className = 'mb-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-sm';
    btn.innerHTML = '<span class="material-symbols-outlined text-lg">add_circle</span> New Campaign';
    grid.parentNode.insertBefore(btn, grid);
  }

  if (campaigns.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-on-surface-variant">No campaigns available in this category.</div>';
    return;
  }

  const buttonText = isOrg ? 'Campaign Details' : 'Fund Campaign';

  const cardsHtml = campaigns.map(c => {
    const emitted = c.emittedVouchers || 0;
    const active = c.activeVouchers || 0;
    const total = c.totalVouchers || 0;
    const urgentBorder = c.urgent ? 'border-l-4 border-tertiary-container' : 'border border-outline-variant/30';
    const urgentLabel = c.urgent
      ? '<span class="text-xs font-black tracking-widest text-on-tertiary-container uppercase mb-1 block">URGENT</span>'
      : `<span class="text-xs font-black tracking-widest text-primary-fixed-variant uppercase mb-1 block">CAMPAIGN ID: #${c.code}</span>`;
    const statusBadge = c.urgent
      ? '<span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-tight">VALIDATED</span>'
      : '<span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-tight">ACTIVE</span>';

    const buttonAction = isOrg
      ? `onclick="window.location.href='dashboard.html?campaign=${c._id}'"`
      : `onclick="window.location.href='donar.html?campaign=${c._id}&association=${c.association?._id || ''}'"`; 

    // Org edit/delete buttons
    const orgActions = isOrg ? `
      <div class="flex gap-2 mt-3">
        <button onclick="event.stopPropagation(); openCampaignModal('${c._id}')" class="flex-1 py-2 rounded-lg bg-surface-container text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-sm">edit</span> Edit
        </button>
        <button onclick="event.stopPropagation(); confirmDeleteCampaign('${c._id}', '${c.name.replace(/'/g, "\\'")}')" class="flex-1 py-2 rounded-lg bg-error/10 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/20 transition-colors flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-sm">delete</span> Delete
        </button>
      </div>
    ` : '';

    // Sección de vouchers: datos reales de la API para ambos roles
    const emittedPercent = total > 0 ? Math.round((emitted / total) * 100) : 0;
    const voucherInfoSection = `
          <div class="mb-4 grid grid-cols-2 gap-3">
            <div class="p-3 bg-surface-container rounded-lg text-center">
              <span class="text-[10px] font-bold text-outline uppercase block mb-1">Issued</span>
              <span class="text-xl font-black text-primary">${emitted}</span>
              <span class="text-xs text-on-surface-variant"> / ${total}</span>
            </div>
            <div class="p-3 bg-surface-container rounded-lg text-center">
              <span class="text-[10px] font-bold text-outline uppercase block mb-1">Active</span>
              <span class="text-xl font-black text-secondary">${active}</span>
            </div>
          </div>
          <div class="mb-8">
            <div class="flex justify-between text-sm font-bold mb-2">
              <span class="text-primary">${emitted} of ${total} Vouchers issued</span>
              <span class="text-outline">${emittedPercent}%</span>
            </div>
            <div class="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary shadow-[0_0_8px_rgba(10,108,68,0.3)]" style="width: ${emittedPercent}%"></div>
            </div>
          </div>`;

    return `
      <div class="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between transition-all hover:translate-y-[-4px] ${urgentBorder} shadow-sm">
        <div>
          <div class="flex justify-between items-start mb-6">
            <div>
              ${urgentLabel}
              <h3 class="text-2xl font-bold text-primary">${c.name}</h3>
            </div>
            ${statusBadge}
          </div>
          <div class="mb-4">
            <p class="text-xs font-bold text-outline uppercase mb-1">Good / Benefit</p>
            <p class="text-on-surface-variant font-medium text-lg">${c.benefit}</p>
          </div>
          <div class="flex items-center gap-2 text-sm text-outline mb-6">
            <span class="material-symbols-outlined text-base">${c.icon || 'verified'}</span>
            <span>NGO: ${c.association?.name || 'No association'}</span>
          </div>
          <div class="mb-4 p-4 bg-surface-container rounded-lg flex justify-between items-center">
            <span class="text-sm font-bold text-primary">Individual Cost</span>
            <span class="text-lg font-black text-secondary">${c.voucherCost} USDC <span class="text-xs font-medium">/ Voucher</span></span>
          </div>
          ${voucherInfoSection}
        </div>
        <button ${buttonAction} class="w-full py-4 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-container transition-all active:scale-95 shadow-md">
          ${buttonText}
        </button>
        ${orgActions}
      </div>
    `;
  }).join('');

  grid.innerHTML = cardsHtml;
}

// ==================== CAMPAIGN CRUD (ORG) ====================

function setupCampaignForm() {
  const form = document.getElementById('campaign-form');
  if (form) {
    form.addEventListener('submit', handleCampaignSubmit);
  }
}

function openCampaignModal(editId) {
  const modal = document.getElementById('campaign-modal');
  if (!modal) return;

  const title = document.getElementById('campaign-modal-title');
  const submitBtn = document.getElementById('campaign-submit');
  const codeInput = document.getElementById('campaign-code');
  const editIdInput = document.getElementById('campaign-edit-id');
  document.getElementById('campaign-error').classList.add('hidden');

  // Reset form
  document.getElementById('campaign-form').reset();
  editIdInput.value = '';

  if (editId) {
    // Edit mode: fill with existing data
    const campaign = allCampaigns.find(c => c._id === editId);
    if (!campaign) return;

    title.textContent = 'Edit Campaign';
    submitBtn.textContent = 'SAVE CHANGES';
    editIdInput.value = editId;
    codeInput.value = campaign.code;
    codeInput.readOnly = true;
    codeInput.classList.add('bg-surface-container-low', 'cursor-not-allowed');
    document.getElementById('campaign-name').value = campaign.name;
    document.getElementById('campaign-description').value = campaign.description || '';
    document.getElementById('campaign-category').value = campaign.category || 'otro';
    document.getElementById('campaign-status').value = campaign.status || 'active';
    document.getElementById('campaign-benefit').value = campaign.benefit;
    document.getElementById('campaign-voucherCost').value = campaign.voucherCost;
    document.getElementById('campaign-totalVouchers').value = campaign.totalVouchers;
    document.getElementById('campaign-urgent').checked = campaign.urgent || false;
  } else {
    // Create mode
    title.textContent = 'New Campaign';
    submitBtn.textContent = 'CREATE CAMPAIGN';
    codeInput.readOnly = false;
    codeInput.classList.remove('bg-surface-container-low', 'cursor-not-allowed');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCampaignModal() {
  const modal = document.getElementById('campaign-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleCampaignSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('campaign-error');
  const submitBtn = document.getElementById('campaign-submit');
  errorEl.classList.add('hidden');

  const editId = document.getElementById('campaign-edit-id').value;
  const isEdit = !!editId;

  const body = {
    code: document.getElementById('campaign-code').value.trim(),
    name: document.getElementById('campaign-name').value.trim(),
    description: document.getElementById('campaign-description').value.trim(),
    category: document.getElementById('campaign-category').value,
    status: document.getElementById('campaign-status').value,
    benefit: document.getElementById('campaign-benefit').value.trim(),
    voucherCost: parseFloat(document.getElementById('campaign-voucherCost').value),
    totalVouchers: parseInt(document.getElementById('campaign-totalVouchers').value),
    urgent: document.getElementById('campaign-urgent').checked,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? 'SAVING...' : 'CREATING...';

  try {
    const url = isEdit ? `/campaigns/${editId}` : '/campaigns';
    const method = isEdit ? 'PUT' : 'POST';

    await Session.apiRequest(url, {
      method,
      body: JSON.stringify(body),
    });

    closeCampaignModal();
    await loadCampaigns();
  } catch (err) {
    errorEl.textContent = err.message || 'Error saving campaign';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'SAVE CHANGES' : 'CREATE CAMPAIGN';
  }
}

// ==================== DELETE CAMPAIGN ====================

let pendingDeleteId = null;

function confirmDeleteCampaign(campaignId, campaignName) {
  pendingDeleteId = campaignId;
  const modal = document.getElementById('delete-campaign-modal');
  const msg = document.getElementById('delete-campaign-msg');
  const confirmBtn = document.getElementById('delete-campaign-confirm');

  if (msg) msg.innerHTML = `Are you sure you want to delete <strong class="text-primary">${campaignName}</strong>? This action cannot be undone.`;

  if (confirmBtn) {
    confirmBtn.onclick = () => deleteCampaign();
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-campaign-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  pendingDeleteId = null;
}

async function deleteCampaign() {
  if (!pendingDeleteId) return;

  const confirmBtn = document.getElementById('delete-campaign-confirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting...';

  try {
    await Session.apiRequest(`/campaigns/${pendingDeleteId}`, { method: 'DELETE' });
    closeDeleteModal();
    await loadCampaigns();
  } catch (err) {
    alert(err.message || 'Error deleting campaign');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete';
  }
}

// ==================== USER IMPACT ====================

async function loadUserImpact() {
  try {
    const donations = await Session.apiRequest('/donations/donor/me');
    const completed = donations.filter(d => d.status === 'completed');
    const totalDonated = completed.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const voucherCount = completed.length;

    const totalEl = document.getElementById('user-total-donated');
    const countEl = document.getElementById('user-voucher-count');
    const msgEl = document.getElementById('user-impact-msg');

    if (totalEl) totalEl.innerHTML = `${totalDonated.toFixed(0)} <span class="text-xs font-normal">USDC</span>`;
    if (countEl) countEl.textContent = voucherCount;
    if (msgEl && voucherCount > 0) {
      msgEl.textContent = `You have contributed to ${voucherCount} donations.`;
    }
  } catch (err) {
    // Silencioso si falla (org no tiene /donor/me)
  }
}
