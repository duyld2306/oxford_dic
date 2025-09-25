import express from "express";
import compression from "compression";
import cors from "cors";
import wordRoutes from "./routes/wordRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const createApp = () => {
  const app = express();
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", wordRoutes);
  app.use("/api/import", importRoutes);

  app.get("/", (req, res) => res.send("Welcome!"));

  // Centralized error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
