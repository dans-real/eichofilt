/* ============================================
   EICHOFILT — simulation.js
   Live sensor updates, simulation, backwash
   ============================================ */

// ---- METRIC UPDATER ----
function updateMetrics(turb, tds, flow, life) {
  state.currentTurb = turb;
  state.currentTds = tds;
  state.currentFlow = flow;
  state.currentLife = life;

  document.getElementById('m-turb').textContent = turb.toFixed(1);
  document.getElementById('m-tds').textContent = Math.round(tds);
  document.getElementById('m-flow').textContent = flow.toFixed(1);
  document.getElementById('m-life').textContent = Math.round(life);

  // Turbidity status
  const dTurb = document.getElementById('d-turb');
  const badge = document.getElementById('sys-badge');
  const mlNow = document.getElementById('ml-now');

  if (turb >= THRESHOLDS.turbidity.crit) {
    dTurb.className = 'metric-delta up';
    dTurb.textContent = '▴ melebihi batas kritis!';
    badge.className = 'system-badge crit';
    badge.textContent = '● peringatan kritis';
    mlNow.className = 'ml-badge replace';
    mlNow.textContent = 'Ganti Membran';
    setLayerStatus('ls-1', 'crit', 'KRITIS');
    setLayerStatus('ls-2', 'crit', 'KRITIS');
    if (!state.backwashActive) triggerBackwash();
  } else if (turb >= THRESHOLDS.turbidity.warn) {
    dTurb.className = 'metric-delta warn';
    dTurb.textContent = '▴ mendekati batas';
    badge.className = 'system-badge warn';
    badge.textContent = '● perhatian';
    mlNow.className = 'ml-badge backwash';
    mlNow.textContent = 'Perlu Backwash';
    setLayerStatus('ls-1', 'warn', 'WARN');
    setLayerStatus('ls-2', 'warn', 'WARN');
  } else {
    dTurb.className = 'metric-delta ok';
    dTurb.textContent = '▾ dalam batas normal';
    badge.className = 'system-badge';
    badge.textContent = '● sistem aktif';
    mlNow.className = 'ml-badge normal';
    mlNow.textContent = 'Normal';
    setLayerStatus('ls-1', 'ok', 'OK');
    setLayerStatus('ls-2', 'ok', 'OK');
  }

  // TDS status
  const dTds = document.getElementById('d-tds');
  if (tds >= THRESHOLDS.tds.crit) {
    dTds.className = 'metric-delta up';
    dTds.textContent = '▴ tidak layak konsumsi';
  } else if (tds >= THRESHOLDS.tds.warn) {
    dTds.className = 'metric-delta warn';
    dTds.textContent = '▴ perlu perhatian';
  } else {
    dTds.className = 'metric-delta ok';
    dTds.textContent = '▾ layak konsumsi';
  }

  // Flow status
  const dFlow = document.getElementById('d-flow');
  if (flow < THRESHOLDS.flowRate.warn) {
    dFlow.className = 'metric-delta warn';
    dFlow.textContent = '▾ flux menurun';
  } else {
    dFlow.className = 'metric-delta ok';
    dFlow.textContent = '→ stabil';
  }

  // Membrane life
  const dLife = document.getElementById('d-life');
  const days = Math.round(life / 4);
  if (life <= THRESHOLDS.membrane.crit) {
    dLife.className = 'metric-delta up';
    dLife.textContent = '▴ segera ganti membran!';
  } else if (life <= THRESHOLDS.membrane.warn) {
    dLife.className = 'metric-delta warn';
    dLife.textContent = '▴ ~' + days + ' hari lagi';
  } else {
    dLife.className = 'metric-delta ok';
    dLife.textContent = '▸ ~' + days + ' hari lagi';
  }
}

function setLayerStatus(id, cls, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'layer-status ' + cls;
  el.textContent = text;
}

// ---- SATURATION ----
function updateSaturation(p1, p2, p3) {
  state.saturation = { p1, p2, p3 };

  const fills = ['p1-fill', 'p2-fill', 'p3-fill'];
  const vals = ['p1-val', 'p2-val', 'p3-val'];
  const pcts = [p1, p2, p3];
  const baseClasses = ['green', 'blue', 'gray'];

  pcts.forEach((pct, i) => {
    const fillEl = document.getElementById(fills[i]);
    const valEl = document.getElementById(vals[i]);
    if (!fillEl || !valEl) return;

    fillEl.style.width = Math.min(pct, 100) + '%';
    valEl.textContent = Math.round(pct) + '%';

    fillEl.className = 'progress-fill';
    if (pct >= 80) fillEl.classList.add('red');
    else if (pct >= 60) fillEl.classList.add('amber');
    else fillEl.classList.add(baseClasses[i]);
  });

  // Sync filter detail page
  const fd1 = document.getElementById('fd-p1');
  const fd2 = document.getElementById('fd-p2');
  const fd3 = document.getElementById('fd-p3');
  if (fd1) fd1.textContent = Math.round(p1) + '%';
  if (fd2) fd2.textContent = Math.round(p2) + '%';
  if (fd3) fd3.textContent = Math.round(p3) + '%';
}

// ---- BACKWASH ----
function triggerBackwash() {
  if (state.backwashActive) return;
  state.backwashActive = true;
  state.bwTimer = 30;

  const banner = document.getElementById('backwash-banner');
  const timerEl = document.getElementById('bw-timer');
  if (banner) banner.style.display = 'flex';

  addLog('ALERT: Turbidity tinggi — solenoid valve aktif, Smart Auto-Backwash dimulai', 'red');

  clearInterval(state.bwInterval);
  state.bwInterval = setInterval(() => {
    state.bwTimer--;
    if (timerEl) timerEl.textContent = '00:' + String(state.bwTimer).padStart(2, '0');
    if (state.bwTimer <= 0) {
      clearInterval(state.bwInterval);
      state.backwashActive = false;
      if (banner) banner.style.display = 'none';
      addLog('Backwash selesai — solenoid valve menutup, sistem kembali normal', 'green');
    }
  }, 1000);
}

// ---- LOG ----
function addLog(msg, color) {
  const now = new Date();
  const t = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
  const list = document.getElementById('log-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML =
    '<span class="log-time">' + t + '</span>' +
    '<span class="log-dot ' + color + '"></span>' +
    '<span class="log-msg">' + msg + '</span>';

  list.insertBefore(item, list.firstChild);

  // Keep max 20 entries
  while (list.children.length > 20) {
    list.removeChild(list.lastChild);
  }
}

// ---- LIVE JITTER (non-sim mode) ----
function startLiveUpdates() {
  state.liveInterval = setInterval(() => {
    if (state.simMode) return;

    const last = state.turbData[state.turbData.length - 1];
    const jitter = +(Math.random() * 0.6 - 0.3).toFixed(2);
    const next = Math.max(1.5, Math.min(5.8, last + jitter));

    state.turbData = [...state.turbData.slice(1), next];
    updateTrendChart();
    updateMetrics(next, state.currentTds, state.currentFlow, state.currentLife);

    document.getElementById('last-sync').textContent =
      'Sinkronisasi: baru saja · ' + new Date().toLocaleTimeString('id-ID');
  }, 4000);
}

// ---- SIMULATION ----
function toggleSim() {
  const btn = document.getElementById('btn-sim');
  state.simMode = !state.simMode;

  if (state.simMode) {
    state.simStep = 0;
    if (btn) btn.classList.add('active');
    if (btn) btn.textContent = 'Stop Sim';
    addLog('Simulasi skenario kenaikan turbidity dimulai...', 'blue');

    state.simInterval = setInterval(() => {
      if (state.simStep >= SIM_SCENARIO.length) {
        stopSim();
        return;
      }

      const t = SIM_SCENARIO[state.simStep];
      const tds = Math.round(state.currentTds + state.simStep * 2.5);
      const flow = Math.max(1.0, state.currentFlow - state.simStep * 0.05);
      const life = Math.max(5, state.currentLife - state.simStep * 5);

      state.turbData = [...state.turbData.slice(1), t];
      updateTrendChart();
      updateMetrics(t, tds, flow, life);

      const p1 = Math.min(95, 28 + state.simStep * 6);
      const p2 = Math.min(95, 27 + state.simStep * 7);
      const p3 = Math.min(95, 19 + state.simStep * 4);
      updateSaturation(p1, p2, p3);

      state.simStep++;
    }, 1800);

  } else {
    stopSim();
  }
}

function stopSim() {
  clearInterval(state.simInterval);
  state.simMode = false;
  state.simStep = 0;

  const btn = document.getElementById('btn-sim');
  if (btn) { btn.classList.remove('active'); btn.textContent = 'Simulasi'; }

  // Reset
  state.turbData = [...BASE_TURB];
  state.tdsData = [...BASE_TDS];
  updateTrendChart();
  updateMetrics(4.2, 187, 2.1, 73);
  updateSaturation(28, 27, 19);

  addLog('Simulasi dihentikan — data kembali ke kondisi baseline', 'blue');
}
