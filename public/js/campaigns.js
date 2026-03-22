/**
 * ImpactoPool — Campaigns Script
 * Incluir en vouchers.html (campañas)
 * Carga campañas desde la API y renderiza cards con botón según rol.
 */

let allCampaigns = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Session.requireAuth()) return;

  // Cargar campañas
  try {
    allCampaigns = await Session.apiRequest('/campaigns');
    renderCampaigns(allCampaigns);
  } catch (err) {
    console.error('Error cargando campañas:', err);
    document.getElementById('campaigns-grid').innerHTML =
      '<div class="col-span-full text-center py-12 text-error">Error cargando campañas</div>';
  }

  // Cargar stats del usuario
  loadUserImpact();

  // Filtros de categoría
  setupCategoryFilters();
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

  if (campaigns.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-on-surface-variant">No hay campañas disponibles en esta categoría.</div>';
    return;
  }

  const isOrg = Session.isOrganization();
  const buttonText = isOrg ? 'Detalle de la campaña' : 'Financiar campaña';

  grid.innerHTML = campaigns.map(c => {
    const percent = c.fundedPercent || 0;
    const urgentBorder = c.urgent ? 'border-l-4 border-tertiary-container' : 'border border-outline-variant/30';
    const urgentLabel = c.urgent
      ? '<span class="text-xs font-black tracking-widest text-on-tertiary-container uppercase mb-1 block">URGENTE</span>'
      : `<span class="text-xs font-black tracking-widest text-primary-fixed-variant uppercase mb-1 block">CAMPAÑA ID: #${c.code}</span>`;
    const statusBadge = c.urgent
      ? '<span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-tight">VALIDADO</span>'
      : '<span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-tight">ACTIVA</span>';

    const buttonAction = isOrg
      ? `onclick="window.location.href='dashboard.html?campaign=${c._id}'"`
      : `onclick="window.location.href='donar.html?campaign=${c._id}&association=${c.association?._id || ''}'"`; 

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
            <p class="text-xs font-bold text-outline uppercase mb-1">Bien / Beneficio</p>
            <p class="text-on-surface-variant font-medium text-lg">${c.benefit}</p>
          </div>
          <div class="flex items-center gap-2 text-sm text-outline mb-6">
            <span class="material-symbols-outlined text-base">${c.icon || 'verified'}</span>
            <span>ONG: ${c.association?.name || 'Sin asociación'}</span>
          </div>
          <div class="mb-4 p-4 bg-surface-container rounded-lg flex justify-between items-center">
            <span class="text-sm font-bold text-primary">Costo Individual</span>
            <span class="text-lg font-black text-secondary">${c.voucherCost} USDC <span class="text-xs font-medium">/ Voucher</span></span>
          </div>
          <div class="mb-8">
            <div class="flex justify-between text-sm font-bold mb-2">
              <span class="text-primary">${c.fundedVouchers} de ${c.totalVouchers} Vouchers financiados</span>
              <span class="text-outline">${percent}%</span>
            </div>
            <div class="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary shadow-[0_0_8px_rgba(10,108,68,0.3)]" style="width: ${percent}%"></div>
            </div>
          </div>
        </div>
        <button ${buttonAction} class="w-full py-4 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-container transition-all active:scale-95 shadow-md">
          ${buttonText}
        </button>
      </div>
    `;
  }).join('');
}

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
      msgEl.textContent = `Has contribuido a ${voucherCount} donaciones.`;
    }
  } catch (err) {
    // Silencioso si falla (org no tiene /donor/me)
  }
}
