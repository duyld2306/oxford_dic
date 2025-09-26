import database from "../config/database.js";

let timer = null;

async function pingDb() {
  try {
    // Use a lightweight command to keep connection warm
    const db = database.db; // db is set after connect()
    if (!db) return;
    // Use admin command ping if available
    try {
      const res = await db.command({ ping: 1 });
      // eslint-disable-next-line no-console
      console.debug("keepAlive ping result", res);
    } catch (e) {
      // fallback: small findOne on any collection
      const collections = await db.collections();
      if (collections && collections.length > 0) {
        await collections[0].findOne({}, { projection: { _id: 1 } });
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("keepAlive ping failed", e && e.message ? e.message : e);
  }
}

function start(intervalMs = 5 * 60 * 1000) {
  stop();
  timer = setInterval(() => {
    // fire and forget
    pingDb();
  }, intervalMs);
  // run first immediately
  pingDb().catch(() => {});
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export { start, stop };
