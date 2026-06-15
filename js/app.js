'use strict';
// EICHOFILT v-final app.js
// Overrides untuk new UI — metric updates, backwash, simulation

const THRESH = {
  turb:  { warn: 1.0,  crit: 2.0 },
  tds:   { warn: 200,  crit: 350 },
  flow:  { warn: 8 },
  life:  { warn: 40,  crit: 20 }
};

const STATE = {
  turb: 0.35, tds: 128, flow: 18.7, life: 92,
  turbHistory: [0.42,0.38,0.35,0.41,0.38,0.35,0.40,0.38,0.36,0.35,0.33,0.37,0.38,0.41,0.45,0.50,0.48,0.44,0.40,0.38,0.35,0.36,0.35,0.35],
  tdsHistory:  [125,122,120,124,128,130,132,128,125,128,124,127,130,132,135,138,134,130,128,125,122,124,126,128],
  flowHistory: [18.5,18.7,18.8,18.6,18.9,18.7,18.5,18.8,18.6,18.7,18.5,18.9,19.0,18.8,18.7,18.5,18.6,18.8,18.9,18.7,18.6,18.5,18.7,18.7],
  bwActive: false, bwTimer: 0, bwInterval: null,
  simActive: false, simStep: 0, simTimer: null,
  simScenario: [0.8, 1.2, 1.8, 2.2, 2.5, 1.8, 1.2, 0.8, 0.5, 0.35],
};

function $id(id) { return document.getElementById(id); }

function showToast(msg) {
  const el = $id('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function addLog(msg, type) {
  const list = $id('log-list');
  if (!list) return;
  const now = new Date();
  const t = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
  const tagClass = type === 'warn' ? 'warn' : 'info';
  const tagLabel = type === 'warn' ? 'Warning' : 'Info';
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span><span class="log-tag ${tagClass}">${tagLabel}</span>`;
  list.insertBefore(row, list.firstChild);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function updateMetrics() {
  const { turb, tds, flow, life } = STATE;

  function set(id, val) { const e = $id(id); if (e) e.textContent = val; }

  set('m-turb', turb.toFixed(2));
  set('m-tds',  Math.round(tds));
  set('m-flow', flow.toFixed(1));
  set('m-life', Math.round(life));

  // Turbidity tag
  const dt = $id('d-turb'), ct = $id('card-turb');
  if (dt) {
    if      (turb >= THRESH.turb.crit) { dt.className='metric-status-tag crit'; dt.textContent='Bahaya'; }
    else if (turb >= THRESH.turb.warn) { dt.className='metric-status-tag warn'; dt.textContent='Perhatian'; }
    else                                { dt.className='metric-status-tag ok';   dt.textContent='Baik'; }
  }

  // TDS
  const dd = $id('d-tds');
  if (dd) {
    if      (tds >= THRESH.tds.crit) { dd.className='metric-status-tag crit'; dd.textContent='Bahaya'; }
    else if (tds >= THRESH.tds.warn) { dd.className='metric-status-tag warn'; dd.textContent='Perhatian'; }
    else                              { dd.className='metric-status-tag ok';   dd.textContent='Baik'; }
  }

  // Flow
  const df = $id('d-flow');
  if (df) {
    if (flow < THRESH.flow.warn) { df.className='metric-status-tag warn'; df.textContent='Lemah'; }
    else                          { df.className='metric-status-tag opt';  df.textContent='Optimal'; }
  }

  // Life
  const dl = $id('d-life');
  if (dl) {
    if      (life <= THRESH.life.crit) { dl.className='metric-status-tag crit'; dl.textContent='Ganti Segera'; }
    else if (life <= THRESH.life.warn) { dl.className='metric-status-tag warn'; dl.textContent='Perlu Ganti'; }
    else                                { dl.className='metric-status-tag ok';   dl.textContent='Baik'; }
  }

  // Badge
  const badge = $id('sys-badge'), bt = $id('badge-text');
  if (turb >= THRESH.turb.crit) {
    if (badge) badge.className = 'crit-badge';
    if (bt) bt.textContent = 'Darurat';
    if (!STATE.bwActive) triggerBackwash();
  } else if (turb >= THRESH.turb.warn) {
    if (badge) badge.className = 'warn-badge';
    if (bt) bt.textContent = 'Perhatian';
  } else {
    if (badge) badge.className = 'online-badge';
    if (bt) bt.textContent = 'Online';
  }

  // Peringatan page bars
  function setBar(pid, vid, val, max, colClass) {
    const pEl = $id(pid), vEl = $id(vid);
    const pct = Math.min(100, (val/max)*100);
    if (pEl) { pEl.style.width = pct+'%'; pEl.className = 'progress-fill '+colClass; }
    if (vEl) vEl.textContent = val + (pid==='pb-life'?'%':(pid==='pb-turb'?' NTU':pid==='pb-tds'?' ppm':' L/min'));
  }

  const turbColor = turb >= THRESH.turb.crit ? 'red' : turb >= THRESH.turb.warn ? 'orange' : 'green';
  const tdsColor  = tds  >= THRESH.tds.crit  ? 'red' : tds  >= THRESH.tds.warn  ? 'orange' : 'green';
  const flowColor = flow < THRESH.flow.warn   ? 'orange' : 'green';
  const lifeColor = life <= THRESH.life.crit  ? 'red'  : life <= THRESH.life.warn ? 'orange' : 'green';

  setBar('pb-turb', 'pv-turb', turb.toFixed(2), 5, turbColor);
  setBar('pb-tds',  'pv-tds',  Math.round(tds), 500, tdsColor);
  setBar('pb-flow', 'pv-flow', flow.toFixed(1), 30, flowColor);
  setBar('pb-life', 'pv-life', Math.round(life), 100, lifeColor);
}

function triggerBackwash() {
  if (STATE.bwActive) return;
  STATE.bwActive = true; STATE.bwTimer = 30;
  const banner = $id('bw-banner');
  const notifDot = $id('notif-dot');
  if (banner) banner.style.display = 'flex';
  if (notifDot) notifDot.style.display = 'block';
  addLog('Backwash otomatis dimulai', 'warn');

  STATE.bwInterval = setInterval(() => {
    STATE.bwTimer--;
    const el = $id('bw-timer');
    if (el) el.textContent = '00:' + String(STATE.bwTimer).padStart(2,'0');
    if (STATE.bwTimer <= 0) {
      clearInterval(STATE.bwInterval);
      STATE.bwActive = false;
      if (banner) banner.style.display = 'none';
      if (notifDot) notifDot.style.display = 'none';
      addLog('Backwash selesai', 'info');
    }
  }, 1000);
}

function toggleSim() {
  const btn = $id('btn-sim');
  STATE.simActive = !STATE.simActive;
  if (STATE.simActive) {
    STATE.simStep = 0;
    if (btn) { btn.textContent = '⏹ Stop'; btn.classList.add('on'); }
    addLog('Simulasi dimulai', 'info');
    STATE.simTimer = setInterval(() => {
      if (STATE.simStep >= STATE.simScenario.length) { stopSim(); return; }
      STATE.turb = STATE.simScenario[STATE.simStep];
      STATE.tds  = Math.round(128 + STATE.simStep * 10);
      STATE.flow = Math.max(5, 18.7 - STATE.simStep * 0.8);
      STATE.life = Math.max(10, 92 - STATE.simStep * 5);
      STATE.turbHistory = [...STATE.turbHistory.slice(1), STATE.turb];
      updateMetrics();
      if (typeof updateChartData === 'function') updateChartData();
      STATE.simStep++;
    }, 1500);
  } else { stopSim(); }
}

function stopSim() {
  clearInterval(STATE.simTimer);
  STATE.simActive = false; STATE.simStep = 0;
  const btn = $id('btn-sim');
  if (btn) { btn.textContent = '▶ Simulasi'; btn.classList.remove('on'); }
  STATE.turb = 0.35; STATE.tds = 128; STATE.flow = 18.7; STATE.life = 92;
  updateMetrics();
  if (typeof updateChartData === 'function') updateChartData();
  addLog('Simulasi selesai', 'info');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateMetrics();

  // Live updates
  setInterval(() => {
    if (STATE.simActive) return;
    const last = STATE.turb;
    STATE.turb = Math.max(0.1, Math.min(3.5, +(last + (Math.random()*.1-.05)).toFixed(3)));
    STATE.turbHistory = [...STATE.turbHistory.slice(1), STATE.turb];
    updateMetrics();
    if (typeof updateChartData === 'function') updateChartData();
  }, 4000);

  // Sim button
  const btn = $id('btn-sim');
  if (btn) btn.addEventListener('click', toggleSim);
});
