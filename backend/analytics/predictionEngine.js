// predictionEngine.js
// Rule-based AI Demand Prediction Engine
// NO machine learning - pure smart analytics

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/**
 * Calculate most sold items from orders array
 */
function getMostSellingItems(orders) {
  const itemMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const name = item.name;
      if (!itemMap[name]) itemMap[name] = { name, totalQty: 0, totalRevenue: 0, orderCount: 0 };
      itemMap[name].totalQty += item.qty || 1;
      itemMap[name].totalRevenue += (item.qty || 1) * (item.price || 0);
      itemMap[name].orderCount += 1;
    });
  });
  return Object.values(itemMap).sort((a, b) => b.totalQty - a.totalQty);
}

/**
 * Detect trending items: today sales vs weekly average
 */
function getTrendingItems(orders) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
  const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo && new Date(o.createdAt) < todayStart);

  const todayCounts = {};
  todayOrders.forEach(o => (o.items||[]).forEach(item => {
    todayCounts[item.name] = (todayCounts[item.name] || 0) + (item.qty || 1);
  }));

  const weekCounts = {};
  weekOrders.forEach(o => (o.items||[]).forEach(item => {
    weekCounts[item.name] = (weekCounts[item.name] || 0) + (item.qty || 1);
  }));

  const trending = [];
  Object.keys(todayCounts).forEach(name => {
    const todayQty = todayCounts[name] || 0;
    const weekAvg = (weekCounts[name] || 0) / 7;
    const growthPct = weekAvg > 0 ? ((todayQty - weekAvg) / weekAvg) * 100 : 100;
    trending.push({ name, todayQty, weekAvg: parseFloat(weekAvg.toFixed(1)), growthPct: parseFloat(growthPct.toFixed(1)) });
  });
  return trending.sort((a, b) => b.growthPct - a.growthPct);
}

/**
 * Peak hours: group orders by hour
 */
function getPeakHours(orders) {
  const hourMap = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;
  orders.forEach(o => {
    const h = new Date(o.createdAt).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const result = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour: parseInt(hour), label: formatHour(parseInt(hour)), count }))
    .sort((a, b) => b.count - a.count);
  return result;
}

function formatHour(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/**
 * Tomorrow demand prediction using same-weekday historical data
 */
function getTomorrowPrediction(orders) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay(); // 0=Sun ... 6=Sat

  // Filter orders from same weekday in past 4 weeks
  const sameDayOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getDay() === tomorrowDay;
  });

  const allItems = getMostSellingItems(orders);
  const sameDayItems = getMostSellingItems(sameDayOrders);
  const sameDayMap = {};
  sameDayItems.forEach(i => sameDayMap[i.name] = i);

  // Compute demand level per item
  const predictions = allItems.slice(0, 8).map(item => {
    const sameDayData = sameDayMap[item.name];
    const sameDayQty = sameDayData ? sameDayData.totalQty : 0;
    const avgAllDays = item.totalQty / Math.max(getUniqueDays(orders), 1);
    const ratio = avgAllDays > 0 ? sameDayQty / (avgAllDays * Math.max(getSameDayCount(orders, tomorrowDay), 1)) : 0;

    let demandLevel, suggestion, icon;
    if (ratio >= 1.3) { demandLevel = "High"; suggestion = `Prepare extra stock of ${item.name} before peak hours`; icon = "🔥"; }
    else if (ratio >= 0.8) { demandLevel = "Medium"; suggestion = `Maintain normal ${item.name} preparation`; icon = "✅"; }
    else { demandLevel = "Low"; suggestion = `Reduce ${item.name} preparation slightly to avoid waste`; icon = "⚠️"; }

    return { name: item.name, demandLevel, suggestion, icon, expectedQty: Math.round(avgAllDays * (ratio || 0.5)) };
  });

  return { dayName: DAY_NAMES[tomorrowDay], predictions };
}

function getUniqueDays(orders) {
  const days = new Set(orders.map(o => new Date(o.createdAt).toDateString()));
  return Math.max(days.size, 1);
}

function getSameDayCount(orders, dayIndex) {
  const days = new Set(
    orders.filter(o => new Date(o.createdAt).getDay() === dayIndex)
      .map(o => new Date(o.createdAt).toDateString())
  );
  return Math.max(days.size, 1);
}

/**
 * Revenue per item
 */
function getRevenueAnalytics(orders) {
  const items = getMostSellingItems(orders);
  const totalRevenue = items.reduce((sum, i) => sum + i.totalRevenue, 0);
  return items.map(i => ({
    ...i,
    revenueShare: totalRevenue > 0 ? parseFloat(((i.totalRevenue / totalRevenue) * 100).toFixed(1)) : 0
  }));
}

/**
 * Weekly demand per item (last 7 days)
 */
function getWeeklyDemand(orders) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const topItems = getMostSellingItems(orders).slice(0, 4).map(i => i.name);

  return days.map(day => {
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const dayOrders = orders.filter(o => {
      const t = new Date(o.createdAt);
      return t >= day && t <= dayEnd;
    });
    const entry = { date: day.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) };
    topItems.forEach(name => {
      entry[name] = 0;
      dayOrders.forEach(o => {
        (o.items || []).forEach(item => {
          if (item.name === name) entry[name] += item.qty || 1;
        });
      });
    });
    return entry;
  });
}

/**
 * Generate AI-style insight messages
 */
function generateAIInsights(orders) {
  const insights = [];
  const topItems = getMostSellingItems(orders);
  const peakHours = getPeakHours(orders);
  const trending = getTrendingItems(orders);
  const tomorrow = getTomorrowPrediction(orders);

  if (topItems.length > 0) {
    insights.push({ type: "prediction", icon: "🤖", text: `${topItems[0].name} is your best seller with ${topItems[0].totalQty} units sold. Ensure consistent stock availability.` });
  }
  if (peakHours.length > 0 && peakHours[0].count > 0) {
    insights.push({ type: "peak", icon: "⏰", text: `Peak ordering time is around ${peakHours[0].label}. Staff up and prep ingredients before this window.` });
  }
  if (trending.length > 0 && trending[0].growthPct > 20) {
    insights.push({ type: "trending", icon: "🔥", text: `${trending[0].name} is trending today with ${trending[0].growthPct}% above weekly average. Consider promoting it.` });
  }
  if (tomorrow.predictions.length > 0) {
    const highDemand = tomorrow.predictions.filter(p => p.demandLevel === "High");
    const lowDemand = tomorrow.predictions.filter(p => p.demandLevel === "Low");
    if (highDemand.length > 0) {
      insights.push({ type: "tomorrow", icon: "📈", text: `Tomorrow (${tomorrow.dayName}), expect high demand for ${highDemand.map(p => p.name).join(", ")}. Prepare extra stock in advance.` });
    }
    if (lowDemand.length > 0) {
      insights.push({ type: "waste", icon: "♻️", text: `Reduce preparation of ${lowDemand.map(p => p.name).join(", ")} tomorrow to avoid food waste and cost overrun.` });
    }
  }
  const revenueItems = getRevenueAnalytics(orders);
  if (revenueItems.length > 0) {
    insights.push({ type: "revenue", icon: "💰", text: `${revenueItems[0].name} generates the most revenue (${revenueItems[0].revenueShare}% of total). Feature it prominently on your menu.` });
  }

  return insights;
}

module.exports = {
  getMostSellingItems,
  getTrendingItems,
  getPeakHours,
  getTomorrowPrediction,
  getRevenueAnalytics,
  getWeeklyDemand,
  generateAIInsights
};