/* ==========================================================================
   EICHOFILT — data.js
   Threshold Konfigurasi & Global State Aplikasi
   ========================================================================== */
'use strict';

const THRESHOLDS = {
  turbidity: { warn: 1.0, crit: 2.0 },
  tds: { warn: 200, crit: 350 },
  flowRate: { warn: 8.0 },
  membrane: { warn: 40, crit: 20 }
};

const state = {
  simMode: false,
  simStep: 0,
  simInterval: null,
  liveInterval: null,
  backwashActive: false,
  bwTimer: 0,
  bwInterval: null,
  saturation: { p1: 28, p2: 27, p3: 19 },
  currentTurb: 0.35,
  currentTds: 128,
  currentFlow: 18.7,
  currentLife: 92,

  // Zero-Waste state
  zwResidu: 14.7,
  zwAquatup: 71,
  zwEcobrick: 0
};

const SIM_SCENARIO = [0.8, 1.2, 1.8, 2.2, 2.5, 1.8, 1.2, 0.8, 0.5, 0.35];
