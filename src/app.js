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
import notesRoutes from "./routes/notesRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import responseHandler from "./middleware/responseHandler.js";
import { logRequest } from "./config/logger.js";
import database from "./config/database.js";

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
  app.use("/api/notes", notesRoutes);

  // Keep-alive ping endpoint
  app.get("/api/ping", async (req, res) => {
    try {
      const collection = database.getCollection();
      await collection.findOne({});
      res.status(200).json({ status: "ok", time: new Date().toISOString() });
    } catch (err) {
      console.error("Ping error:", err.message || err);
      res.status(500).json({ status: "error", message: err.message });
    }
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
