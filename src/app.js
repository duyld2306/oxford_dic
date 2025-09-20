import express from "express";
import compression from "compression";
import cors from "cors";
import database from "./config/database.js";

// Import routes
import wordRoutes from "./routes/wordRoutes.js";
import importRoutes from "./routes/importRoutes.js";

// Import legacy routes for backward compatibility
import { getExampleViByIds, updateExampleViIfMissing } from "./db.js";

const app = express();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize database
await database.connect();

// Routes
app.use("/api", wordRoutes);
app.use("/api/import", importRoutes);

// Legacy routes for backward compatibility
app.post("/api/examples/vi", async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ data: [] });
    }
    const data = await getExampleViByIds(ids);
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ data: [] });
  }
});

app.post("/api/examples/vi/update", async (req, res) => {
  try {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ updated: 0, skipped: 0 });
    }
    const result = await updateExampleViIfMissing(updates);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ updated: 0, skipped: 0 });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const isHealthy = await database.healthCheck();
    return res.json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: isHealthy ? "connected" : "disconnected",
    });
  } catch (error) {
    return res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Oxford Dictionary API",
    version: "2.0.0",
    endpoints: {
      lookup: "GET /api/lookup?word=hang",
      search: "GET /api/search?q=hang&type=prefix",
      stats: "GET /api/stats",
      import: "POST /api/import/multiple",
      health: "GET /health",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

export default app;
