// analyticsService.js
// Fetches order data from Firestore and feeds into prediction engine

const { db } = require("../firebase/firebase"); // ← adjust path to your existing Firebase init file
const engine = require("./predictionEngine");

/**
 * Fetch orders from Firestore for past N days
 */
async function fetchOrders(days = 30) {
  try {
    // Try 1: fetch with date filter (works if createdAt is Firestore Timestamp)
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshot = await db.collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();

      // Handle ALL formats: Firestore Timestamp, ISO string, or JS Date
      let createdAt;
      if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate().toISOString(); // Firestore Timestamp
      } else if (data.createdAt?.seconds) {
        createdAt = new Date(data.createdAt.seconds * 1000).toISOString(); // Timestamp object
      } else if (data.createdAt) {
        createdAt = new Date(data.createdAt).toISOString(); // string or number
      } else {
        createdAt = new Date().toISOString(); // fallback
      }

      return {
        id: doc.id,
        ...data,
        createdAt
      };
    });

  } catch (error) {
    console.error("Firestore fetch error:", error);

    // Fallback: fetch without orderBy (no index needed)
    const snapshot = await db.collection("orders").get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let createdAt;
      if (data.createdAt?.toDate) createdAt = data.createdAt.toDate().toISOString();
      else if (data.createdAt?.seconds) createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
      else if (data.createdAt) createdAt = new Date(data.createdAt).toISOString();
      else createdAt = new Date().toISOString();
      return { id: doc.id, ...data, createdAt };
    });
  }
}

async function getDashboardData() {
  const orders = await fetchOrders(30);
  return {
    totalOrders: orders.length,
    topItems: engine.getMostSellingItems(orders).slice(0, 6),
    trending: engine.getTrendingItems(orders).slice(0, 5),
    peakHours: engine.getPeakHours(orders),
    tomorrowPrediction: engine.getTomorrowPrediction(orders),
    revenueAnalytics: engine.getRevenueAnalytics(orders).slice(0, 6),
    weeklyDemand: engine.getWeeklyDemand(orders),
    aiInsights: engine.generateAIInsights(orders),
    generatedAt: new Date().toISOString()
  };
}

async function getTopItems() {
  const orders = await fetchOrders(30);
  return engine.getMostSellingItems(orders);
}

async function getTrending() {
  const orders = await fetchOrders(7);
  return engine.getTrendingItems(orders);
}

async function getPredictions() {
  const orders = await fetchOrders(30);
  return engine.getTomorrowPrediction(orders);
}

async function getPeakHours() {
  const orders = await fetchOrders(30);
  return engine.getPeakHours(orders);
}

async function getRevenue() {
  const orders = await fetchOrders(30);
  return engine.getRevenueAnalytics(orders);
}

module.exports = {
  getDashboardData,
  getTopItems,
  getTrending,
  getPredictions,
  getPeakHours,
  getRevenue
};