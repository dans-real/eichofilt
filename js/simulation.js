/* ==========================================================================
   EICHOFILT — simulation.js
   Simpan Sensor ke MySQL (Mock), Update Metrics, Auto-Backwash, Mode Simulasi
   ========================================================================== */
'use strict';

function saveSensorToMySQL(turb, tds, flow, life) {
  MockMySQL.query('save_sensor', {
    turbidity: turb,
    tds: tds,
    flow_rate: flow,
    membrane_life: life,
    p1: state.saturation.p1,
    p2: state.saturation.p2,
    p3: state.saturation.p3
  }).then(res => {
    const syncEl = document.getElementById('last-sync');
    if (syncEl) syncEl.textContent = 'Sinkronisasi Database MySQL: Berhasil (ID: ' + res.id + ')';
  });
}

function saveLogToMySQL(msg, type) {
  MockMySQL.query('save_log', { pesan: msg, tipe_tag: type }).then(() => {
    updateLogListFromDB();
  });
}

function updateMetrics(turb, tds, flow, life) {
  state.currentTurb = turb;
  state.currentTds = tds;
  state.currentFlow = flow;
  state.currentLife = life;

  const mt = document.getElementById('m-turb');
  const mtd = document.getElementById('m-tds');
  const mf = document.getElementById('m-flow');
  const ml = document.getElementById('m-life');

  if (mt) mt.textContent = turb.toFixed(2);
  if (mtd) mtd.textContent = Math.round(tds);
  if (mf) mf.textContent = flow.toFixed(1);
  if (ml) ml.textContent = Math.round(life);

  saveSensorToMySQL(turb, tds, flow, life);

  const dTurb = document.getElementById('d-turb');
  const badge = document.getElementById('sys-badge');
  const badgeText = document.getElementById('badge-text');
  const mlNow = document.getElementById('ml-now');

  if (turb >= THRESHOLDS.turbidity.crit) {
    if (dTurb) { dTurb.className = 'metric-status-tag crit'; dTurb.textContent = 'Darurat!'; }
    if (badge) { badge.className = 'crit-badge'; }
    if (badgeText) { badgeText.textContent = 'Darurat'; }
    if (mlNow) { mlNow.className = 'ml-badge replace'; mlNow.textContent = 'Ganti Membran'; mlNow.style.background = 'var(--crit-l)'; mlNow.style.color = 'var(--crit)'; mlNow.style.borderColor = 'var(--crit)'; }
    if (!state.backwashActive) triggerBackwash();
  } else if (turb >= THRESHOLDS.turbidity.warn) {
    if (dTurb) { dTurb.className = 'metric-status-tag warn'; dTurb.textContent = 'Perhatian'; }
    if (badge) { badge.className = 'warn-badge'; }
    if (badgeText) { badgeText.textContent = 'Perhatian'; }
    if (mlNow) { mlNow.className = 'ml-badge backwash'; mlNow.textContent = 'Perlu Backwash'; mlNow.style.background = 'var(--warn-l)'; mlNow.style.color = 'var(--warn)'; mlNow.style.borderColor = 'var(--warn)'; }
  } else {
    if (dTurb) { dTurb.className = 'metric-status-tag ok'; dTurb.textContent = 'Baik'; }
    if (badge) { badge.className = 'online-badge'; }
    if (badgeText) { badgeText.textContent = 'Online'; }
    if (mlNow) { mlNow.className = 'ml-badge normal'; mlNow.textContent = 'Normal'; mlNow.style.background = 'var(--ok-l)'; mlNow.style.color = 'var(--ok)'; mlNow.style.borderColor = 'var(--ok)'; }
  }

  // Update TDS status tag
  const dTds = document.getElementById('d-tds');
  if (dTds) {
    if (tds >= THRESHOLDS.tds.crit) { dTds.className = 'metric-status-tag crit'; dTds.textContent = 'Bahaya'; }
    else if (tds >= THRESHOLDS.tds.warn) { dTds.className = 'metric-status-tag warn'; dTds.textContent = 'Perhatian'; }
    else { dTds.className = 'metric-status-tag ok'; dTds.textContent = 'Baik'; }
  }

  // Update Membrane status tag
  const dLife = document.getElementById('d-life');
  if (dLife) {
    if (life <= THRESHOLDS.membrane.crit) { dLife.className = 'metric-status-tag crit'; dLife.textContent = 'Ganti!'; }
    else if (life <= THRESHOLDS.membrane.warn) { dLife.className = 'metric-status-tag warn'; dLife.textContent = 'Dekat Habis'; }
    else { dLife.className = 'metric-status-tag ok'; dLife.textContent = 'Baik'; }
  }

  // Live Machine Learning Real-time Prediction
  const rfRes = rfClassify(turb, tds, flow, 7.2, 12, 0.2);
  const names = ['Normal', 'Perlu Backwash', 'Ganti Membran'];
  const colors = ['var(--ok)', 'var(--warn)', 'var(--crit)'];
  const colorsClasses = ['ai-val-normal', 'ai-val-warn', 'ai-val-crit'];
  const mlNowEl = document.getElementById('ml-now');
  const mlConfEl = document.getElementById('ml-conf');
  const aiResultVal = document.getElementById('ai-result-val');
  const aiConfBadge = document.getElementById('ai-conf-badge');

  if (mlNowEl) {
    mlNowEl.textContent = names[rfRes.prediction];
    mlNowEl.style.color = colors[rfRes.prediction];
    mlNowEl.style.borderColor = colors[rfRes.prediction];
    mlNowEl.style.background = colors[rfRes.prediction] + '15';
  }
  if (mlConfEl) {
    mlConfEl.textContent = 'Keyakinan AI: ' + (rfRes.probabilities[rfRes.prediction] * 100).toFixed(1) + '%';
  }

  // AI Page Hero card update
  if (aiResultVal) {
    aiResultVal.textContent = names[rfRes.prediction];
    aiResultVal.className = 'ai-result-val ' + colorsClasses[rfRes.prediction];
  }
  if (aiConfBadge) {
    const confVal = (rfRes.probabilities[rfRes.prediction] * 100).toFixed(1);
    aiConfBadge.textContent = confVal + '%';
  }
  // Dynamic gradient background on AI hero card by prediction status
  const aiCard = document.getElementById('ai-result-card');
  if (aiCard) {
    aiCard.classList.remove('status-normal', 'status-warn', 'status-crit');
    aiCard.classList.add(['status-normal','status-warn','status-crit'][rfRes.prediction]);
  }
}

function triggerBackwash() {
  if (state.backwashActive) return;
  state.backwashActive = true;
  state.bwTimer = 30;

  const banner = document.getElementById('backwash-banner');
  const timerEl = document.getElementById('bw-timer');
  const notifDot = document.getElementById('notif-dot');
  if (banner) banner.style.display = 'flex';
  if (notifDot) notifDot.style.display = 'block';

  saveLogToMySQL('ALERT: Turbidity terdeteksi tinggi — Smart Auto-Backwash otomatis aktif!', 'warn');
  showToast('⚡ Auto-Backwash Aktif!');

  clearInterval(state.bwInterval);
  state.bwInterval = setInterval(() => {
    state.bwTimer--;
    if (timerEl) timerEl.textContent = '00:' + String(state.bwTimer).padStart(2, '0');
    if (state.bwTimer <= 0) {
      clearInterval(state.bwInterval);
      state.backwashActive = false;
      if (banner) banner.style.display = 'none';
      if (notifDot) notifDot.style.display = 'none';
      saveLogToMySQL('Proses Backwash Mandiri Selesai. Sistem EICHOFILT kembali bersih.', 'info');
      showToast('✅ Backwash Selesai!');

      // Update zero waste impact
      state.zwResidu += 2.5;
      state.zwAquatup = Math.min(100, state.zwAquatup + 5);
      renderZeroWasteMetrics();
    }
  }, 1000);
}

function toggleSim() {
  const btn = document.getElementById('btn-sim');
  state.simMode = !state.simMode;

  if (state.simMode) {
    state.simStep = 0;
    if (btn) { btn.classList.add('active'); btn.textContent = '⏹ Stop Sim'; }
    saveLogToMySQL('Simulasi Kenaikan Polusi Kekeruhan (Turbidity) dimulai oleh Pengguna.', 'info');

    state.simInterval = setInterval(() => {
      if (state.simStep >= SIM_SCENARIO.length) { stopSim(); return; }

      const t = SIM_SCENARIO[state.simStep];
      const tds = Math.round(128 + state.simStep * 18);
      const flow = Math.max(4.0, 18.7 - state.simStep * 1.2);
      const life = Math.max(10, 92 - state.simStep * 6);

      updateMetrics(t, tds, flow, life);
      updateTrendChartFromDB();

      // update filter saturation
      state.saturation.p1 = Math.min(95, 28 + state.simStep * 6);
      state.saturation.p2 = Math.min(95, 27 + state.simStep * 7);
      state.saturation.p3 = Math.min(95, 19 + state.simStep * 4);

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
  if (btn) { btn.classList.remove('active'); btn.textContent = '▶ Simulasi'; }
  saveLogToMySQL('Simulasi dinonaktifkan. Data sensor kembali ke baseline aman.', 'info');
  updateMetrics(0.35, 128, 18.7, 92);
  state.saturation = { p1: 28, p2: 27, p3: 19 };
  updateTrendChartFromDB();
}
