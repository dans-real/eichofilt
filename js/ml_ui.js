/* ==========================================================================
   EICHOFILT — ml_ui.js
   Rendering Feature Importance Bars & Visualisasi Decision Tree SVG
   ========================================================================== */
'use strict';

function renderMLFeatureImportance() {
  const listContainer = document.getElementById('fi-list');
  if (!listContainer) return;

  listContainer.innerHTML = ML_FEATURE_IMPORTANCE.map(item => `
    <div class="feature-row">
      <div class="feature-row-head">
        <span class="feature-name">${item.label}</span>
        <span class="feature-val">${item.score}</span>
      </div>
      <div class="feature-bar">
        <div class="feature-fill" style="width:${item.score}"></div>
      </div>
    </div>
  `).join('');
}

function renderDecisionTreeSVG() {
  const treeContainer = document.getElementById('tree-wrap');
  if (!treeContainer) return;

  treeContainer.innerHTML = `
    <svg viewBox="0 0 500 240" style="width:100%; min-width: 450px;" xmlns="http://www.w3.org/2000/svg">
      <!-- Edges -->
      <path d="M250,30 L130,90" stroke="var(--border)" stroke-width="2" />
      <path d="M250,30 L370,90" stroke="var(--border)" stroke-width="2" />
      <path d="M130,90 L60,160" stroke="var(--border)" stroke-width="2" />
      <path d="M130,90 L200,160" stroke="var(--border)" stroke-width="2" />
      <path d="M370,90 L310,160" stroke="var(--border)" stroke-width="2" />
      <path d="M370,90 L430,160" stroke="var(--border)" stroke-width="2" />

      <!-- Nodes -->
      <g transform="translate(250, 30)">
        <rect x="-65" y="-15" width="130" height="30" rx="8" fill="var(--primary-l)" stroke="var(--primary)" stroke-width="1.5" />
        <text y="5" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--text)">Turbidity &lt;= 2.00</text>
      </g>
      <g transform="translate(130, 90)">
        <rect x="-65" y="-15" width="130" height="30" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="1.5" />
        <text y="5" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text)">TDS &lt;= 200</text>
      </g>
      <g transform="translate(370, 90)">
        <rect x="-60" y="-15" width="120" height="30" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="1.5" />
        <text y="5" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text)">Aliran &gt;= 8.0</text>
      </g>

      <!-- Leaves -->
      <g transform="translate(60, 160)">
        <rect x="-45" y="-12" width="90" height="24" rx="6" fill="var(--ok-l)" stroke="var(--ok)" stroke-width="1.5" />
        <text y="4" text-anchor="middle" font-size="9" font-weight="900" fill="var(--ok)">Normal (N)</text>
      </g>
      <g transform="translate(200, 160)">
        <rect x="-45" y="-12" width="90" height="24" rx="6" fill="var(--warn-l)" stroke="var(--warn)" stroke-width="1" />
        <text y="4" text-anchor="middle" font-size="9" font-weight="900" fill="var(--warn)">Perlu Backwash</text>
      </g>
      <g transform="translate(310, 160)">
        <rect x="-45" y="-12" width="90" height="24" rx="6" fill="var(--warn-l)" stroke="var(--warn)" stroke-width="1" />
        <text y="4" text-anchor="middle" font-size="9" font-weight="900" fill="var(--warn)">Perlu Backwash</text>
      </g>
      <g transform="translate(430, 160)">
        <rect x="-45" y="-12" width="90" height="24" rx="6" fill="var(--crit-l)" stroke="var(--crit)" stroke-width="1" />
        <text y="4" text-anchor="middle" font-size="9" font-weight="900" fill="var(--crit)">Ganti Membran</text>
      </g>
    </svg>
  `;
}
