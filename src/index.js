import database from "./config/database.js";
import createApp from "./app.js";
import env from "./config/env.js";
import { start as startKeepAlive } from "./utils/keepAlive.js";

const app = createApp();

// Initialize database connection before starting
await database.connect();

// start keep-alive pinger to reduce cold-start latency (useful for free Atlas tier)
startKeepAlive(env.KEEP_ALIVE_INTERVAL_MS);

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${env.PORT}`);
});

// Note: graceful shutdown intentionally omitted from this entrypoint.
