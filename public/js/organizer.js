/**
 * Concert Ticketing System - Organizer Portal Script
 * Live Attendee Roster, Capacity Tracking, and Ticket Revocation (FR-005)
 */

(function () {
  'use strict';

  let currentParams = {
    search: '',
    tier: 'all',
    status: 'all',
    page: 1,
    limit: 10
  };

  let searchTimeout = null;
  let lastSyncSeconds = 0;
  let rosterData = [];

  // DOM Elements
  const tableBody = document.getElementById('roster-table-body');
  const countLabel = document.getElementById('roster-count-label');
  const paginationEl = document.getElementById('pagination-controls');
  const searchInput = document.getElementById('roster-search-input');
  const tierSelect = document.getElementById('roster-tier-select');
  const statusSelect = document.getElementById('roster-status-select');
  const syncTimerLabel = document.getElementById('sync-timer-label');

  // Metrics Elements
  const soldCountEl = document.getElementById('metric-sold-count');
  const totalCapEl = document.getElementById('metric-total-cap');
  const allocatedPctEl = document.getElementById('metric-allocated-pct');
  const capacityPercentEl = document.getElementById('metric-capacity-percent');
  const capacityBarEl = document.getElementById('capacity-progress-bar');
  const spotsRemainingEl = document.getElementById('metric-spots-remaining');
  const revokedCountEl = document.getElementById('metric-revoked-count');
  const disputeRateEl = document.getElementById('metric-dispute-rate');

  async function loadDashboard() {
    const query = new URLSearchParams(currentParams).toString();
    try {
      const res = await fetch(`/api/organizer/dashboard?${query}`);
      const data = await res.json();

      if (data.success) {
        updateMetrics(data.metrics);
        rosterData = data.roster;
        renderRoster(data.roster);
        renderPagination(data.pagination);
        lastSyncSeconds = 0;
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  function updateMetrics(metrics) {
    if (!metrics) return;
    if (soldCountEl) soldCountEl.textContent = Number(metrics.ticketsSold).toLocaleString();
    if (totalCapEl) totalCapEl.textContent = Number(metrics.capacity).toLocaleString();
    if (allocatedPctEl) allocatedPctEl.textContent = `${metrics.capacityPercent} allocated`;
    if (capacityPercentEl) capacityPercentEl.textContent = metrics.capacityPercent;
    if (capacityBarEl) capacityBarEl.style.width = metrics.capacityPercent;
    if (spotsRemainingEl) spotsRemainingEl.textContent = `${metrics.spotsRemaining} spots remaining`;
    if (revokedCountEl) revokedCountEl.textContent = metrics.revokedPasses;
    if (disputeRateEl) disputeRateEl.textContent = `${metrics.disputeRate} dispute rate`;
  }

  function getAvatarColor(initials) {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-slate-200 text-slate-700',
      'bg-emerald-100 text-emerald-700',
      'bg-indigo-100 text-indigo-700',
      'bg-rose-100 text-rose-700'
    ];
    let hash = 0;
    for (let i = 0; i < initials.length; i++) hash += initials.charCodeAt(i);
    return colors[hash % colors.length];
  }

  function renderRoster(roster) {
    if (!tableBody) return;

    if (roster.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-12 text-center text-slate-500 font-medium">
            No attendees match the current search or filters.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = roster.map(row => {
      const isValid = row.status === 'Valid';
      const colorClass = getAvatarColor(row.initials);

      return `
        <tr class="${isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/20 hover:bg-rose-50/30'} transition-colors" data-ticket-id="${row.ticket_id}">
          <td class="py-3.5 px-6 whitespace-nowrap">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${colorClass} font-bold flex items-center justify-center shrink-0 text-xs">
                ${row.initials}
              </div>
              <div>
                <div class="font-bold text-slate-900 leading-snug">${row.full_name}</div>
                <div class="text-xs text-slate-500 font-mono">${row.email}</div>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-6 whitespace-nowrap">
            <span class="font-semibold text-slate-800">${row.ticket_type_name}</span>
            <span class="block text-xs text-slate-400 font-mono">${row.ticket_code} • ${row.gate}</span>
          </td>
          <td class="py-3.5 px-6 whitespace-nowrap status-cell">
            ${isValid ? `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span class="material-symbols-outlined text-sm font-bold">check</span>
                Valid
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <span class="material-symbols-outlined text-sm font-bold">warning</span>
                Revoked
              </span>
            `}
          </td>
          <td class="py-3.5 px-6 whitespace-nowrap text-right action-cell">
            ${isValid ? `
              <button type="button" onclick="window.revokeAttendeePass(${row.ticket_id}, '${row.ticket_code}')" class="min-h-[40px] h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer">
                <span class="material-symbols-outlined text-base">block</span>
                Revoke
              </button>
            ` : `
              <button type="button" disabled class="min-h-[40px] h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-medium text-xs inline-flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80">
                <span class="material-symbols-outlined text-base">do_not_disturb_on</span>
                Revoked
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPagination(pagination) {
    if (!pagination) return;
    const { page, total, limit, totalPages } = pagination;

    if (countLabel) {
      countLabel.innerHTML = `Showing <span class="font-bold text-slate-800">${Math.min(limit, total)}</span> of <span class="font-bold text-slate-800">${total}</span> ticket holders`;
    }

    if (!paginationEl) return;
    let buttons = '';

    buttons += `
      <button type="button" ${page <= 1 ? 'disabled' : ''} onclick="window.changeRosterPage(${page - 1})" class="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold transition-colors cursor-pointer">
        Previous
      </button>
    `;

    for (let p = 1; p <= Math.max(1, totalPages); p++) {
      if (p === page) {
        buttons += `
          <button type="button" class="h-9 w-9 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm">
            ${p}
          </button>
        `;
      } else {
        buttons += `
          <button type="button" onclick="window.changeRosterPage(${p})" class="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer">
            ${p}
          </button>
        `;
      }
    }

    buttons += `
      <button type="button" ${page >= totalPages ? 'disabled' : ''} onclick="window.changeRosterPage(${page + 1})" class="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold transition-colors cursor-pointer">
        Next
      </button>
    `;

    paginationEl.innerHTML = buttons;
  }

  // Global functions attached to window for HTML handlers
  window.revokeAttendeePass = async function (ticketId, ticketCode) {
    const confirmed = confirm(
      `Are you sure you want to revoke pass ${ticketCode}?\n\nThe barcode will immediately be blacklisted at all venue gates and turnstiles.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/organizer/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ticketCode })
      });
      const data = await res.json();

      if (data.success) {
        // Reload dashboard for exact numbers
        loadDashboard();
      } else {
        alert(data.message || 'Revocation failed.');
      }
    } catch (err) {
      alert('Error communicating with ticket revocation service.');
    }
  };

  window.changeRosterPage = function (newPage) {
    currentParams.page = newPage;
    loadDashboard();
  };

  // Search with debounce
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentParams.search = e.target.value.trim();
        currentParams.page = 1;
        loadDashboard();
      }, 300);
    });
  }

  // Tier filter
  if (tierSelect) {
    tierSelect.addEventListener('change', (e) => {
      currentParams.tier = e.target.value;
      currentParams.page = 1;
      loadDashboard();
    });
  }

  // Status filter
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      currentParams.status = e.target.value;
      currentParams.page = 1;
      loadDashboard();
    });
  }

  // CSV Export
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!rosterData || rosterData.length === 0) {
        alert('No data to export.');
        return;
      }
      const headers = ['Ticket Code', 'Full Name', 'Email', 'Account #', 'Ticket Type', 'Status', 'Gate', 'Price'];
      const rows = rosterData.map(r => [
        r.ticket_code,
        `"${r.full_name}"`,
        r.email,
        r.account_number,
        `"${r.ticket_type_name}"`,
        r.status,
        r.gate,
        r.price
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `attendee_manifest_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Gate Manifest Download
  const manifestBtn = document.getElementById('gate-manifest-btn');
  if (manifestBtn) {
    manifestBtn.addEventListener('click', () => {
      const manifest = {
        generatedAt: new Date().toISOString(),
        venue: 'Metro Arena',
        turnstileMeshStatus: 'Online',
        tickets: rosterData.map(r => ({
          code: r.ticket_code,
          attendee: r.full_name,
          account: r.account_number,
          status: r.status,
          gate: r.gate
        }))
      };
      const jsonContent = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', jsonContent);
      link.setAttribute('download', `gate_manifest_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Live Sync ticker interval
  setInterval(() => {
    lastSyncSeconds += 2;
    if (syncTimerLabel) {
      if (lastSyncSeconds < 60) {
        syncTimerLabel.textContent = `Updated ${lastSyncSeconds}s ago`;
      } else {
        syncTimerLabel.textContent = `Updated ${Math.floor(lastSyncSeconds / 60)}m ago`;
      }
    }
    // Auto refresh roster every 15s to catch new purchases or gate scans
    if (lastSyncSeconds % 16 === 0) {
      loadDashboard();
    }
  }, 2000);

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
  });
})();
