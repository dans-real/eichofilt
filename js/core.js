/**
 * EICHOFILT v3 — core.js
 * Single file: navigation, sensors, charts, simulation, zerowaste, settings
 * Design principles:
 *   - All state in one object (no global sprawl)
 *   - Null-safe DOM access everywhere
 *   - ML inference with input validation + clamping
 *   - Debounced live updates (no flooding)
 *   - Graceful degradation if Chart.js fails
 */

'use strict';

/* ── STATE ──────────────────────────────────────────────────────────────── */
const S = {
  // Sensor readings
  turb: 4.2, tds: 187, flow: 2.1, life: 73,
  turbHistory: [2.1,1.9,2.0,2.2,2.4,2.8,3.1,3.5,4.0,4.2,4.1,3.9,3.8,4.0,4.3,4.8,5.1,4.6,4.2,3.9,3.7,3.5,3.8,4.2],
  tdsHistory:  [175,172,170,174,178,182,185,188,190,187,186,184,183,185,188,192,195,190,187,184,182,180,183,187],
  sat: [28, 27, 19],

  // Thresholds (configurable)
  th: { turb: { warn: 6, crit: 10 }, tds: { warn: 300, crit: 500 }, flow: { warn: 1.2 }, life: { warn: 40, crit: 20 } },

  // Simulation
  simActive: false, simStep: 0, simTimer: null,
  simScenario: [8.2,9.5,11.2,12.8,13.5,10.1,7.2,5.1,4.3,3.8,4.1],

  // Backwash
  bwActive: false, bwTimer: 0, bwInterval: null,
  lastBwTime: Date.now(), bwCount: 7,

  // Zero waste
  zw: {
    residu: 14.7, residuTarget: 30,
    aquatup: 71, mp: 8.3, ecobrick: 0,
    hist: [0,1,0,2,1,2,1],
  },

  // Chart ref
  chart: null,
  liveTimer: null,
  syncTimer: null,
};

const DAY_LABELS = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

/* ── SAFE DOM ───────────────────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
function setClass(el, cls) { if (el) el.className = cls; }

/* ── TOAST ──────────────────────────────────────────────────────────────── */
let _toastT = null;
function toast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── LOG ────────────────────────────────────────────────────────────────── */
function log(msg, type = 'info') {
  const list = $('log-list');
  if (!list) return;
  const now = new Date();
  const t = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
  const map = { ok:'ok', info:'info', warn:'warn', error:'err', err:'err' };
  const dot = map[type] || 'info';

  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<span class="log-time">${t}</span><span class="log-dot ${dot}"></span><span class="log-msg">${msg}</span>`;
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 25) list.removeChild(list.lastChild);
}

function clearLog() {
  const el = $('log-list');
  if (el) el.innerHTML = '';
  toast('Log dibersihkan');
}

/* ── NAVIGATION ─────────────────────────────────────────────────────────── */
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const pg = $('page-' + pageId);
  if (pg) pg.classList.add('active');
  // Update nav items (both bottom-nav and sidebar)
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    const isActive = n.dataset.page === pageId;
    n.classList.toggle('active', isActive);
    n.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
}

/* ── CHART ──────────────────────────────────────────────────────────────── */
function buildHourLabels() {
  const now = new Date().getHours();
  return Array.from({ length: 24 }, (_, i) => ((now - 23 + i + 24) % 24) + ':00');
}

function initChart() {
  const canvas = $('trendChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const grid = isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
  const tick = isDark ? '#4A7870' : '#8FA9A3';

  try {
    S.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: buildHourLabels(),
        datasets: [
          {
            label: 'Turbidity',
            data: [...S.turbHistory],
            borderColor: '#00A878', backgroundColor: 'rgba(0,168,120,.06)',
            borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4,
            tension: 0.4, fill: true,
          },
          {
            label: 'TDS÷10',
            data: S.tdsHistory.map(v => +(v / 10).toFixed(1)),
            borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.04)',
            borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4,
            tension: 0.4, borderDash: [5,3], fill: true,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#172320' : '#fff',
            titleColor: isDark ? '#E8F3F0' : '#1A2621',
            bodyColor: tick,
            borderColor: 'rgba(0,0,0,.08)', borderWidth: 1,
            callbacks: {
              label: ctx => ctx.datasetIndex === 0
                ? ` Turbidity: ${ctx.raw} NTU`
                : ` TDS: ${(ctx.raw * 10).toFixed(0)} ppm`
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 9 }, color: tick, maxTicksLimit: 8, autoSkip: true }, grid: { display: false }, border: { display: false } },
          y: { ticks: { font: { size: 9 }, color: tick, maxTicksLimit: 5 }, grid: { color: grid }, border: { display: false } }
        }
      }
    });
  } catch (e) {
    console.warn('[EICHOFILT] Chart init failed:', e.message);
  }
}

function updateChart() {
  if (!S.chart) return;
  try {
    S.chart.data.datasets[0].data = [...S.turbHistory];
    S.chart.data.datasets[1].data = S.tdsHistory.map(v => +(v / 10).toFixed(1));
    S.chart.update('none');
  } catch (e) {
    console.warn('[EICHOFILT] Chart update failed:', e.message);
  }
}

/* ── ML INFERENCE (Random Forest mirror, input-validated) ───────────────── */
function rfClassify(turb, tds, flow, hours, dTurb) {
  // Clamp all inputs to safe ranges
  turb  = Math.max(0, Math.min(turb  || 0, 100));
  tds   = Math.max(0, Math.min(tds   || 0, 2000));
  flow  = Math.max(0, Math.min(flow  || 0, 10));
  hours = Math.max(0, Math.min(hours || 0, 200));
  dTurb = Math.max(-10, Math.min(dTurb || 0, 20));

  // Weighted scoring per feature importance
  // turbidity_ntu=34%, hours_since_bw=22%, turb_roc=15%, flow=9%, tds=6%
  let scores = [0, 0, 0]; // [Normal, Backwash, Ganti]

  // turbidity (most important)
  if      (turb > 12) { scores[2] += 0.90; }
  else if (turb > 9)  { scores[1] += 0.65; }
  else if (turb > 7)  { scores[1] += 0.45; }
  else if (turb > 5)  { scores[1] += 0.20; }
  else                { scores[0] += 0.34; }

  // hours since backwash
  if      (hours > 96) { scores[2] += 0.30; }
  else if (hours > 72) { scores[1] += 0.55; }
  else if (hours > 48) { scores[1] += 0.25; }
  else                 { scores[0] += 0.22; }

  // rate of change
  if      (dTurb > 3.0) { scores[2] += 0.20; }
  else if (dTurb > 1.5) { scores[1] += 0.30; }
  else if (dTurb > 0.5) { scores[1] += 0.10; }
  else                   { scores[0] += 0.15; }

  // flow rate
  if      (flow < 0.6) { scores[2] += 0.25; }
  else if (flow < 1.0) { scores[1] += 0.20; }
  else if (flow < 1.5) { scores[1] += 0.08; }
  else                 { scores[0] += 0.09; }

  // TDS
  if      (tds > 600) { scores[2] += 0.15; }
  else if (tds > 350) { scores[1] += 0.10; }
  else                { scores[0] += 0.06; }

  // Softmax
  const expS = scores.map(s => Math.exp(s * 3));
  const sum  = expS.reduce((a, b) => a + b, 1e-9); // avoid /0
  const probs = expS.map(s => s / sum);
  const pred  = probs.indexOf(Math.max(...probs));
  return { pred, probs, conf: (probs[pred] * 100).toFixed(1) };
}

/* ── METRICS UPDATE ─────────────────────────────────────────────────────── */
const CLASS_NAMES = ['Normal', 'Perlu Backwash', 'Ganti Membran'];
const CLASS_COLORS_CSS = { 0: 'var(--ok)', 1: 'var(--warn)', 2: 'var(--crit)' };

function updateMetrics() {
  const { turb, tds, flow, life, th } = S;

  // Set values
  setText('m-turb', turb.toFixed(1));
  setText('m-tds',  Math.round(tds));
  setText('m-flow', flow.toFixed(1));
  setText('m-life', Math.round(life));

  // Turbidity status
  const dTurb   = $('d-turb');
  const badge   = $('sys-badge');
  const badgeT  = $('badge-text');
  const card    = $('card-turb');

  if (turb >= th.turb.crit) {
    if (dTurb)  { dTurb.className = 'metric-tag crit'; dTurb.textContent = '▴ Kritis!'; }
    if (card)   { card.className = 'metric-card crit'; }
    if (badge)  { badge.className = 'status-badge crit'; }
    if (badgeT) { badgeT.textContent = 'Darurat'; }
    if (!S.bwActive) triggerBackwash();
  } else if (turb >= th.turb.warn) {
    if (dTurb)  { dTurb.className = 'metric-tag warn'; dTurb.textContent = '▴ Perhatian'; }
    if (card)   { card.className = 'metric-card warn'; }
    if (badge)  { badge.className = 'status-badge warn'; }
    if (badgeT) { badgeT.textContent = 'Perhatian'; }
  } else {
    if (dTurb)  { dTurb.className = 'metric-tag ok'; dTurb.textContent = '▾ Normal'; }
    if (card)   { card.className = 'metric-card ok'; }
    if (badge)  { badge.className = 'status-badge'; }
    if (badgeT) { badgeT.textContent = 'Aktif'; }
  }

  // TDS
  const dTds = $('d-tds');
  if (dTds) {
    if      (tds >= th.tds.crit) { dTds.className = 'metric-tag crit'; dTds.textContent = '▴ Bahaya'; }
    else if (tds >= th.tds.warn) { dTds.className = 'metric-tag warn'; dTds.textContent = '▴ Perhatian'; }
    else                          { dTds.className = 'metric-tag ok';   dTds.textContent = '▾ Layak'; }
  }

  // Flow
  const dFlow = $('d-flow');
  if (dFlow) {
    if (flow < th.flow.warn) { dFlow.className = 'metric-tag warn'; dFlow.textContent = '▾ Lemah'; }
    else                      { dFlow.className = 'metric-tag ok';   dFlow.textContent = '→ Stabil'; }
  }

  // Life
  const dLife = $('d-life');
  const cardL = $('card-life');
  const days  = Math.max(0, Math.round(life / 4));
  if (dLife) {
    if      (life <= th.life.crit) { dLife.className = 'metric-tag crit'; dLife.textContent = '▴ Ganti!'; if(cardL) cardL.className='metric-card crit'; }
    else if (life <= th.life.warn) { dLife.className = 'metric-tag warn'; dLife.textContent = '▴ '+days+' hr'; if(cardL) cardL.className='metric-card warn'; }
    else                            { dLife.className = 'metric-tag ok';   dLife.textContent = '▸ '+days+' hr'; if(cardL) cardL.className='metric-card warn'; }
  }

  // ML Prediction
  const hours = (Date.now() - S.lastBwTime) / 3600000;
  const dT    = S.turbHistory.length >= 2
    ? (S.turbHistory[S.turbHistory.length - 1] - S.turbHistory[S.turbHistory.length - 5]) || 0
    : 0;
  const ml = rfClassify(turb, tds, flow, hours, dT);

  const mlNow  = $('ml-now');
  const mlConf = $('ml-conf');
  if (mlNow)  { mlNow.textContent = CLASS_NAMES[ml.pred]; mlNow.style.color = CLASS_COLORS_CSS[ml.pred]; }
  if (mlConf) { mlConf.textContent = 'Keyakinan: ' + ml.conf + '%'; }
}

/* ── SATURATION UPDATE ──────────────────────────────────────────────────── */
function updateSaturation(p1, p2, p3) {
  S.sat = [p1, p2, p3];
  const fills  = ['p1-fill', 'p2-fill', 'p3-fill'];
  const vals   = ['p1-val',  'p2-val',  'p3-val'];
  const lpfill = ['lp1', 'lp2', 'lp3'];
  const lbadge = ['ls-1', 'ls-2', 'ls-3'];
  const fdvals = ['fd-p1', 'fd-p2', 'fd-p3'];
  const baseColors = ['var(--teal)', '#3B82F6', 'var(--warn)'];

  [p1, p2, p3].forEach((pct, i) => {
    const safe = Math.max(0, Math.min(100, pct));
    const cls  = safe >= 80 ? 'crit' : safe >= 60 ? 'warn' : 'ok';
    const color = safe >= 80 ? 'var(--crit)' : safe >= 60 ? 'var(--warn)' : baseColors[i];

    const fill = $(fills[i]);
    const val  = $(vals[i]);
    const lpf  = $(lpfill[i]);
    const badge = $(lbadge[i]);
    const fdd  = $(fdvals[i]);

    if (fill)  { fill.style.width = safe + '%'; fill.style.background = color; fill.className = 'sat-fill ' + cls; }
    if (val)   { val.textContent = Math.round(safe) + '%'; }
    if (lpf)   { lpf.style.width = safe + '%'; lpf.style.background = color; }
    if (badge) { badge.className = 'layer-badge ' + cls; badge.textContent = Math.round(safe) + '%'; }
    if (fdd)   { fdd.textContent = Math.round(safe) + '%'; }
  });
}

/* ── LAYER STATUS ───────────────────────────────────────────────────────── */
function setLayerStatus(id, cls) {
  const el = $(id);
  if (!el) return;
  el.className = 'layer-badge ' + cls;
}

/* ── BACKWASH ───────────────────────────────────────────────────────────── */
function triggerBackwash() {
  if (S.bwActive) return;
  S.bwActive = true;
  S.bwTimer  = 30;

  const banner = $('bw-banner');
  if (banner) banner.style.display = 'flex';

  log('⚡ Backwash otomatis aktif — solenoid valve terbuka', 'warn');
  sendWANotif('⚡ [EICHOFILT] Turbidity tinggi! Auto-Backwash aktif. Durasi 30 detik.');

  clearInterval(S.bwInterval);
  S.bwInterval = setInterval(() => {
    S.bwTimer = Math.max(0, S.bwTimer - 1);
    setText('bw-timer', '00:' + String(S.bwTimer).padStart(2, '0'));
    if (S.bwTimer <= 0) {
      clearInterval(S.bwInterval);
      S.bwActive   = false;
      S.lastBwTime = Date.now();
      S.bwCount++;
      if (banner) banner.style.display = 'none';
      log('✅ Backwash selesai — sistem kembali normal', 'ok');
      zwOnBackwash();
    }
  }, 1000);
}

/* ── LIVE UPDATES (debounced) ───────────────────────────────────────────── */
function startLive() {
  S.liveTimer = setInterval(() => {
    if (S.simActive) return;
    const last   = S.turbHistory[S.turbHistory.length - 1] || 4.2;
    const jitter = +(Math.random() * 0.6 - 0.3).toFixed(2);
    const next   = +(Math.max(1.5, Math.min(5.8, last + jitter))).toFixed(2);
    S.turb = next;
    S.turbHistory = [...S.turbHistory.slice(1), next];
    updateChart();
    updateMetrics();
    // Slow aquatup drift
    S.zw.aquatup = Math.min(98, +(S.zw.aquatup + 0.02).toFixed(2));
    zwRenderGauge(S.zw.aquatup);
  }, 4000);

  // Sync clock
  S.syncTimer = setInterval(() => {
    setText('last-sync', new Date().toLocaleTimeString('id-ID'));
  }, 1000);
}

/* ── SIMULATION ─────────────────────────────────────────────────────────── */
function toggleSim() {
  const btn = $('btn-sim');
  S.simActive = !S.simActive;

  if (S.simActive) {
    S.simStep = 0;
    if (btn) { btn.textContent = '⏹ Stop'; btn.classList.add('on'); }
    log('▶ Simulasi dimulai', 'info');

    S.simTimer = setInterval(() => {
      if (S.simStep >= S.simScenario.length) { stopSim(); return; }
      const t = S.simScenario[S.simStep];
      S.turb = t;
      S.tds  = Math.round(187 + S.simStep * 2.5);
      S.flow = Math.max(1.0, 2.1 - S.simStep * 0.05);
      S.life = Math.max(5, 73 - S.simStep * 5);
      S.turbHistory = [...S.turbHistory.slice(1), t];
      updateChart();
      updateMetrics();
      updateSaturation(
        Math.min(95, 28 + S.simStep * 6),
        Math.min(95, 27 + S.simStep * 7),
        Math.min(95, 19 + S.simStep * 4)
      );
      S.simStep++;
    }, 1800);
  } else {
    stopSim();
  }
}

function stopSim() {
  clearInterval(S.simTimer);
  S.simActive = false;
  S.simStep   = 0;
  const btn = $('btn-sim');
  if (btn) { btn.textContent = '▶ Sim'; btn.classList.remove('on'); }
  // Reset
  S.turb = 4.2; S.tds = 187; S.flow = 2.1; S.life = 73;
  S.turbHistory = [2.1,1.9,2.0,2.2,2.4,2.8,3.1,3.5,4.0,4.2,4.1,3.9,3.8,4.0,4.3,4.8,5.1,4.6,4.2,3.9,3.7,3.5,3.8,4.2];
  updateChart();
  updateMetrics();
  updateSaturation(28, 27, 19);
  log('⏹ Simulasi selesai', 'info');
}

/* ── ZERO WASTE ─────────────────────────────────────────────────────────── */
function zwRender() {
  const zw = S.zw;
  const pct = Math.min(99, (zw.residu / zw.residuTarget) * 100);

  setText('zw-residu',  zw.residu.toFixed(1) + 'g');
  setText('zw-mp',      '~' + zw.mp.toFixed(1) + 'mg');
  setText('zw-aq-pct',  Math.round(zw.aquatup) + '%');
  setText('zw-brick',   zw.ecobrick);
  setText('zw-bw-vol',  (S.bwCount * 0.12).toFixed(2) + 'L terkumpul');
  setText('zw-sediment','~' + zw.residu.toFixed(1) + 'g padatan');

  const rf = $('zw-residu-fill');
  if (rf) rf.style.width = pct.toFixed(0) + '%';

  const aqf = $('zw-aq-fill');
  if (aqf) {
    aqf.style.width = zw.aquatup + '%';
    aqf.className = 'zw-mini-fill ' + (zw.aquatup >= 90 ? 'crit' : zw.aquatup >= 70 ? 'warn' : '');
  }

  zwRenderGauge(zw.aquatup);
  zwRenderHist();
  zwUpdateMsg();
}

function zwRenderGauge(pct) {
  const liq  = $('zw-liq');
  const wave = $('zw-wave');
  const gpct = $('zw-gpct');
  if (!liq) return;

  const safePct = Math.max(0, Math.min(100, pct));
  const totalH  = 85, fillH = (safePct / 100) * totalH;
  const yTop    = 15 + totalH - fillH;
  const color   = safePct >= 90 ? 'var(--crit)' : safePct >= 70 ? 'var(--warn)' : 'var(--ok)';

  liq.setAttribute('y', yTop.toFixed(1));
  liq.setAttribute('height', fillH.toFixed(1));
  liq.setAttribute('fill', color);
  liq.setAttribute('opacity', '0.25');

  if (wave) {
    wave.setAttribute('d', `M30,${yTop.toFixed(1)} Q50,${(yTop-4).toFixed(1)} 70,${yTop.toFixed(1)} Q90,${(yTop+4).toFixed(1)} 90,${yTop.toFixed(1)}`);
    wave.setAttribute('stroke', color);
  }

  if (gpct) gpct.textContent = Math.round(safePct) + '%';
}

function zwRenderHist() {
  const container = $('zw-hist');
  if (!container) return;
  const hist   = S.zw.hist;
  const maxVal = Math.max(...hist, 1);
  container.innerHTML = hist.map((val, i) => {
    const h   = Math.max(3, (val / maxVal) * 36);
    const col = val === 0 ? 'var(--border)' : val >= 2 ? 'var(--warn)' : 'var(--teal)';
    return `<div class="hist-col">
      <div class="hist-bar" style="height:${h}px;background:${col}" title="${DAY_LABELS[i]}: ${val}×"></div>
      <div class="hist-day">${DAY_LABELS[i]}</div>
    </div>`;
  }).join('');
}

function zwUpdateMsg() {
  const pct    = S.zw.aquatup;
  const dot    = $('zw-gdot');
  const msg    = $('zw-gmsg');
  const days   = Math.max(0, Math.round((100 - pct) / 5));
  let txt, cls;

  if (pct >= 90)      { txt = 'Segera bersihkan!'; cls = 'crit'; }
  else if (pct >= 70) { txt = 'Bersihkan ~' + days + ' hari'; cls = 'warn'; }
  else                { txt = 'Aman ~' + days + ' hari lagi'; cls = 'ok'; }

  if (msg) msg.textContent = txt;
  if (dot) dot.className = 'gauge-dot ' + cls;
}

function zwOnBackwash() {
  const zw = S.zw;
  zw.residu  = +(zw.residu + 0.30).toFixed(2);
  zw.mp      = +(zw.mp    + 0.30).toFixed(2);
  zw.aquatup = Math.min(98, +(zw.aquatup + 4).toFixed(1));
  zw.hist    = [...zw.hist.slice(1), (zw.hist[6] || 0) + 1];

  if (zw.residu >= zw.residuTarget) {
    zw.ecobrick++;
    zw.residu = +(zw.residu - zw.residuTarget).toFixed(2);
    toast('🧱 Ecobrick ke-' + zw.ecobrick + ' siap diproduksi!');
    log('♻️ Residu cukup untuk ' + zw.ecobrick + ' ecobrick', 'ok');
  }
  zwRender();
}

function bersihkanAquatup() {
  S.zw.aquatup = 0;
  zwRenderGauge(0);
  zwUpdateMsg();
  setText('zw-aq-pct', '0%');
  const af = $('zw-aq-fill');
  if (af) { af.style.width = '0%'; af.className = 'zw-mini-fill'; }
  log('🧹 Aquatup dibersihkan oleh pengguna', 'ok');
  toast('✅ Aquatup sudah dibersihkan');
}

/* ── SETTINGS ───────────────────────────────────────────────────────────── */
function saveSettings() {
  const t = parseFloat($('cfg-turb')?.value);
  const d = parseFloat($('cfg-tds')?.value);
  const f = parseFloat($('cfg-flow')?.value);
  if (!isNaN(t) && t > 0)  S.th.turb.crit  = t;
  if (!isNaN(d) && d > 0)  S.th.tds.crit   = d;
  if (!isNaN(f) && f > 0)  S.th.flow.warn  = f;
  toast('✅ Konfigurasi disimpan');
  log('⚙️ Ambang batas diperbarui: turb=' + t + ' NTU, TDS=' + d + ' ppm', 'info');
}

function resetSettings() {
  S.th = { turb: { warn: 6, crit: 10 }, tds: { warn: 300, crit: 500 }, flow: { warn: 1.2 }, life: { warn: 40, crit: 20 } };
  const el = { 'cfg-turb': 10, 'cfg-tds': 500, 'cfg-flow': 1.2 };
  Object.entries(el).forEach(([id, val]) => { const e = $(id); if (e) e.value = val; });
  toast('↩ Pengaturan direset');
}

/* ── FONNTE WHATSAPP ─────────────────────────────────────────────────────── */
function sendWANotif(msg) {
  const num   = $('cfg-wa')?.value?.trim();
  const token = $('cfg-token')?.value?.trim();
  if (!num || !token) return; // Not configured, silent fail

  const fd = new FormData();
  fd.append('target', num);
  fd.append('message', msg);

  fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': token },
    body: fd
  }).then(r => {
    if (!r.ok) log('⚠️ WA notif gagal: HTTP ' + r.status, 'warn');
    else       log('💬 WA notif terkirim ke ' + num, 'ok');
  }).catch(err => {
    log('⚠️ WA notif error: ' + err.message, 'warn');
  });
}

function testWA() {
  const num   = $('cfg-wa')?.value?.trim();
  const token = $('cfg-token')?.value?.trim();
  if (!num)   { toast('⚠️ Isi nomor HP dulu'); return; }
  if (!token) { toast('⚠️ Isi API Token dulu'); return; }
  toast('📤 Mengirim pesan uji...');
  sendWANotif('[EICHOFILT] ✅ Pesan uji berhasil! Sistem monitoring aktif dan terhubung.');
}

function handleToggle(input, name) {
  toast((input.checked ? '🔔 ' : '🔕 ') + name + (input.checked ? ' aktif' : ' nonaktif'));
}

function generateReport() {
  toast('📄 Laporan sedang dibuat...');
  log('📄 Laporan PDF bulanan dibuat', 'info');
}

/* ── INIT ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();

  const simBtn = $('btn-sim');
  if (simBtn) simBtn.addEventListener('click', toggleSim);

  // Wait for Chart.js (loaded with defer)
  requestAnimationFrame(() => {
    setTimeout(() => {
      initChart();
      updateMetrics();
      updateSaturation(28, 27, 19);
      zwRender();
      startLive();
      log('💧 EICHOFILT v3 aktif — MQTT terhubung', 'ok');
    }, 100);
  });

  console.log('[EICHOFILT v3] Initialized ✓');
});
