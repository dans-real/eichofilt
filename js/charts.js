/* ============================================
   EICHOFILT — charts.js
   Chart.js initialization & update helpers
   ============================================ */

let trendChart = null;
let effChart = null;
let bwChart = null;

function getChartColors() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    tickColor: isDark ? '#6A6A64' : '#9A9892',
    tooltipBg: isDark ? '#2A2A28' : '#FFFFFF',
    tooltipText: isDark ? '#F0EFE9' : '#1A1A18',
  };
}

function buildHourLabels() {
  return Array.from({ length: 24 }, (_, i) => {
    const h = (new Date().getHours() - 23 + i + 24) % 24;
    return h + ':00';
  });
}

function initTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  const colors = getChartColors();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buildHourLabels(),
      datasets: [
        {
          label: 'Turbidity (NTU)',
          data: [...state.turbData],
          borderColor: '#0F4C5C',
          backgroundColor: 'rgba(15,76,92,0.07)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'TDS (ppm/10)',
          data: state.tdsData.map(v => +(v / 10).toFixed(1)),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.05)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          borderDash: [5, 3],
          fill: true,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tickColor,
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 0.5,
          padding: 10,
          callbacks: {
            label: function (ctx) {
              if (ctx.datasetIndex === 0) return ' Turbidity: ' + ctx.raw.toFixed(1) + ' NTU';
              return ' TDS: ' + (ctx.raw * 10).toFixed(0) + ' ppm';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10 }, color: colors.tickColor, maxTicksLimit: 8, autoSkip: true },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: { font: { size: 10 }, color: colors.tickColor, maxTicksLimit: 6 },
          grid: { color: colors.gridColor },
          border: { display: false }
        }
      }
    }
  });
}

function updateTrendChart() {
  if (!trendChart) return;
  trendChart.data.datasets[0].data = [...state.turbData];
  trendChart.data.datasets[1].data = state.tdsData.map(v => +(v / 10).toFixed(1));
  trendChart.update('none');
}

function initEffChart() {
  const ctx = document.getElementById('effChart');
  if (!ctx) return;
  const colors = getChartColors();

  effChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: EFFICIENCY_DATA.labels,
      datasets: [{
        label: 'Efisiensi penyisihan (%)',
        data: EFFICIENCY_DATA.values,
        backgroundColor: [
          'rgba(15,76,92,0.7)',
          'rgba(15,76,92,0.75)',
          'rgba(15,76,92,0.8)',
          'rgba(15,76,92,0.85)',
          'rgba(15,76,92,0.9)',
          'rgba(10,56,69,0.95)'
        ],
        borderColor: '#0F4C5C',
        borderWidth: 0,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tickColor,
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 0.5,
          callbacks: {
            label: ctx => ' Efisiensi: ' + ctx.raw + '%'
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 11 }, color: colors.tickColor },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          min: 0, max: 100,
          ticks: { font: { size: 10 }, color: colors.tickColor, callback: v => v + '%' },
          grid: { color: colors.gridColor },
          border: { display: false }
        }
      }
    }
  });
}

function initBwChart() {
  const ctx = document.getElementById('bwChart');
  if (!ctx) return;
  const colors = getChartColors();

  bwChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: BACKWASH_DATA.labels,
      datasets: [{
        label: 'Siklus backwash',
        data: BACKWASH_DATA.values,
        backgroundColor: 'rgba(245,158,11,0.65)',
        borderColor: '#F59E0B',
        borderWidth: 0,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tickColor,
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 0.5,
          callbacks: {
            label: ctx => ' ' + ctx.raw + ' siklus'
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 11 }, color: colors.tickColor },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          min: 0,
          ticks: { font: { size: 10 }, color: colors.tickColor, stepSize: 1 },
          grid: { color: colors.gridColor },
          border: { display: false }
        }
      }
    }
  });
}

function initAllCharts() {
  initTrendChart();
  initEffChart();
  initBwChart();
}
