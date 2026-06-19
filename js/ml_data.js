/* ==========================================================================
   EICHOFILT — ml_data.js
   Data Statis Model: Feature Importance, Confusion Matrix, Statistik Akurasi
   ========================================================================== */
'use strict';

const ML_FEATURE_IMPORTANCE = [
  { label: "Kekeringan / Turbidity (NTU)", score: "34.1%" },
  { label: "Durasi Waktu Operasional", score: "21.9%" },
  { label: "Perubahan Polusi Sensitivitas", score: "15.3%" },
  { label: "Laju Aliran Air (Flow Rate)", score: "9.2%" },
  { label: "Kadar Garam / TDS", score: "5.8%" }
];

const ML_CONFUSION_MATRIX = {
  normal:   { normal: 410, backwash: 8,  ganti: 0 },
  backwash: { normal: 7,   backwash: 98, ganti: 2 },
  ganti:    { normal: 0,   backwash: 1,  ganti: 50 }
};

const ML_STATS = {
  accuracy: "96.84%",
  rocAuc: "0.9921",
  cvMean: "97.12%",
  sampleCount: 576
};
