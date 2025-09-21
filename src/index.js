import express from "express";
import compression from "compression";
import cors from "cors";
import database from "./config/database.js";
import wordRoutes from "./routes/wordRoutes.js";
import importRoutes from "./routes/importRoutes.js";

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

app.get("/", (req, res) => {
  res.send("Welcome!");
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  try {
    await database.disconnect();
    console.log("✅ Database disconnected");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

async function pingDB() {
  try {
    const collection = database.getCollection();
    await collection.findOne({});
    console.log(`[${new Date().toISOString()}] Ping DB to keep alive`);
  } catch (err) {
    console.error("Ping DB error:", err.message);
  }
}
setInterval(pingDB, 5 * 60 * 1000); // Ping DB every 5 minutes
