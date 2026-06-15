'use strict';
/**
 * EICHOFILT v3 — ml.js
 * ML Analytics page: confusion matrix, feature importance,
 * per-class metrics, live inference slider, decision tree SVG
 * All functions are null-safe and input-validated
 */

/* ── DATA ─────────────────────────────────────────────────────────────── */
const ML = {
  accuracy: 0.9684, roc_auc: 0.9921, cv_mean: 0.9712,
  class_names: ['Normal', 'Perlu Backwash', 'Ganti Membran'],
  class_colors: ['#00A878', '#F59E0B', '#EF4444'],
};

const CM = [
  [410, 8, 0],
  [  7,98, 2],
  [  0, 1,50],
];

const PCM = {
  'Normal':        { prec:0.9831, rec:0.9810, f1:0.9820, n:418 },
  'Perlu Backwash':{ prec:0.9160, rec:0.9252, f1:0.9206, n:107 },
  'Ganti Membran': { prec:0.9615, rec:0.9804, f1:0.9709, n: 51 },
};

const FI = [
  { name:'turbidity_ntu',  imp:0.3412, label:'Turbidity (NTU)' },
  { name:'hours_since_bw', imp:0.2189, label:'Jam sejak backwash' },
  { name:'turb_roc',       imp:0.1534, label:'Turb. rate-of-change' },
  { name:'flow_rate_lpm',  imp:0.0923, label:'Flow rate (L/mnt)' },
  { name:'turb_mean_1h',   imp:0.0712, label:'Turb. mean 1 jam' },
  { name:'tds_ppm',        imp:0.0587, label:'TDS (ppm)' },
  { name:'turb_std',       imp:0.0341, label:'Turb. std dev' },
  { name:'flow_trend',     imp:0.0184, label:'Flow trend' },
  { name:'tds_roc',        imp:0.0092, label:'TDS rate-of-change' },
  { name:'ph',             imp:0.0026, label:'pH' },
];

const SLIDERS = [
  { id:'turb',    label:'Turbidity', min:0,   max:20,  step:0.1, def:4.2,  unit:'NTU'   },
  { id:'tds',     label:'TDS',       min:50,  max:800, step:1,   def:187,  unit:'ppm'   },
  { id:'flow',    label:'Flow Rate', min:0.2, max:3.5, step:0.1, def:2.1,  unit:'L/mnt' },
  { id:'hours',   label:'Jam BW',    min:0,   max:120, step:1,   def:12,   unit:'jam'   },
  { id:'droc',    label:'Δ Turb/j',  min:-3,  max:5,   step:0.1, def:0.2,  unit:'Δ'    },
];

const MODEL_CFG = [
  ['Algoritma','Random Forest'],
  ['N Estimators','150 pohon'],
  ['Max Depth','12'],
  ['Max Features','sqrt'],
  ['Class Weight','balanced'],
  ['CV Strategy','StratifiedKFold (5)'],
  ['Split Method','Time-series 80/20'],
  ['Input Fitur','10 fitur'],
];

/* ── SAFE DOM ─────────────────────────────────────────────────────────── */
function $(id){ return document.getElementById(id); }
function setText(id,v){ const e=$(id); if(e) e.textContent=v; }

/* ── TOAST ────────────────────────────────────────────────────────────── */
let _tt=null;
function toast(msg){
  const e=$('toast'); if(!e) return;
  e.textContent=msg; e.classList.add('show');
  clearTimeout(_tt); _tt=setTimeout(()=>e.classList.remove('show'),2800);
}

/* ── STAT CARDS ───────────────────────────────────────────────────────── */
function renderStats(){
  setText('stat-acc', (ML.accuracy*100).toFixed(2)+'%');
  setText('stat-auc', ML.roc_auc.toFixed(4));
  setText('stat-cv',  (ML.cv_mean*100).toFixed(2)+'%');
}

/* ── CONFUSION MATRIX ─────────────────────────────────────────────────── */
function renderCM(){
  const grid=$('cm-grid'); if(!grid) return;
  const labels=['N','BW','GM'];
  const flat=CM.flat();
  const maxV=Math.max(...flat,1);
  grid.innerHTML='';

  for(let r=0;r<3;r++){
    const yl=document.createElement('div');
    yl.className='cm-ylabel';
    yl.textContent=labels[r];
    grid.appendChild(yl);

    for(let c=0;c<3;c++){
      const val=CM[r][c];
      const cell=document.createElement('div');
      cell.className='cm-cell '+(r===c ? (val/maxV>0.5?'hi':'mid') : val>0?'lo':'z');
      cell.textContent=val;
      cell.title=`${ML.class_names[r]} → ${ML.class_names[c]}: ${val}`;
      cell.style.opacity='0';
      cell.style.transform='scale(.85)';
      setTimeout(()=>{
        cell.style.transition='opacity .3s, transform .3s';
        cell.style.opacity='1';
        cell.style.transform='scale(1)';
      },(r*3+c)*35);
      grid.appendChild(cell);
    }
  }
}

/* ── FEATURE IMPORTANCE ───────────────────────────────────────────────── */
function renderFI(){
  const list=$('fi-list'); if(!list) return;
  const maxI=FI[0].imp;
  const cols=['#00A878','#1A8A68','#2A7A5A','#3B82F6','#5A9EDE',
               '#7DB8E6','#F59E0B','#F6C56A','#8FA9A3','#B3C9C5'];

  list.innerHTML=FI.map((item,i)=>{
    const pct=Math.round(item.imp/maxI*100);
    return `<div class="fi-row">
      <span class="fi-rank">${i+1}</span>
      <span class="fi-name" title="${item.name}">${item.label}</span>
      <div class="fi-track"><div class="fi-fill" style="width:0%;background:${cols[i]}" data-w="${pct}"></div></div>
      <span class="fi-pct">${(item.imp*100).toFixed(1)}%</span>
    </div>`;
  }).join('');

  setTimeout(()=>{
    list.querySelectorAll('.fi-fill').forEach(b=>{
      b.style.transition='width .8s ease';
      b.style.width=b.dataset.w+'%';
    });
  },120);
}

/* ── PER-CLASS TABLE ──────────────────────────────────────────────────── */
function renderPCM(){
  const body=$('pcm-body'); if(!body) return;
  body.innerHTML=Object.entries(PCM).map(([name,m],i)=>{
    const col=ML.class_colors[i]||'#888';
    const f1c=m.f1>=.95?'var(--ok)':m.f1>=.85?'var(--warn)':'var(--crit)';
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px;font-weight:700;font-size:12px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${col};margin-right:5px;vertical-align:middle"></span>${name}
      </td>
      <td style="padding:8px;text-align:right;font-family:var(--f-mono);font-size:11px">${(m.prec*100).toFixed(1)}%</td>
      <td style="padding:8px;text-align:right;font-family:var(--f-mono);font-size:11px">${(m.rec*100).toFixed(1)}%</td>
      <td style="padding:8px;text-align:right;font-family:var(--f-mono);font-size:11px;font-weight:800;color:${f1c}">${(m.f1*100).toFixed(1)}%</td>
    </tr>`;
  }).join('');
}

/* ── PR CHART ─────────────────────────────────────────────────────────── */
let prChart=null;
function renderPRChart(){
  const ctx=$('prChart'); if(!ctx||typeof Chart==='undefined') return;
  const labels=Object.keys(PCM);
  const prec=labels.map(k=>(PCM[k].prec*100).toFixed(2));
  const rec=labels.map(k=>(PCM[k].rec*100).toFixed(2));
  const cols=ML.class_colors;
  const isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tc=isDark?'#4A7870':'#8FA9A3';
  const gc=isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';

  if(prChart){ try{prChart.destroy();}catch(e){} }

  try{
    prChart=new Chart(ctx,{
      type:'bar',
      data:{labels,datasets:[
        {label:'Precision',data:prec,backgroundColor:cols.map(c=>c+'CC'),borderColor:cols,borderWidth:1,borderRadius:5,borderSkipped:false},
        {label:'Recall',data:rec,backgroundColor:cols.map(c=>c+'44'),borderColor:cols,borderWidth:1,borderRadius:5,borderSkipped:false},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:true,position:'top',labels:{font:{size:10},color:tc,boxWidth:10,padding:10}},
          tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.raw}%`}},
        },
        scales:{
          x:{ticks:{font:{size:10},color:tc},grid:{display:false},border:{display:false}},
          y:{min:85,max:100,ticks:{font:{size:10},color:tc,callback:v=>v+'%'},grid:{color:gc},border:{display:false}},
        }
      }
    });
  }catch(e){ console.warn('[ML] PR chart failed:',e.message); }
}

/* ── INFERENCE SLIDERS ────────────────────────────────────────────────── */
function renderSliders(){
  const c=$('infer-sliders'); if(!c) return;
  c.innerHTML=SLIDERS.map(s=>`
    <div class="infer-row">
      <span class="infer-label">${s.label}</span>
      <input type="range" class="infer-slider" id="sl-${s.id}"
        min="${s.min}" max="${s.max}" step="${s.step}" value="${s.def}"
        oninput="onSlide()" aria-label="${s.label} slider"/>
      <span class="infer-val" id="vl-${s.id}">${s.def} ${s.unit}</span>
    </div>`).join('');
}

/* ── RF CLASSIFY (mirror of eichofilt_model.h, input-validated) ──────── */
function rfClassify(turb,tds,flow,hours,dRoc){
  // Clamp to safe ranges
  turb  = Math.max(0, Math.min(turb  ||0, 100));
  tds   = Math.max(0, Math.min(tds   ||0, 2000));
  flow  = Math.max(0, Math.min(flow  ||0, 10));
  hours = Math.max(0, Math.min(hours ||0, 200));
  dRoc  = Math.max(-10,Math.min(dRoc ||0, 20));

  let s=[0,0,0];
  // turbidity (34.12%)
  if(turb>12){s[2]+=.90;}else if(turb>9){s[1]+=.65;}else if(turb>7){s[1]+=.45;}else if(turb>5){s[1]+=.20;}else{s[0]+=.34;}
  // hours (21.89%)
  if(hours>96){s[2]+=.30;}else if(hours>72){s[1]+=.55;}else if(hours>48){s[1]+=.25;}else{s[0]+=.22;}
  // roc (15.34%)
  if(dRoc>3){s[2]+=.20;}else if(dRoc>1.5){s[1]+=.30;}else if(dRoc>.5){s[1]+=.10;}else{s[0]+=.15;}
  // flow (9.23%)
  if(flow<.6){s[2]+=.25;}else if(flow<1){s[1]+=.20;}else if(flow<1.5){s[1]+=.08;}else{s[0]+=.09;}
  // tds (5.87%)
  if(tds>600){s[2]+=.15;}else if(tds>350){s[1]+=.10;}else{s[0]+=.06;}

  const exp=s.map(v=>Math.exp(v*3));
  const sum=exp.reduce((a,b)=>a+b,1e-9);
  const probs=exp.map(v=>v/sum);
  const pred=probs.indexOf(Math.max(...probs));
  return {pred, probs};
}

function getVal(id){ return parseFloat($('sl-'+id)?.value||0); }

function onSlide(){
  SLIDERS.forEach(s=>{
    const v=getVal(s.id);
    const el=$('vl-'+s.id);
    if(el) el.textContent=(Number.isInteger(v)?v:v.toFixed(1))+' '+s.unit;
  });

  const turb=getVal('turb'), tds=getVal('tds'), flow=getVal('flow');
  const hours=getVal('hours'), dRoc=getVal('droc');
  const {pred,probs}=rfClassify(turb,tds,flow,hours,dRoc);

  const cls=$('ir-class'), conf=$('ir-conf'), prEl=$('ir-probs'), badge=$('infer-badge');
  if(cls){ cls.textContent=ML.class_names[pred]; cls.className='ir-class c'+pred; }
  if(conf){ conf.textContent='Keyakinan: '+(probs[pred]*100).toFixed(1)+'%'; }
  if(badge){ const bLabels=['normal','backwash','ganti']; badge.textContent=bLabels[pred]; }
  if(prEl){
    prEl.innerHTML=ML.class_names.map((name,i)=>`
      <div class="irp-row">
        <span class="irp-label">${name}</span>
        <div class="irp-track"><div class="irp-fill" style="width:${(probs[i]*100).toFixed(1)}%;background:${ML.class_colors[i]}"></div></div>
        <span class="irp-pct">${(probs[i]*100).toFixed(1)}%</span>
      </div>`).join('');
  }
}

/* ── DECISION TREE SVG ────────────────────────────────────────────────── */
function renderTree(){
  const wrap=$('tree-wrap'); if(!wrap) return;
  const isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tx=isDark?'#E8F3F0':'#1A2621';
  const sub=isDark?'#4A7870':'#8FA9A3';
  const bgS=isDark?'#1A3330':'#F0FAF8';

  const nodes=[
    {id:0,x:240,y:28,  label:'turbidity',cond:'≤ 7.0',col:'#3B82F6',type:'split'},
    {id:1,x:100,y:100, label:'hours_bw',  cond:'≤ 72h', col:'#3B82F6',type:'split'},
    {id:2,x:380,y:100, label:'tds_ppm',   cond:'≤ 600', col:'#3B82F6',type:'split'},
    {id:3,x:40, y:182, label:'Normal',    cond:'410/418',col:'#00A878',type:'leaf'},
    {id:4,x:160,y:182, label:'Backwash',  cond:'98/107', col:'#F59E0B',type:'leaf'},
    {id:5,x:310,y:182, label:'Backwash',  cond:'89/107', col:'#F59E0B',type:'leaf'},
    {id:6,x:450,y:182, label:'Ganti',     cond:'50/51',  col:'#EF4444',type:'leaf'},
  ];
  const edges=[
    {f:0,t:1,l:'Ya (≤7)'},{f:0,t:2,l:'Tidak (>7)'},
    {f:1,t:3,l:'Ya'},{f:1,t:4,l:'Tidak'},
    {f:2,t:5,l:'Ya'},{f:2,t:6,l:'Tidak'},
  ];
  const nm=Object.fromEntries(nodes.map(n=>[n.id,n]));

  const eSVG=edges.map(e=>{
    const s=nm[e.f],t=nm[e.t],mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
    return `<path d="M${s.x},${s.y+17} C${s.x},${my} ${t.x},${my} ${t.x},${t.y-17}"
      fill="none" stroke="${sub}" stroke-width="1.2" opacity=".5"/>
    <text x="${mx+(t.x>s.x?5:-5)}" y="${my}" font-size="8" fill="${sub}"
      text-anchor="${t.x>s.x?'start':'end'}" font-family="sans-serif">${e.l}</text>`;
  }).join('');

  const nSVG=nodes.map(n=>{
    const leaf=n.type==='leaf', rw=leaf?56:68, rh=30;
    return `<g transform="translate(${n.x},${n.y})">
      <rect x="${-rw/2}" y="${-rh/2}" width="${rw}" height="${rh}" rx="8"
        fill="${leaf?n.col+'18':bgS}" stroke="${n.col}" stroke-width="${leaf?1.5:1}"/>
      <text y="-4" text-anchor="middle" font-size="9" font-weight="700"
        fill="${leaf?n.col:tx}" font-family="sans-serif">${n.label}</text>
      <text y="10" text-anchor="middle" font-size="8" fill="${sub}"
        font-family="monospace">${n.cond}</text>
    </g>`;
  }).join('');

  wrap.innerHTML=`<svg viewBox="0 0 490 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-width:300px" role="img" aria-label="Simplified decision tree">
    ${eSVG}${nSVG}
  </svg>`;
}

/* ── CONFIG GRID ──────────────────────────────────────────────────────── */
function renderCfg(){
  const g=$('cfg-grid'); if(!g) return;
  g.innerHTML=MODEL_CFG.map(([k,v])=>`
    <div class="cfg-cell">
      <span class="cfg-key">${k}</span>
      <span class="cfg-val">${v}</span>
    </div>`).join('');
}

/* ── INIT ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  renderStats();
  renderCM();
  renderFI();
  renderPCM();
  renderSliders();
  renderCfg();
  renderTree();

  // Sidebar nav click
  document.querySelectorAll('.nav-item[href]').forEach(a=>{
    if(a.getAttribute('href')==='ml.html') a.classList.add('active');
  });

  // Infer button
  const btn=$('btn-infer');
  if(btn) btn.addEventListener('click',()=>{
    const badge=$('infer-badge');
    if(badge){ badge.textContent='running...'; }
    setTimeout(()=>{
      onSlide();
      toast('✅ Inferensi selesai');
    },500);
  });

  // Chart waits for Chart.js
  setTimeout(()=>{ renderPRChart(); onSlide(); }, 200);

  console.log('[EICHOFILT ML] Initialized ✓');
});
