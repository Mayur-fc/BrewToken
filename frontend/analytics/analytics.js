// analytics.js — Café AI Analytics Frontend
// Fetches /api/analytics/dashboard and renders everything

// ── CONFIG ──────────────────────────────────────
// Change this to match your backend URL
const API_BASE = "https://brewtoken.onrender.com/api";

// Chart.js global defaults
Chart.defaults.color = "#64748b";
Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
Chart.defaults.font.family = "'DM Sans', sans-serif";

// ── CHART INSTANCES (so we can destroy/re-init) ──
let peakChart, topChart, weeklyChart, revenueChart;

// ── PALETTE ─────────────────────────────────────
const COLORS = [
  "#f97316","#38bdf8","#a78bfa","#4ade80",
  "#fbbf24","#fb7185","#34d399","#60a5fa"
];

// ── ENTRY POINT ─────────────────────────────────
window.addEventListener("DOMContentLoaded", loadAnalytics);

async function loadAnalytics() {
  try {
    const data = await fetchJSON(`${API_BASE}/analytics/dashboard`)
    hideLoader();
    showDashboard();

    renderStatStrip(data);
    renderInsights(data.aiInsights || []);
    renderTomorrowPrediction(data.tomorrowPrediction || {});
    renderPeakChart(data.peakHours || []);
    renderTopChart(data.topItems || []);
    renderWeeklyChart(data.weeklyDemand || []);
    renderRevenueChart(data.revenueAnalytics || []);
    renderTrendingTable(data.trending || []);
    renderRevenueTable(data.revenueAnalytics || []);
    renderKitchenSuggestions(data.tomorrowPrediction?.predictions || []);

    if (data.generatedAt) {
      document.getElementById("last-updated").textContent =
        "Updated: " + new Date(data.generatedAt).toLocaleTimeString();
    }
  } catch (err) {
    console.error("Analytics load error:", err);
    hideLoader();
    showError(err.message);
  }
}

// ── FETCH HELPER ─────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json();
}

function hideLoader() { document.getElementById("loader").style.display = "none"; }
function showDashboard() { document.getElementById("main-content").style.display = "block"; }
function showError(msg) {
  document.body.innerHTML += `<div style="text-align:center;padding:60px;color:#f87171;font-family:sans-serif">
    ⚠️ Could not load analytics.<br><small>${msg}</small><br><br>
    <small>Make sure your backend is running and CORS is enabled.</small></div>`;
}

// ── STAT STRIP ───────────────────────────────────
function renderStatStrip(data) {
  const topItem = data.topItems?.[0];
  const totalRevenue = (data.revenueAnalytics || []).reduce((s, i) => s + i.totalRevenue, 0);
  const peakHour = (data.peakHours || []).reduce(
  (max, h) => h.count > (max?.count ?? 0) ? h : max, null
);

  const stats = [
    { label: "Total Orders", value: data.totalOrders || 0, sub: "Last 30 days", cls: "stat-accent" },
    { label: "Best Seller", value: topItem?.name || "—", sub: `${topItem?.totalQty || 0} units`, cls: "stat-green" },
    { label: "Total Revenue", value: `₹${(totalRevenue).toLocaleString("en-IN")}`, sub: "Last 30 days", cls: "stat-blue" },
    { label: "Peak Hour", value: peakHour?.label || "—", sub: `${peakHour?.count || 0} orders`, cls: "stat-violet" },
    { label: "Menu Items", value: data.topItems?.length || 0, sub: "Tracked items", cls: "stat-accent" },
    { label: "Trending Now", value: data.trending?.[0]?.name || "—", sub: data.trending?.[0]?.growthPct > 0 ? `+${data.trending[0].growthPct}%` : "—", cls: "stat-green" }
  ];

  document.getElementById("stat-strip").innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value ${s.cls}">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join("");
}

// ── AI INSIGHTS ──────────────────────────────────
const INSIGHT_COLORS = ["", "blue", "violet", "green", "", "blue"];
function renderInsights(insights) {
  if (!insights.length) {
    document.getElementById("insights-panel").innerHTML =
      `<div style="color:var(--muted);font-size:0.85rem;">Not enough order data for insights yet. Start taking orders!</div>`;
    return;
  }
  document.getElementById("insights-panel").innerHTML = insights.map((ins, i) => `
    <div class="insight-card ${INSIGHT_COLORS[i % INSIGHT_COLORS.length] || ''}">
      <span class="insight-icon">${ins.icon || "🤖"}</span>
      <span class="insight-text">${ins.text}</span>
    </div>`).join("");
}

// ── TOMORROW PREDICTION ──────────────────────────
function renderTomorrowPrediction(pred) {
  document.getElementById("tomorrow-day").textContent =
    `Predictions for ${pred.dayName || "Tomorrow"}`;
  const cards = (pred.predictions || []);
  if (!cards.length) {
    document.getElementById("prediction-cards").innerHTML =
      `<p style="color:var(--muted);font-size:0.85rem;">No prediction data yet.</p>`;
    return;
  }
  document.getElementById("prediction-cards").innerHTML = cards.map(p => `
    <div class="pred-card ${(p.demandLevel||"medium").toLowerCase()}">
      <div class="pred-icon">${p.icon || "📦"}</div>
      <div class="pred-name">${p.name}</div>
      <span class="pred-badge ${(p.demandLevel||"medium").toLowerCase()}">${p.demandLevel} Demand</span>
      <div class="pred-suggestion">${p.suggestion}</div>
    </div>`).join("");
}

// ── PEAK HOURS CHART ─────────────────────────────
function renderPeakChart(hours) {
  const active = hours.filter(h => h.count > 0).slice(0, 16);
  if (!active.length) return;
  const ctx = document.getElementById("peakChart").getContext("2d");
  if (peakChart) peakChart.destroy();
  const maxVal = Math.max(...active.map(h => h.count));
  peakChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: active.map(h => h.label),
      datasets: [{
        label: "Orders",
        data: active.map(h => h.count),
        backgroundColor: active.map(h =>
          h.count === maxVal ? "rgba(249,115,22,0.85)" : "rgba(249,115,22,0.3)"),
        borderColor: active.map(h =>
          h.count === maxVal ? "#f97316" : "rgba(249,115,22,0.4)"),
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── TOP ITEMS PIE CHART ───────────────────────────
function renderTopChart(items) {
  if (!items.length) return;
  const top = items.slice(0, 6);
  const ctx = document.getElementById("topChart").getContext("2d");
  if (topChart) topChart.destroy();
  topChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: top.map(i => i.name),
      datasets: [{
        data: top.map(i => i.totalQty),
        backgroundColor: COLORS,
        borderColor: "rgba(9,13,20,0.8)",
        borderWidth: 2, hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { padding: 14, boxWidth: 12 } }
      }
    }
  });
}

// ── WEEKLY DEMAND LINE CHART ──────────────────────
function renderWeeklyChart(weekData) {
  if (!weekData.length) return;
  const keys = Object.keys(weekData[0]).filter(k => k !== "date");
  if (!keys.length) return;
  const ctx = document.getElementById("weeklyChart").getContext("2d");
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: weekData.map(d => d.date),
      datasets: keys.map((key, i) => ({
        label: key,
        data: weekData.map(d => d[key] || 0),
        borderColor: COLORS[i],
        backgroundColor: COLORS[i] + "20",
        borderWidth: 2, pointRadius: 4,
        tension: 0.4, fill: true
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: "bottom", labels: { padding: 14, boxWidth: 12 } } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── REVENUE BAR CHART ────────────────────────────
function renderRevenueChart(items) {
  if (!items.length) return;
  const top = items.slice(0, 6);
  const ctx = document.getElementById("revenueChart").getContext("2d");
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map(i => i.name),
      datasets: [{
        label: "Revenue (₹)",
        data: top.map(i => i.totalRevenue),
        backgroundColor: COLORS.map(c => c + "99"),
        borderColor: COLORS,
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { grid: { display: false } }
      }
    }
  });
}

// ── TRENDING TABLE ───────────────────────────────
function renderTrendingTable(trending) {
  const tbody = document.querySelector("#trending-table tbody");
  if (!trending.length) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);text-align:center;padding:16px">No data yet</td></tr>`; return; }
  tbody.innerHTML = trending.map(t => {
    const cls = t.growthPct > 10 ? "up" : t.growthPct < -10 ? "down" : "flat";
    const sign = t.growthPct > 0 ? "+" : "";
    return `<tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.todayQty}</td>
      <td>${t.weekAvg}</td>
      <td><span class="tag-growth ${cls}">${sign}${t.growthPct}%</span></td>
    </tr>`;
  }).join("");
}

// ── REVENUE TABLE ────────────────────────────────
function renderRevenueTable(items) {
  const tbody = document.querySelector("#revenue-table tbody");
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:16px">No data yet</td></tr>`; return; }
  tbody.innerHTML = items.slice(0, 7).map(i => `
    <tr>
      <td><strong>${i.name}</strong></td>
      <td>₹${i.totalRevenue.toLocaleString("en-IN")}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
            <div style="width:${i.revenueShare}%;height:100%;background:var(--accent);border-radius:3px"></div>
          </div>
          <span style="font-size:0.72rem;color:var(--muted)">${i.revenueShare}%</span>
        </div>
      </td>
    </tr>`).join("");
}

// ── KITCHEN SUGGESTIONS ──────────────────────────
function renderKitchenSuggestions(predictions) {
  if (!predictions.length) {
    document.getElementById("kitchen-suggestions").innerHTML =
      `<p style="color:var(--muted);font-size:0.85rem;">No prediction data yet.</p>`;
    return;
  }
  document.getElementById("kitchen-suggestions").innerHTML = predictions.map(p => {
    const cls = p.demandLevel === "High" ? "prepare" : p.demandLevel === "Low" ? "reduce" : "normal";
    return `<div class="sugg-card ${cls}">
      <div class="sugg-item-name">${p.icon || ""} ${p.name}</div>
      <div class="sugg-text">${p.suggestion}</div>
    </div>`;
  }).join("");
}