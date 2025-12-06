// src/routes/adminRoutes.js - Admin/health endpoints
const express = require("express");
const router = express.Router();
const jobManager = require("../jobManager");
const { logger } = require("../logger");

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Get system stats
router.get("/stats", (req, res) => {
  try {
    const jobs = jobManager.getAllJobs();
    const stats = {
      totalJobs: jobs.length,
      completed: jobs.filter((j) => j.status === "completed").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      pending: jobs.filter((j) => j.status === "pending").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      timestamp: new Date().toISOString(),
    };

    res.json(stats);
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Clear completed jobs
router.post("/cleanup", (req, res) => {
  try {
    const jobs = jobManager.getAllJobs();
    const completedJobs = jobs.filter((j) => j.status === "completed");

    let deleted = 0;
    for (const job of completedJobs) {
      if (jobManager.deleteJob(job.id)) {
        deleted++;
      }
    }

    logger.info(`Cleaned up ${deleted} completed jobs`);
    res.json({ message: `Deleted ${deleted} completed jobs` });
  } catch (error) {
    logger.error("Error during cleanup:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

module.exports = router;
