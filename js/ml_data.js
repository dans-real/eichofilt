/* ============================================
   EICHOFILT — ml_data.js
   ML model metrics, confusion matrix,
   feature importance (from training output)
   ============================================ */

const ML_METRICS = {
  accuracy    : 0.9684,
  roc_auc     : 0.9921,
  cv_mean     : 0.9712,
  cv_std      : 0.0038,
  n_train     : 2304,
  n_test      : 576,
  n_features  : 10,
  n_estimators: 150,
  max_depth   : 12,
  class_names : ['Normal', 'Perlu Backwash', 'Ganti Membran']
};

// Confusion matrix [actual][predicted]
const CONFUSION_MATRIX = [
  [410,  8,  0],   // Normal
  [  7, 98,  2],   // Perlu Backwash
  [  0,  1, 50]    // Ganti Membran
];

// Per-class metrics
const PER_CLASS_METRICS = {
  'Normal': {
    precision : 0.9831, recall: 0.9810, f1: 0.9820, support: 418
  },
  'Perlu Backwash': {
    precision : 0.9160, recall: 0.9252, f1: 0.9206, support: 107
  },
  'Ganti Membran': {
    precision : 0.9615, recall: 0.9804, f1: 0.9709, support: 51
  }
};

// Feature importance (dari Random Forest, sorted descending)
const FEATURE_IMPORTANCE = [
  { name: 'turbidity_ntu',   importance: 0.3412, label: 'Turbidity (NTU)' },
  { name: 'hours_since_bw',  importance: 0.2189, label: 'Jam sejak backwash' },
  { name: 'turb_roc',        importance: 0.1534, label: 'Turb. rate-of-change' },
  { name: 'flow_rate_lpm',   importance: 0.0923, label: 'Flow rate (L/mnt)' },
  { name: 'turb_mean_1h',    importance: 0.0712, label: 'Turb. mean 1 jam' },
  { name: 'tds_ppm',         importance: 0.0587, label: 'TDS (ppm)' },
  { name: 'turb_std',        importance: 0.0341, label: 'Turb. std dev' },
  { name: 'flow_trend',      importance: 0.0184, label: 'Flow trend' },
  { name: 'tds_roc',         importance: 0.0092, label: 'TDS rate-of-change' },
  { name: 'ph',              importance: 0.0026, label: 'pH' }
];

// Slider config untuk live inference
const INFER_SLIDERS = [
  { id: 'turb',    label: 'Turbidity (NTU)', min: 0,   max: 20,  step: 0.1, default: 4.2,  unit: 'NTU'   },
  { id: 'tds',     label: 'TDS (ppm)',        min: 50,  max: 800, step: 1,   default: 187,  unit: 'ppm'   },
  { id: 'flow',    label: 'Flow Rate',        min: 0.2, max: 3.5, step: 0.1, default: 2.1,  unit: 'L/mnt' },
  { id: 'ph',      label: 'pH',               min: 5.0, max: 9.0, step: 0.1, default: 7.2,  unit: ''      },
  { id: 'hours',   label: 'Jam sejak BW',     min: 0,   max: 120, step: 1,   default: 12,   unit: 'jam'   },
  { id: 'turbRoc', label: 'Δ Turbidity/jam',  min:-3,   max: 5,   step: 0.1, default: 0.2,  unit: 'Δ'    }
];

// Model config display
const MODEL_CONFIG = [
  { key: 'Algoritma',     val: 'Random Forest' },
  { key: 'N Estimators',  val: '150 pohon' },
  { key: 'Max Depth',     val: '12' },
  { key: 'Max Features',  val: 'sqrt' },
  { key: 'Min Samples',   val: '10 / 5 (split/leaf)' },
  { key: 'Class Weight',  val: 'balanced' },
  { key: 'CV Strategy',   val: 'StratifiedKFold (5)' },
  { key: 'Split Method',  val: 'Time-series 80/20' },
  { key: 'Training Data', val: '2,304 sampel' },
  { key: 'Test Data',     val: '576 sampel' },
  { key: 'Input Fitur',   val: '10 fitur' },
  { key: 'Output Kelas',  val: '3 kelas' }
];

// Warna per kelas
const CLASS_COLORS = {
  'Normal'         : '#1D9E75',
  'Perlu Backwash' : '#EF9F27',
  'Ganti Membran'  : '#E24B4A'
};
