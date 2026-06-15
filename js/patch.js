// EICHOFILT Final — UI patch
// Sync sensor bar widths with metric values
function syncSensorBars(turb, tds, flow, life) {
  try {
    // progress bars in peringatan page
    const pb = (id, pct, col) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.width = Math.min(100, Math.max(0, pct)).toFixed(0) + '%';
      el.className = 'progress-fill ' + col;
    };
    // Turbidity: max ~5 NTU visible
    const turbPct = Math.min(100, (turb / 5) * 100);
    const turbCol = turb > 2 ? (turb > 3.5 ? 'red' : 'orange') : 'green';
    pb('pb-turb', turbPct, turbCol);
    const pvt = document.getElementById('pv-turb');
    if (pvt) pvt.textContent = turb.toFixed(2) + ' NTU';

    // TDS: max 500 ppm
    const tdsPct = Math.min(100, (tds / 500) * 100);
    const tdsCol = tds > 300 ? 'red' : tds > 150 ? 'orange' : 'green';
    pb('pb-tds', tdsPct, tdsCol);
    const pvd = document.getElementById('pv-tds');
    if (pvd) pvd.textContent = Math.round(tds) + ' ppm';

    // Flow: 0-20 L/min
    const flowPct = Math.min(100, (flow / 20) * 100);
    pb('pb-flow', flowPct, 'blue');
    const pvf = document.getElementById('pv-flow');
    if (pvf) pvf.textContent = flow.toFixed(1) + ' L/min';

    // Life: 0-100%
    const lifeCol = life < 30 ? 'red' : life < 60 ? 'orange' : 'green';
    pb('pb-life', life, lifeCol);
    const pvl = document.getElementById('pv-life');
    if (pvl) pvl.textContent = Math.round(life) + '%';

    // Filter page bars
    if (typeof S !== 'undefined' && S.sat) {
      updateFilterBars(S.sat[0], S.sat[1], S.sat[2]);
    }
  } catch(e) {}
}

function updateFilterBars(p1, p2, p3) {
  [[p1,'fp1','ff1'],[p2,'fp2','ff2'],[p3,'fp3','ff3']].forEach(([pct,txtId,fillId],i)=>{
    const txt  = document.getElementById(txtId);
    const fill = document.getElementById(fillId);
    if (txt)  txt.textContent = Math.round(pct) + '%';
    if (txt)  txt.className = 'filter-item-pct' + (pct >= 80 ? ' crit' : pct >= 60 ? ' warn' : '');
    if (fill) {
      fill.style.width = Math.min(100, pct) + '%';
      fill.className = 'filter-fill ' + (pct >= 80 ? 'red' : pct >= 60 ? 'orange' : 'green');
    }
  });
}

// Override addLog to match new DOM
function addLog(msg, type) {
  const list = document.getElementById('log-list');
  if (!list) return;
  const now = new Date();
  const t = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
  const tagMap = { ok:'info', info:'info', warn:'warn', error:'warn', red:'warn' };
  const tagLabel = { ok:'Info', info:'Info', warn:'Warning', error:'Warning' };
  const item = document.createElement('div');
  item.className = 'log-row';
  item.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span><span class="log-tag ${tagMap[type]||'info'}">${tagLabel[type]||'Info'}</span>`;
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

// Override updateMetrics for new DOM
const _origUpdateMetrics = typeof updateMetrics === 'function' ? updateMetrics : null;

function patchMetrics(turb, tds, flow, life) {
  try {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s('m-turb', turb.toFixed(2));
    s('m-tds',  Math.round(tds));
    s('m-flow', flow.toFixed(1));
    s('m-life', Math.round(life));

    // Status tags
    const updateTag = (id, val, warn, crit, labelOk, labelWarn, labelCrit) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (val >= crit)       { el.className = 'metric-status-tag crit'; el.textContent = labelCrit; }
      else if (val >= warn)  { el.className = 'metric-status-tag warn'; el.textContent = labelWarn; }
      else                   { el.className = 'metric-status-tag ok';   el.textContent = labelOk;   }
    };
    updateTag('d-turb', turb, 2, 5, 'Baik', 'Perhatian', 'Kritis');
    updateTag('d-tds',  tds, 200, 400, 'Baik', 'Perhatian', 'Bahaya');
    updateTag('d-life', 100-life, 40, 80, 'Baik', 'Perhatian', 'Ganti!');

    const flowEl = document.getElementById('d-flow');
    if (flowEl) {
      if (flow < 5) { flowEl.className = 'metric-status-tag warn'; flowEl.textContent = 'Lemah'; }
      else { flowEl.className = 'metric-status-tag opt'; flowEl.textContent = 'Optimal'; }
    }

    // Badge
    const badge  = document.getElementById('sys-badge');
    const badgeT = document.getElementById('badge-text');
    if (turb >= 5 || tds >= 400) {
      if (badge)  badge.className = 'crit-badge';
      if (badgeT) badgeT.textContent = 'Darurat';
    } else if (turb >= 2 || tds >= 200) {
      if (badge)  badge.className = 'warn-badge';
      if (badgeT) badgeT.textContent = 'Perhatian';
    } else {
      if (badge)  badge.className = 'online-badge';
      if (badgeT) badgeT.textContent = 'Online';
      const dot = badge?.querySelector('.online-dot');
      if (dot) dot.className = 'online-dot';
    }

    // Sync sensor bars
    syncSensorBars(turb, tds, flow, life);
  } catch(e) {}
}

// Hook into simulation.js updateMetrics
document.addEventListener('DOMContentLoaded', () => {
  setInterval(() => {
    if (typeof state !== 'undefined') {
      patchMetrics(
        state.currentTurb || 0.35,
        state.currentTds  || 128,
        state.currentFlow || 18.7,
        state.currentLife || 92
      );
      if (state.saturation) {
        updateFilterBars(state.saturation.p1||28, state.saturation.p2||27, state.saturation.p3||19);
      }
    }
  }, 1000);

  // Sync btn-sim
  const btn = document.getElementById('btn-sim');
  if (btn && typeof toggleSim === 'function') {
    btn.addEventListener('click', () => {
      toggleSim();
      const isOn = typeof state !== 'undefined' && state.simMode;
      btn.textContent = isOn ? '⏹ Stop' : '▶ Simulasi';
      btn.classList.toggle('on', isOn);
    });
  }
});
