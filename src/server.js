import app from "./app.js";
import database from "./config/database.js";

const PORT = process.env.PORT || 3000;

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

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📚 Oxford Dictionary API v2.0.0`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Handle server errors
server.on("error", (error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});

export default server;
