// analyticsController.js
// Express controller - handles HTTP requests for analytics endpoints

const service = require("./analyticsService");

const handleError = (res, err) => {
  console.error("Analytics error:", err);
  res.status(500).json({ error: "Analytics error", details: err.message });
};

async function dashboard(req, res) {
  try { res.json(await service.getDashboardData()); }
  catch (e) { handleError(res, e); }
}

async function topItems(req, res) {
  try { res.json(await service.getTopItems()); }
  catch (e) { handleError(res, e); }
}

async function trending(req, res) {
  try { res.json(await service.getTrending()); }
  catch (e) { handleError(res, e); }
}

async function predictions(req, res) {
  try { res.json(await service.getPredictions()); }
  catch (e) { handleError(res, e); }
}

async function peakHours(req, res) {
  try { res.json(await service.getPeakHours()); }
  catch (e) { handleError(res, e); }
}

async function revenue(req, res) {
  try { res.json(await service.getRevenue()); }
  catch (e) { handleError(res, e); }
}

module.exports = { dashboard, topItems, trending, predictions, peakHours, revenue };