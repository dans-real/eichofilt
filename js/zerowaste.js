/* ==========================================================================
   EICHOFILT — zerowaste.js
   Rendering Dampak Ekologis Zero-Waste: Gauge Residu & Status Wadah Aquatup
   ========================================================================== */
'use strict';

function renderZeroWasteMetrics() {
  const fillPct = state.zwAquatup;
  const residuVal = state.zwResidu;

  const gaugeFill = document.getElementById('gauge-fill');
  const gaugeVal = document.getElementById('gauge-val');

  if (gaugeFill) {
    const offset = 251.2 - (fillPct / 100) * 125.6;
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.style.stroke = fillPct > 80 ? 'var(--crit)' : fillPct > 50 ? 'var(--warn)' : 'var(--ok)';
  }
  if (gaugeVal) {
    gaugeVal.textContent = fillPct + '%';
  }

  const zrVal = document.getElementById('zw-residu-val');
  const zrTag = document.getElementById('zw-residu-tag');
  if (zrVal) zrVal.textContent = '~' + residuVal.toFixed(1) + ' gram';
  if (zrTag) {
    if (residuVal >= 30.0) {
      zrTag.className = 'residu-tag crit';
      zrTag.textContent = 'Penuh! Ganti Filter';
      zrTag.style.background = 'var(--crit-l)';
      zrTag.style.color = 'var(--crit)';
    } else if (residuVal >= 20.0) {
      zrTag.className = 'residu-tag warn';
      zrTag.textContent = 'Menumpuk';
      zrTag.style.background = 'var(--warn-l)';
      zrTag.style.color = 'var(--warn)';
    } else {
      zrTag.className = 'residu-tag low';
      zrTag.textContent = 'Aman';
      zrTag.style.background = 'var(--ok-l)';
      zrTag.style.color = 'var(--ok)';
    }
  }
}

function handleCleanWadah() {
  state.zwAquatup = 0;
  state.zwResidu = 0.0;
  renderZeroWasteMetrics();
  saveLogToMySQL('Wadah residu ekologis Aquatup berhasil dibersihkan secara manual oleh pengguna.', 'info');
  showToast('🧹 Wadah Aquatup Dibersihkan!');
}

function saveMockSettings() {
  const token = document.getElementById('cfg-token').value;
  const phone = document.getElementById('cfg-wa').value;
  saveLogToMySQL(`Konfigurasi API WhatsApp Fonnte Berhasil. Target notifikasi: ${phone}`, 'info');
  showToast('📤 Pesan Uji Terkirim!');
}
