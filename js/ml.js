/* ==========================================================================
   EICHOFILT — ml.js
   Machine Learning Random Forest Classifier Engine (Rule-based simulation)
   ========================================================================== */
'use strict';

function rfClassify(turb, tds, flow, ph, hours, turbRoc) {
  let scores = [0, 0, 0]; // [Normal, Perlu Backwash, Ganti Membran]

  if (turb > 12) scores[2] += 0.90;
  else if (turb > 7) scores[1] += 0.65;
  else if (turb > 3) scores[1] += 0.25;
  else scores[0] += 0.35;

  if (hours > 72) scores[1] += 0.50;
  else scores[0] += 0.20;

  if (flow < 5.0) scores[2] += 0.35;
  else scores[0] += 0.15;

  if (tds > 400) scores[2] += 0.15;

  const expScores = scores.map(s => Math.exp(s * 3.0));
  const total = expScores.reduce((a, b) => a + b, 0);
  const softProbs = expScores.map(s => s / total);

  const pred = softProbs.indexOf(Math.max(...softProbs));
  return { prediction: pred, probabilities: softProbs };
}
