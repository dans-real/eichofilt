# EICHOFILT v3 — Monitor Air Rumah Pintar

## Filosofi Redesign v3

Berdasarkan studi komparatif produk IoT water monitoring pemenang kompetisi nasional/internasional:
- **Calm Tech** — satu warna dominan, tidak ramai
- **Mobile-First** — bottom nav, bukan sidebar (mengikuti pola Gojek/Grab)
- **Zero Text Bloat** — label singkat, angka besar
- **System Font** — tidak ada Google Fonts blocking render
- **Single JS Bundle** — core.js + ml.js, tidak ada 7 file terpisah
- **Accessible** — ARIA labels, role attributes, aria-live

## Perubahan dari v2

| Aspek | v2 | v3 |
|-------|----|----|
| CSS | 3 file, 1463 baris | 1 file, ~580 baris |
| JS | 7 file (~900 baris) | 2 file (core.js + ml.js) |
| Font | Google Fonts (blocking) | System font stack (instant) |
| Nav mobile | Sidebar overlay | Bottom nav (natural) |
| Nav desktop | Sidebar | Sidebar (tetap) |
| Error handling | Tidak ada guard | Null-safe + try-catch semua |
| ML inference | No input validation | Clamping + NaN guard |
| WA notif | Commented out | Live, null-safe, auto-trigger |
| Accessibility | Minimal | ARIA roles + labels + live regions |

## Cara Jalankan

```bash
# VSCode Live Server (recommended)
# Klik kanan index.html → Open with Live Server

# Python
python -m http.server 8080

# Node
npx serve .
```

## Struktur File

```
eichofilt-v3/
├── index.html        ← Dashboard + Filter + Zero Waste + Settings
├── ml.html           ← ML Analytics
├── css/
│   └── style.css     ← Single CSS, mobile-first
├── js/
│   ├── core.js       ← Semua logika dashboard
│   └── ml.js         ← ML analytics logic
└── assets/
    └── favicon.svg
```

## Integrasi MQTT Real ESP32

Tambahkan di core.js setelah `initNav()`:
```javascript
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
client.subscribe('eichofilt/sensors');
client.on('message', (topic, payload) => {
  const d = JSON.parse(payload.toString());
  S.turb = d.turbidity ?? S.turb;
  S.tds  = d.tds       ?? S.tds;
  S.flow = d.flowRate  ?? S.flow;
  S.life = d.membraneLife ?? S.life;
  updateMetrics();
  updateSaturation(d.sat1 ?? S.sat[0], d.sat2 ?? S.sat[1], d.sat3 ?? S.sat[2]);
});
```

## Fonnte WhatsApp

Isi di halaman Pengaturan:
- Nomor: format `628xxxxxxxxx`
- Token: dari `dashboard.fonnte.com`

Notifikasi otomatis terkirim saat:
- Turbidity kritis (backwash aktif)
- Backwash selesai (jika token sudah diisi)
