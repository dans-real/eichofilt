/* ==========================================================================
   EICHOFILT — charts.js
   Chart.js Trend Chart Integration (Turbidity & TDS)
   ========================================================================== */
'use strict';

let trendChart = null;

function getChartColors() {
  const isLight = document.body.classList.contains('light-mode');
  return {
    gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)',
    tickColor: isLight ? '#4B5563' : '#94A3B8'
  };
}

function updateTrendChartFromDB() {
  if (!trendChart) return;
  MockMySQL.query('history').then(data => {
    const labels = data.map(row => {
      const t = new Date(row.waktu);
      return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
    });

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data.map(row => row.turbidity);
    trendChart.data.datasets[1].data = data.map(row => +(row.tds / 10).toFixed(1));
    trendChart.update('none');
  });
}

function initTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  const chartColors = getChartColors();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Turbidity (NTU)',
          data: [],
          borderColor: 'rgba(0, 242, 254, 1)',
          backgroundColor: 'rgba(0, 242, 254, 0.08)',
          borderWidth: 2.5,
          pointRadius: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'TDS (ppm/10)',
          data: [],
          borderColor: 'rgba(0, 230, 118, 1)',
          backgroundColor: 'rgba(0, 230, 118, 0.04)',
          borderWidth: 2.5,
          pointRadius: 2,
          tension: 0.4,
          borderDash: [5, 3],
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: chartColors.tickColor,
            font: { size: 11, weight: 'bold' }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 9 }, color: chartColors.tickColor }, grid: { display: false } },
        y: { ticks: { font: { size: 9 }, color: chartColors.tickColor }, grid: { color: chartColors.gridColor } }
      }
    }
  });
  updateTrendChartFromDB();
}

function updateChartTheme() {
  if (!trendChart) return;
  const chartColors = getChartColors();

  const isLight = document.body.classList.contains('light-mode');
  trendChart.data.datasets[0].borderColor = isLight ? '#0284C7' : '#00F2FE';
  trendChart.data.datasets[0].backgroundColor = isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(0, 242, 254, 0.08)';
  trendChart.data.datasets[1].borderColor = isLight ? '#059669' : '#00E676';
  trendChart.data.datasets[1].backgroundColor = isLight ? 'rgba(5, 150, 105, 0.04)' : 'rgba(0, 230, 118, 0.04)';

  trendChart.options.plugins.legend.labels.color = chartColors.tickColor;
  trendChart.options.scales.x.ticks.color = chartColors.tickColor;
  trendChart.options.scales.y.ticks.color = chartColors.tickColor;
  trendChart.options.scales.y.grid.color = chartColors.gridColor;

  trendChart.update();
}
