/* ==========================================================================
   EICHOFILT — core.js
   Mock Database Simulator, Global State, Navigation Engine, Toast System
   ========================================================================== */
'use strict';

/* ── MOCK DATABASE SIMULATOR (Menggantikan api.php + MySQL agar langsung bisa diuji) ── */
const MockMySQL = {
  data_sensor: [
    { id: 1, turbidity: 0.35, tds: 125, flow_rate: 18.5, membrane_life: 95, p1_saturation: 25, p2_saturation: 24, p3_saturation: 15, waktu: new Date(Date.now() - 3600000 * 3) },
    { id: 2, turbidity: 0.38, tds: 128, flow_rate: 18.7, membrane_life: 93, p1_saturation: 27, p2_saturation: 25, p3_saturation: 17, waktu: new Date(Date.now() - 3600000 * 2) },
    { id: 3, turbidity: 0.35, tds: 128, flow_rate: 18.7, membrane_life: 92, p1_saturation: 28, p2_saturation: 27, p3_saturation: 19, waktu: new Date() }
  ],
  log_aktivitas: [
    { id: 1, pesan: "Sistem EICHOFILT Berhasil Dimulai di Localhost", tipe_tag: "info", waktu: new Date(Date.now() - 60000 * 5) },
    { id: 2, pesan: "ESP32 Berhasil Sinkronisasi dengan Broker MQTT", tipe_tag: "info", waktu: new Date(Date.now() - 60000 * 4) },
    { id: 3, pesan: "Inisialisasi Database eichofilt_db Sukses!", tipe_tag: "info", waktu: new Date() }
  ],

  query: function(action, payload) {
    if (action === 'history') {
      return Promise.resolve(this.data_sensor.slice(-24));
    }
    if (action === 'log') {
      return Promise.resolve(this.log_aktivitas.slice(-20).reverse());
    }
    if (action === 'save_sensor') {
      const newRow = {
        id: this.data_sensor.length + 1,
        turbidity: payload.turbidity,
        tds: payload.tds,
        flow_rate: payload.flow_rate,
        membrane_life: payload.membrane_life,
        p1_saturation: payload.p1 || 28,
        p2_saturation: payload.p2 || 27,
        p3_saturation: payload.p3 || 19,
        waktu: new Date()
      };
      this.data_sensor.push(newRow);
      return Promise.resolve({ message: "Data sensor berhasil disimpan ke MySQL", id: newRow.id });
    }
    if (action === 'save_log') {
      const newLog = {
        id: this.log_aktivitas.length + 1,
        pesan: payload.pesan,
        tipe_tag: payload.tipe_tag || 'info',
        waktu: new Date()
      };
      this.log_aktivitas.push(newLog);
      return Promise.resolve({ message: "Log berhasil disimpan ke MySQL" });
    }
    return Promise.reject("Aksi query tidak dikenal.");
  }
};

/* ── DATA.JS akan mendefinisikan THRESHOLDS & state (lihat data.js) ── */

/* ── NAVIGATION ENGINE ── */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pg = document.getElementById('page-' + pageId);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    const isActive = n.dataset.page === pageId;
    n.classList.toggle('active', isActive);
    n.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

/* ── TOAST ALERT SYSTEM ── */
let _tt;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── CONFIG THEME CONTROLLER (FIXED: localStorage takes full priority) ── */
function applyTheme(isLight) {
  const sunIcon = document.getElementById('theme-sun');
  const moonIcon = document.getElementById('theme-moon');
  const labelSun = document.getElementById('theme-label-sun');
  const labelMoon = document.getElementById('theme-label-moon');

  if (isLight) {
    document.body.classList.add('light-mode');
    if (sunIcon)  sunIcon.style.display  = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
    if (labelSun)  labelSun.style.display  = 'none';
    if (labelMoon) labelMoon.style.display = 'inline';
  } else {
    document.body.classList.remove('light-mode');
    if (sunIcon)  sunIcon.style.display  = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
    if (labelSun)  labelSun.style.display  = 'inline';
    if (labelMoon) labelMoon.style.display = 'none';
  }
}

function initTheme() {
  const btnTheme = document.getElementById('btn-theme');
  if (!btnTheme) return;

  // PRIORITAS: localStorage selalu menang atas system preference
  // Kalau belum pernah pilih (null), default ke DARK (bukan ikut system)
  const savedTheme = localStorage.getItem('eichofilt_theme');
  const isLight = savedTheme === 'light'; // null / 'dark' = dark mode
  applyTheme(isLight);

  btnTheme.addEventListener('click', () => {
    const nowLight = !document.body.classList.contains('light-mode');
    localStorage.setItem('eichofilt_theme', nowLight ? 'light' : 'dark');
    applyTheme(nowLight);

    if (nowLight) {
      showToast('☀️ Mode Terang Aktif');
    } else {
      showToast('🌙 Mode Gelap Aktif');
    }

    if (typeof updateChartTheme === 'function') updateChartTheme();
    if (typeof renderDecisionTreeSVG === 'function') renderDecisionTreeSVG();
    if (typeof updateMetrics === 'function') {
      updateMetrics(state.currentTurb, state.currentTds, state.currentFlow, state.currentLife);
    }
  });
}
