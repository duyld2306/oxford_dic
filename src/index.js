import database from "./config/database.js";
import createApp from "./app.js";
import env from "./config/env.js";

const app = createApp();

// Initialize database connection before starting
await database.connect();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${env.PORT}`);
});

// Note: graceful shutdown intentionally omitted from this entrypoint.
