import express from "express";
import {
  initDb,
  getWord,
  upsertWord,
  closeDb,
  getExampleViByIds,
  updateExampleViIfMissing,
} from "./db.js";
import { crawlWordDirect } from "./crawl.js";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

await initDb();

function validateWord(q) {
  if (!q || typeof q !== "string") return null;
  const cleaned = q.trim().toLowerCase();
  if (!cleaned.match(/^[a-z-]+$/i)) return null;
  return cleaned;
}

app.get("/api/lookup", async (req, res) => {
  try {
    const w = validateWord(req.query.word);
    if (!w) {
      return res.status(400).json({ data: null });
    }

    const cached = await getWord(w);
    if (cached) {
      const arr = JSON.parse(cached.json);
      return res.json({
        data: {
          word: w,
          quantity: Array.isArray(arr) ? arr.length : 0,
          data: arr,
        },
      });
    }

    const data = await crawlWordDirect(w, 5);
    if (!data || data.length === 0) {
      return res.status(404).json({ data: null });
    }
    await upsertWord(w, data);
    return res.json({ data: { word: w, quantity: data.length, data } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ data: null });
  }
});

// POST /api/examples/vi
// body: { ids: ["654...", ...] }
// Returns: { data: [{ _id, vi }] }
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

// POST /api/examples/vi/update
// body: { updates: [{ _id: "654...", vi: "bản dịch" }, ...] }
// Only updates when existing vi is empty
// Returns: { updated, skipped }
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

app.get("/", (req, res) => {
  res.send("Welcome!");
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  try {
    await closeDb();
  } catch (_) {}
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  try {
    await closeDb();
  } catch (_) {}
  server.close(() => process.exit(0));
});
