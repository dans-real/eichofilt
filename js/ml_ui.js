/* ============================================
   EICHOFILT — ml_ui.js
   Render confusion matrix, feature importance,
   per-class table, decision tree SVG
   ============================================ */

// ── CONFUSION MATRIX ──────────────────────────────────────────────────────
function renderConfusionMatrix(cm) {
  const grid   = document.getElementById('cm-grid');
  if (!grid) return;

  const labels = ['N', 'BW', 'GM'];
  const flat   = cm.flat();
  const maxVal = Math.max(...flat);

  grid.innerHTML = '';

  for (let row = 0; row < 3; row++) {
    // Y-axis label
    const yLabel = document.createElement('div');
    yLabel.className = 'cm-label-y';
    yLabel.textContent = labels[row];
    grid.appendChild(yLabel);

    for (let col = 0; col < 3; col++) {
      const val  = cm[row][col];
      const norm = val / maxVal;

      const cell = document.createElement('div');
      cell.className = 'cm-cell';

      if (row === col) {
        cell.classList.add(norm > 0.5 ? 'high' : 'medium');
      } else {
        cell.classList.add(val > 0 ? 'low' : 'zero');
      }

      cell.textContent = val;
      cell.title = `Aktual: ${ML_METRICS.class_names[row]}, Prediksi: ${ML_METRICS.class_names[col]}, Count: ${val}`;

      // Animate in
      cell.style.opacity = '0';
      cell.style.transform = 'scale(0.85)';
      setTimeout(() => {
        cell.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        cell.style.opacity = '1';
        cell.style.transform = 'scale(1)';
      }, (row * 3 + col) * 40);

      grid.appendChild(cell);
    }
  }
}

// ── FEATURE IMPORTANCE ────────────────────────────────────────────────────
function renderFeatureImportance(fi) {
  const list = document.getElementById('fi-list');
  if (!list) return;

  const maxImp = fi[0].importance;
  const colors = [
    '#0F6E56','#1D9E75','#2EB888',
    '#378ADD','#5A9EDE','#7DB8E6',
    '#EF9F27','#F5BC60','#9A9892','#B4B2A9'
  ];

  list.innerHTML = fi.map((item, i) => {
    const pct    = (item.importance / maxImp * 100).toFixed(0);
    const color  = colors[i] || colors[colors.length - 1];
    return `
      <div class="fi-row">
        <span class="fi-rank">${i + 1}</span>
        <span class="fi-label" title="${item.name}">${item.label}</span>
        <div class="fi-bar-wrap">
          <div class="fi-bar" style="width:0%;background:${color}"
               data-target="${pct}"></div>
        </div>
        <span class="fi-val">${(item.importance * 100).toFixed(1)}%</span>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(() => {
    list.querySelectorAll('.fi-bar').forEach(bar => {
      bar.style.transition = 'width 0.8s ease';
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);
}

// ── PER-CLASS TABLE ────────────────────────────────────────────────────────
function renderPerClassTable(pcm) {
  const tbody = document.getElementById('pcm-tbody');
  if (!tbody) return;

  tbody.innerHTML = Object.entries(pcm).map(([name, m]) => {
    const color = CLASS_COLORS[name] || '#888';
    const f1Color = m.f1 >= 0.95 ? '#1D9E75' : m.f1 >= 0.85 ? '#EF9F27' : '#E24B4A';
    return `
      <tr>
        <td>
          <span class="pcm-badge" style="background:${color}"></span>
          ${name}
        </td>
        <td>${(m.precision * 100).toFixed(2)}%</td>
        <td>${(m.recall * 100).toFixed(2)}%</td>
        <td style="color:${f1Color};font-weight:700">${(m.f1 * 100).toFixed(2)}%</td>
        <td style="color:var(--text-muted)">${m.support}</td>
      </tr>
    `;
  }).join('');
}

// ── PRECISION-RECALL CHART ─────────────────────────────────────────────────
let prChart = null;

function renderPRChart(pcm) {
  const ctx = document.getElementById('prChart');
  if (!ctx) return;

  const labels = Object.keys(pcm);
  const prec   = labels.map(k => +(pcm[k].precision * 100).toFixed(2));
  const rec    = labels.map(k => +(pcm[k].recall * 100).toFixed(2));
  const colors = labels.map(k => CLASS_COLORS[k]);

  if (prChart) prChart.destroy();

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tickColor = isDark ? '#6A6A64' : '#9A9892';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  prChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Precision (%)',
          data: prec,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Recall (%)',
          data: rec,
          backgroundColor: colors.map(c => c + '55'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
          borderDash: [4, 2],
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { font: { size: 10 }, color: tickColor, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10 }, color: tickColor },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          min: 85, max: 100,
          ticks: {
            font: { size: 10 }, color: tickColor,
            callback: v => v + '%'
          },
          grid: { color: gridColor },
          border: { display: false }
        }
      }
    }
  });
}

// ── LIVE INFERENCE SLIDERS ────────────────────────────────────────────────
function renderInferSliders(sliders) {
  const container = document.getElementById('infer-sliders');
  if (!container) return;

  container.innerHTML = sliders.map(s => `
    <div class="infer-slider-row">
      <span class="isr-label">${s.label}</span>
      <input type="range"
             class="isr-slider"
             id="slider-${s.id}"
             min="${s.min}" max="${s.max}" step="${s.step}"
             value="${s.default}"
             oninput="onSliderChange()" />
      <span class="isr-val" id="val-${s.id}">${s.default}${s.unit ? ' ' + s.unit : ''}</span>
    </div>
  `).join('');
}

// ── MODEL CONFIG ──────────────────────────────────────────────────────────
function renderModelConfig(config) {
  const grid = document.getElementById('cfg-grid');
  if (!grid) return;

  grid.innerHTML = config.map(item => `
    <div class="cfg-row">
      <span class="cfg-key">${item.key}</span>
      <span class="cfg-val">${item.val}</span>
    </div>
  `).join('');
}

// ── DECISION TREE SVG ─────────────────────────────────────────────────────
function renderDecisionTree() {
  const wrap = document.getElementById('tree-wrap');
  if (!wrap) return;

  const W = 480, H = 280;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark ? '#F0EFE9' : '#1A1A18';
  const subColor  = isDark ? '#6A6A64' : '#9A9892';
  const border    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const bg        = isDark ? '#2A2A28' : '#FFFFFF';
  const bgSec     = isDark ? '#1C1C1A' : '#F4F3EF';

  const nodes = [
    // Root
    { id: 0, x: 240, y: 30,  label: 'turbidity_ntu',    cond: '≤ 7.0',   color: '#378ADD', type: 'split' },
    // Level 1
    { id: 1, x: 100, y: 100, label: 'hours_since_bw',   cond: '≤ 72h',   color: '#378ADD', type: 'split' },
    { id: 2, x: 380, y: 100, label: 'tds_ppm',          cond: '≤ 600',   color: '#378ADD', type: 'split' },
    // Level 2
    { id: 3, x: 40,  y: 185, label: 'Normal',           cond: '410/418', color: '#1D9E75', type: 'leaf'  },
    { id: 4, x: 160, y: 185, label: 'Perlu Backwash',   cond: '98/107',  color: '#EF9F27', type: 'leaf'  },
    { id: 5, x: 310, y: 185, label: 'Perlu Backwash',   cond: '89/107',  color: '#EF9F27', type: 'leaf'  },
    { id: 6, x: 450, y: 185, label: 'Ganti Membran',    cond: '50/51',   color: '#E24B4A', type: 'leaf'  }
  ];

  const edges = [
    { from: 0, to: 1, label: 'Ya (≤7)' },
    { from: 0, to: 2, label: 'Tidak (>7)' },
    { from: 1, to: 3, label: 'Ya' },
    { from: 1, to: 4, label: 'Tidak' },
    { from: 2, to: 5, label: 'Ya' },
    { from: 2, to: 6, label: 'Tidak' }
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const edgeSVG = edges.map(e => {
    const s = nodeMap[e.from];
    const t = nodeMap[e.to];
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    return `
      <path d="M${s.x},${s.y + 20} C${s.x},${my} ${t.x},${my} ${t.x},${t.y - 20}"
            fill="none" stroke="${border.replace('0.08','0.3')}" stroke-width="1.2"/>
      <text x="${mx + (t.x > s.x ? 6 : -6)}" y="${my}"
            font-size="9" fill="${subColor}"
            text-anchor="${t.x > s.x ? 'start' : 'end'}"
            font-family="DM Sans, sans-serif">${e.label}</text>
    `;
  }).join('');

  const nodeSVG = nodes.map(n => {
    const isLeaf = n.type === 'leaf';
    const rw = isLeaf ? 60 : 70;
    const rh = isLeaf ? 34 : 34;
    return `
      <g transform="translate(${n.x},${n.y})">
        <rect x="${-rw/2}" y="${-rh/2}" width="${rw}" height="${rh}"
              rx="8"
              fill="${isLeaf ? n.color + '22' : bgSec}"
              stroke="${n.color}"
              stroke-width="${isLeaf ? 1.5 : 1}"
        />
        <text y="${isLeaf ? -4 : -4}" text-anchor="middle"
              font-size="${isLeaf ? 9 : 9}"
              font-weight="600"
              fill="${isLeaf ? n.color : textColor}"
              font-family="DM Sans, sans-serif">${n.label}</text>
        <text y="10" text-anchor="middle"
              font-size="8.5"
              fill="${subColor}"
              font-family="Space Mono, monospace">${n.cond}</text>
      </g>
    `;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-label="Visualisasi decision tree EICHOFILT">
      ${edgeSVG}
      ${nodeSVG}
    </svg>
  `;
}

// ── INFERENCE RESULT DISPLAY ──────────────────────────────────────────────
function displayInferenceResult(pred, probs) {
  const classEl = document.getElementById('infer-class');
  const confEl  = document.getElementById('infer-conf');
  const probsEl = document.getElementById('infer-probs');
  const badge   = document.getElementById('infer-badge');

  if (!classEl) return;

  const names  = ML_METRICS.class_names;
  const colors = Object.values(CLASS_COLORS);

  classEl.textContent = names[pred];
  classEl.className   = `infer-result-class cls-${pred}`;

  const conf = (probs[pred] * 100).toFixed(1);
  confEl.textContent = `Keyakinan model: ${conf}%`;

  const badgeLabels  = ['normal', 'backwash', 'ganti'];
  const badgeClasses = ['normal', 'backwash', 'replace'];
  badge.textContent  = badgeLabels[pred];
  badge.className    = `panel-badge ${badgeClasses[pred]}`;

  probsEl.innerHTML = names.map((name, i) => `
    <div class="ipb-row">
      <span class="ipb-label">${name}</span>
      <div class="ipb-track">
        <div class="ipb-fill" style="width:${(probs[i]*100).toFixed(1)}%;background:${colors[i]}"></div>
      </div>
      <span class="ipb-pct">${(probs[i]*100).toFixed(1)}%</span>
    </div>
  `).join('');
}

// ── STAT CARD UPDATER ─────────────────────────────────────────────────────
function updateStatCards(metrics) {
  const acc = document.getElementById('stat-acc');
  const auc = document.getElementById('stat-auc');
  const cv  = document.getElementById('stat-cv');
  if (acc) acc.textContent = (metrics.accuracy * 100).toFixed(2) + '%';
  if (auc) auc.textContent = metrics.roc_auc.toFixed(4);
  if (cv)  cv.textContent  = (metrics.cv_mean * 100).toFixed(2) + '%';
}
