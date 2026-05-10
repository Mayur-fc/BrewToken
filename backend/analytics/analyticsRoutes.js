// analyticsRoutes.js
// Registers all analytics API routes — add this to your existing Express app

const express = require("express");
const router = express.Router();
const ctrl = require("./analyticsController");

// GET /api/analytics/dashboard  → full analytics bundle (recommended for frontend)
router.get("/dashboard", ctrl.dashboard);

// GET /api/analytics/top-items  → most sold items
router.get("/top-items", ctrl.topItems);

// GET /api/analytics/trending   → trending items vs weekly avg
router.get("/trending", ctrl.trending);

// GET /api/analytics/predictions → tomorrow demand prediction
router.get("/predictions", ctrl.predictions);

// GET /api/analytics/peak-hours → hourly order distribution
router.get("/peak-hours", ctrl.peakHours);

// GET /api/analytics/revenue    → revenue per item
router.get("/revenue", ctrl.revenue);

module.exports = router;