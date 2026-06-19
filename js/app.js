/* ==========================================================================
   EICHOFILT — app.js
   Sinkronisasi Log Terminal, Event Listener Tombol, & Inisialisasi Aplikasi
   ========================================================================== */
'use strict';

/* ── SINKRONISASI LOG TERMINAL DARI MOCK DATABASE ── */
function updateLogListFromDB() {
  const list = document.getElementById('log-list');
  if (!list) return;

  MockMySQL.query('log').then(data => {
    list.innerHTML = '';
    data.forEach(row => {
      const t = new Date(row.waktu);
      const timeStr = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
      const badgeClass = row.tipe_tag === 'warn' ? 'warn' : 'info';

      const rowEl = document.createElement('div');
      rowEl.className = 'log-row';
      rowEl.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-msg">${row.pesan}</span>
        <span class="log-tag ${badgeClass}">${row.tipe_tag.toUpperCase()}</span>
      `;
      list.appendChild(rowEl);
    });
  });
}

/* ── MAIN INITIALIZATION HANDLER ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTrendChart();

  updateLogListFromDB();
  setInterval(updateLogListFromDB, 3500);

  setInterval(syncVisualBars, 1000);

  // Live IoT Simulator
  setInterval(() => {
    if (state.simMode) return;
    const last = state.currentTurb;
    const jitter = +(Math.random() * 0.12 - 0.06).toFixed(3);
    const next = Math.max(0.15, Math.min(0.95, last + jitter));

    updateMetrics(next, state.currentTds, state.currentFlow, state.currentLife);
    updateTrendChartFromDB();
  }, 4000);

  renderMLFeatureImportance();
  renderDecisionTreeSVG();
  renderZeroWasteMetrics();
  if (typeof onSandboxSliderChange === 'function') onSandboxSliderChange();

  // Tombol Simulasi (Backwash Scenario)
  const btnSim = document.getElementById('btn-sim');
  if (btnSim) btnSim.addEventListener('click', toggleSim);

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  navigateTo('dashboard');
  // First evaluate metrics to sync all high contrast colors correctly
  updateMetrics(0.35, 128, 18.7, 92);
});
