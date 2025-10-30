import express from "express";
import compression from "compression";
import cors from "cors";
import wordRoutes from "./routes/wordRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import flashcardGroupRoutes from "./routes/flashcardGroupRoutes.js";
import groupWordRoutes from "./routes/groupWordRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import responseHandler from "./middleware/responseHandler.js";
import { logRequest } from "./config/logger.js";

const createApp = () => {
  const app = express();
  app.use(compression());

  // CORS configuration - allow Next.js frontend
  app.use(
    cors({
      origin: [process.env.CLIENT_URL, "http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
      ],
      exposedHeaders: ["Content-Range", "X-Content-Range"],
      maxAge: 86400, // 24 hours
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // HTTP request logging
  app.use(logRequest);

  // Standard response helpers
  app.use(responseHandler);

  app.use("/api", wordRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/translate", translateRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/flashcard-groups", flashcardGroupRoutes);
  app.use("/api/flashcard-groups", flashcardRoutes);
  app.use("/api/group-words", groupWordRoutes);
  app.use("/api/categories", categoryRoutes);

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
