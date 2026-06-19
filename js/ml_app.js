/* ==========================================================================
   EICHOFILT — ml_app.js
   Logika Interaktif Halaman AI Analytics: Sandbox Slider Real-time Prediction
   ========================================================================== */
'use strict';

function onSandboxSliderChange() {
  const turbEl = document.getElementById('sl-turb');
  const tdsEl = document.getElementById('sl-tds');
  const flowEl = document.getElementById('sl-flow');
  const lifeEl = document.getElementById('sl-life');
  if (!turbEl || !tdsEl || !flowEl || !lifeEl) return;

  const turb = parseFloat(turbEl.value);
  const tds = parseFloat(tdsEl.value);
  const flow = parseFloat(flowEl.value);
  const life = parseFloat(lifeEl.value);

  document.getElementById('vsl-turb').textContent = turb.toFixed(2) + ' NTU';
  document.getElementById('vsl-tds').textContent = tds + ' ppm';
  document.getElementById('vsl-flow').textContent = flow.toFixed(1) + ' L/min';
  document.getElementById('vsl-life').textContent = life + '%';

  const hours = 12; // Static baseline
  const result = rfClassify(turb, tds, flow, 7.2, hours, 0.2);
  const names = ['Normal', 'Perlu Backwash', 'Ganti Membran'];
  const colors = ['var(--ok)', 'var(--warn)', 'var(--crit)'];

  const rEl = document.getElementById('sandbox-result');
  const cEl = document.getElementById('sandbox-conf');

  if (rEl) {
    rEl.textContent = names[result.prediction];
    rEl.style.color = colors[result.prediction];
  }
  if (cEl) {
    cEl.textContent = (result.probabilities[result.prediction] * 100).toFixed(1) + '%';
  }
}
