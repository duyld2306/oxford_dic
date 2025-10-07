import express from "express";
import compression from "compression";
import cors from "cors";
import wordRoutes from "./routes/wordRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import responseHandler from "./middleware/responseHandler.js";

const createApp = () => {
  const app = express();
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Standard response helpers
  app.use(responseHandler);

  app.use("/api", wordRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/translate", translateRoutes);

  // Keep-alive ping endpoint
  app.get("/api/ping", (req, res) => {
    res.status(200).json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/", (req, res) => res.send("Welcome!"));

  // 404 handler for unknown routes
  app.use((req, res, next) => {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
