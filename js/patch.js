/* ==========================================================================
   EICHOFILT — patch.js
   Sinkronisasi Bar Visual: Progress Bar Sensor & Saturasi Filter
   ========================================================================== */
'use strict';

function syncVisualBars() {
  const turb = state.currentTurb;
  const tds = state.currentTds;
  const flow = state.currentFlow;
  const life = state.currentLife;

  const pbTurb = document.getElementById('pb-turb');
  const pbTds = document.getElementById('pb-tds');
  const pbFlow = document.getElementById('pb-flow');
  const pbLife = document.getElementById('pb-life');

  if (pbTurb) { pbTurb.style.width = Math.min(100, (turb / 3) * 100) + '%'; pbTurb.className = 'progress-fill ' + (turb > 2 ? 'red' : 'green'); }
  if (pbTds) { pbTds.style.width = Math.min(100, (tds / 400) * 100) + '%'; pbTds.className = 'progress-fill ' + (tds > 200 ? 'orange' : 'green'); }
  if (pbFlow) { pbFlow.style.width = Math.min(100, (flow / 25) * 100) + '%'; }
  if (pbLife) { pbLife.style.width = life + '%'; pbLife.className = 'progress-fill ' + (life < 30 ? 'red' : 'green'); }

  const pvTurb = document.getElementById('pv-turb');
  const pvTds = document.getElementById('pv-tds');
  const pvFlow = document.getElementById('pv-flow');
  const pvLife = document.getElementById('pv-life');

  if (pvTurb) pvTurb.textContent = turb.toFixed(2) + ' NTU';
  if (pvTds) pvTds.textContent = Math.round(tds) + ' ppm';
  if (pvFlow) pvFlow.textContent = flow.toFixed(1) + ' L/min';
  if (pvLife) pvLife.textContent = Math.round(life) + '%';

  // Filter Bars Saturation Sync
  const fp1 = document.getElementById('fp1');
  const fp2 = document.getElementById('fp2');
  const fp3 = document.getElementById('fp3');

  if (fp1) fp1.textContent = Math.round(state.saturation.p1) + '%';
  if (fp2) fp2.textContent = Math.round(state.saturation.p2) + '%';
  if (fp3) fp3.textContent = Math.round(state.saturation.p3) + '%';

  const ff1 = document.getElementById('ff1');
  const ff2 = document.getElementById('ff2');
  const ff3 = document.getElementById('ff3');

  if (ff1) { ff1.style.width = state.saturation.p1 + '%'; ff1.className = 'filter-fill ' + (state.saturation.p1 > 70 ? 'red' : 'green'); }
  if (ff2) { ff2.style.width = state.saturation.p2 + '%'; ff2.className = 'filter-fill ' + (state.saturation.p2 > 70 ? 'red' : 'green'); }
  if (ff3) { ff3.style.width = state.saturation.p3 + '%'; ff3.className = 'filter-fill ' + (state.saturation.p3 > 70 ? 'red' : 'green'); }
}
