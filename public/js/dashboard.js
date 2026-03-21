/**
 * ImpactoPool — Dashboard Script
 * Incluir en dashboard.html
 * Si es organización: muestra donaciones recibidas.
 * Si es donor: muestra stats personales y donaciones enviadas.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Session.requireAuth()) return;

  const isOrg = Session.isOrganization();

  if (isOrg) {
    // === ORGANIZACIÓN: Cargar donaciones recibidas ===
    try {
      const donations = await Session.apiRequest('/donations/org/me');
      updateOrgDashboard(donations);
    } catch (err) {
      console.error('Error cargando donaciones de org:', err);
    }
  } else {
    // === DONADOR: Cargar stats y donaciones enviadas ===
    try {
      const stats = await Session.apiRequest('/stats');
      updateStatsUI(stats);
    } catch (err) {
      console.error('Error cargando stats:', err);
    }

    try {
      const donations = await Session.apiRequest('/donations/donor/me');
      updateDonationsUI(donations);
    } catch (err) {
      console.error('Error cargando donaciones:', err);
    }

    try {
      const rewards = await Session.apiRequest('/rewards/me');
      updateRewardsUI(rewards);
    } catch (err) {
      console.error('Error cargando rewards:', err);
    }
  }
});

/** Organización: Mostrar donaciones recibidas en la tabla y actualizar totales */
function updateOrgDashboard(donations) {
  const completedDonations = donations.filter(d => d.status === 'completed');
  const totalReceived = completedDonations.reduce((sum, d) => sum + (d.associationAmount || 0), 0);
  const totalDonations = completedDonations.length;

  // Actualizar valores grandes en el dashboard
  const bigNumbers = document.querySelectorAll('.text-5xl, .text-4xl');
  bigNumbers.forEach(el => {
    if (el.textContent.includes('$142,850') || el.textContent.includes('$')) {
      const parent = el.closest('[class*="col-span"]');
      if (parent && parent.querySelector('[class*="uppercase"]')) {
        const label = parent.querySelector('[class*="uppercase"]');
        if (label && label.textContent.includes('IMPACTO')) {
          el.textContent = `$${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
      }
    }
  });

  // Actualizar contadores
  const counterEls = document.querySelectorAll('.text-3xl');
  counterEls.forEach(el => {
    if (el.textContent.includes('1,204') || el.textContent.match(/^\d/)) {
      const parent = el.closest('[class*="col-span"]');
      if (parent && parent.textContent.includes('VOUCHERS')) {
        el.textContent = totalDonations.toLocaleString();
      }
    }
  });

  // Actualizar tabla con donaciones recibidas
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

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

function updateStatsUI(stats) {
  const statEls = document.querySelectorAll('[data-stat]');
  statEls.forEach(el => {
    const key = el.dataset.stat;
    if (stats[key] !== undefined) {
      if (typeof stats[key] === 'number') {
        el.textContent = key.includes('otal') && key.includes('onated')
          ? `$${stats[key].toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : stats[key].toLocaleString();
      } else {
        el.textContent = stats[key];
      }
    }
  });

  const bigNumbers = document.querySelectorAll('.text-5xl, .text-4xl');
  bigNumbers.forEach(el => {
    if (el.textContent.includes('$142,850')) {
      el.textContent = `$${(stats.totalDonated || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    if (el.textContent.includes('1,204')) {
      el.textContent = (stats.totalDonations || 0).toLocaleString();
    }
  });
}

function updateDonationsUI(donations) {
  const tbody = document.querySelector('table tbody');
  if (!tbody || donations.length === 0) return;

  tbody.innerHTML = '';
  donations.forEach(d => {
    const row = document.createElement('tr');
    row.className = 'border-b border-outline-variant/10';
    row.innerHTML = `
      <td class="p-4 text-sm font-mono">${d._id.slice(-8)}</td>
      <td class="p-4 text-sm">${d.association?.name || 'N/A'}</td>
      <td class="p-4 text-sm font-bold">$${d.totalAmount?.toFixed(2)}</td>
      <td class="p-4 text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-bold ${
          d.status === 'completed' ? 'bg-secondary-container text-on-secondary-container' :
          d.status === 'failed' ? 'bg-error-container text-on-error-container' :
          'bg-surface-container-highest text-on-surface-variant'
        }">${d.status}</span>
      </td>
      <td class="p-4 text-xs text-on-surface-variant">${new Date(d.createdAt).toLocaleDateString('es-AR')}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateRewardsUI(rewards) {
  const rewardEls = document.querySelectorAll('[data-reward]');
  rewardEls.forEach(el => {
    const key = el.dataset.reward;
    if (key === 'estimated' && rewards.estimatedReward !== undefined) {
      el.textContent = `$${rewards.estimatedReward.toFixed(2)}`;
    }
    if (key === 'totalVault' && rewards.totalVaultContributed !== undefined) {
      el.textContent = `$${rewards.totalVaultContributed.toFixed(2)}`;
    }
    if (key === 'count' && rewards.totalDonations !== undefined) {
      el.textContent = rewards.totalDonations;
    }
  });
}
