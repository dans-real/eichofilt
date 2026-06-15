/* ============================================
   EICHOFILT — ml_app.js
   ML page controller:
   - sidebar toggle
   - render semua komponen
   - live inference dari slider
   - random forest classify (rule-based mirror)
   ============================================ */

// ── RANDOM FOREST CLASSIFIER (mirroring eichofilt_model.h) ────────────────
function rfClassify(turb, tds, flow, ph, hours, turbRoc) {
  // Mirror dari rules yang di-export ke C header
  // Ini adalah simplified inference untuk browser-side demo
  const turbMean = turb; // simplified (no rolling buffer di browser)
  const turbStd  = Math.abs(turbRoc * 0.3);

  // Probabilitas softmax-style (rule-weighted)
  let scores = [0, 0, 0];

  // Fitur kunci sesuai feature importance
  // 1. turbidity_ntu (34.12%)
  if      (turb > 12)  scores[2] += 0.90;
  else if (turb > 9)   scores[1] += 0.65;
  else if (turb > 7)   scores[1] += 0.45;
  else if (turb > 5)   scores[1] += 0.20;
  else                 scores[0] += 0.34;

  // 2. hours_since_bw (21.89%)
  if      (hours > 96) scores[2] += 0.30;
  else if (hours > 72) scores[1] += 0.55;
  else if (hours > 48) scores[1] += 0.25;
  else                 scores[0] += 0.22;

  // 3. turb_roc (15.34%)
  if      (turbRoc > 3.0)  scores[2] += 0.20;
  else if (turbRoc > 1.5)  scores[1] += 0.30;
  else if (turbRoc > 0.5)  scores[1] += 0.10;
  else                     scores[0] += 0.15;

  // 4. flow_rate_lpm (9.23%)
  if      (flow < 0.6)  scores[2] += 0.25;
  else if (flow < 1.0)  scores[1] += 0.20;
  else if (flow < 1.5)  scores[1] += 0.08;
  else                  scores[0] += 0.09;

  // 5. tds_ppm (5.87%)
  if      (tds > 600)   scores[2] += 0.15;
  else if (tds > 350)   scores[1] += 0.10;
  else                  scores[0] += 0.06;

  // Normalize to probabilities
  const total = scores.reduce((a, b) => a + b, 0) || 1;
  const probs = scores.map(s => Math.max(0, Math.min(1, s / total)));

  // Softmax
  const expScores = scores.map(s => Math.exp(s * 3));
  const expTotal  = expScores.reduce((a, b) => a + b, 0);
  const softProbs = expScores.map(s => s / expTotal);

  const pred = softProbs.indexOf(Math.max(...softProbs));
  return { prediction: pred, probabilities: softProbs };
}

// ── SLIDER CHANGE HANDLER ─────────────────────────────────────────────────
function onSliderChange() {
  const getVal = id => parseFloat(document.getElementById('slider-' + id)?.value || 0);

  const turb    = getVal('turb');
  const tds     = getVal('tds');
  const flow    = getVal('flow');
  const ph      = getVal('ph');
  const hours   = getVal('hours');
  const turbRoc = getVal('turbRoc');

  // Update value displays
  const updates = {
    turb:    { val: turb,    unit: ' NTU' },
    tds:     { val: tds,     unit: ' ppm' },
    flow:    { val: flow.toFixed(1), unit: ' L/mnt' },
    ph:      { val: ph.toFixed(1),   unit: '' },
    hours:   { val: Math.round(hours), unit: ' jam' },
    turbRoc: { val: turbRoc.toFixed(1), unit: ' Δ' }
  };

  Object.entries(updates).forEach(([id, { val, unit }]) => {
    const el = document.getElementById('val-' + id);
    if (el) el.textContent = val + unit;
  });

  // Run inference
  const result = rfClassify(turb, tds, flow, ph, hours, turbRoc);
  displayInferenceResult(result.prediction, result.probabilities);

  // Color-code slider thumbs based on risk
  const sliderTurb = document.getElementById('slider-turb');
  if (sliderTurb) {
    const thumbColor = turb > 12 ? '#E24B4A' : turb > 7 ? '#EF9F27' : '#1D9E75';
    sliderTurb.style.setProperty('--thumb-color', thumbColor);
  }
}

// ── RUN INFERENCE BUTTON ──────────────────────────────────────────────────
function runInference() {
  const badge = document.getElementById('ml-status-badge');
  if (badge) {
    badge.textContent = '● inferensi berjalan...';
    badge.className = 'system-badge warn';
  }

  setTimeout(() => {
    onSliderChange(); // re-run with current values
    if (badge) {
      badge.textContent = '● model aktif';
      badge.className = 'system-badge';
    }
    showToast('Inferensi selesai — hasil diperbarui');
  }, 600);
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────
function initSidebar() {
  const btn  = document.getElementById('sidebar-toggle');
  const side = document.getElementById('sidebar');
  const main = document.querySelector('.main-content');
  if (!btn || !side) return;

  btn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      side.classList.toggle('mobile-open');
    } else {
      side.classList.toggle('collapsed');
      main?.classList.toggle('expanded');
    }
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Render semua komponen
  updateStatCards(ML_METRICS);
  renderConfusionMatrix(CONFUSION_MATRIX);
  renderFeatureImportance(FEATURE_IMPORTANCE);
  renderPerClassTable(PER_CLASS_METRICS);
  renderPRChart(PER_CLASS_METRICS);
  renderInferSliders(INFER_SLIDERS);
  renderModelConfig(MODEL_CONFIG);
  renderDecisionTree();

  // Sidebar
  initSidebar();

  // Button
  const inferBtn = document.getElementById('btn-infer');
  if (inferBtn) inferBtn.addEventListener('click', runInference);

  // Run initial inference dengan default slider values
  setTimeout(() => {
    onSliderChange();
  }, 300);

  console.log('[EICHOFILT ML] Analytics page loaded.');
});
