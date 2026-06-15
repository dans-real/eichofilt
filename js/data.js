/* ============================================
   EICHOFILT — data.js
   Sensor baseline data, constants, state
   ============================================ */

const THRESHOLDS = {
  turbidity: { warn: 6, crit: 10 },
  tds: { warn: 300, crit: 500 },
  flowRate: { warn: 1.2 },
  membrane: { warn: 40, crit: 20 }
};

const BASE_TURB = [
  2.1, 1.9, 2.0, 2.2, 2.4, 2.8, 3.1, 3.5,
  4.0, 4.2, 4.1, 3.9, 3.8, 4.0, 4.3, 4.8,
  5.1, 4.6, 4.2, 3.9, 3.7, 3.5, 3.8, 4.2
];

const BASE_TDS = [
  175, 172, 170, 174, 178, 182, 185, 188,
  190, 187, 186, 184, 183, 185, 188, 192,
  195, 190, 187, 184, 182, 180, 183, 187
];

const SIM_SCENARIO = [8.2, 9.5, 11.2, 12.8, 13.5, 10.1, 7.2, 5.1, 4.3, 3.8, 4.1];

const EFFICIENCY_DATA = {
  labels: ['<10μm', '10–25μm', '25–50μm', '50–75μm', '75–100μm', '>100μm'],
  values: [41, 45, 49, 53, 58, 72]
};

const BACKWASH_DATA = {
  labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  values: [0, 1, 0, 2, 1, 2, 1]
};

// App state
const state = {
  turbData: [...BASE_TURB],
  tdsData: [...BASE_TDS],
  simMode: false,
  simStep: 0,
  simInterval: null,
  liveInterval: null,
  backwashActive: false,
  bwTimer: 0,
  bwInterval: null,
  saturation: { p1: 28, p2: 27, p3: 19 },
  currentTurb: 4.2,
  currentTds: 187,
  currentFlow: 2.1,
  currentLife: 73
};
