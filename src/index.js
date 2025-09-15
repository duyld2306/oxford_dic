import express from "express";
import { initDb, getWord, upsertWord } from "./db.js";
import { crawlWordDirect } from "./crawl.js";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

initDb();

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

// POST /api/import-file
// body: { filePath: "absolute/or/relative/path/to.json", word?: "optional-key" }
// - If file is an array: uses 'word' param for key, or derives from filename
// - If file is object: expects shape { word: string, data: array } or { [word]: array }
app.post("/api/import-file", async (req, res) => {
  try {
    const { filePath, word } = req.body || {};
    if (!filePath || typeof filePath !== "string") {
      return res
        .status(400)
        .json({ imported: 0, skipped: 0, errors: ["filePath required"] });
    }
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
      return res
        .status(400)
        .json({ imported: 0, skipped: 0, errors: ["file not found"] });
    }
    const raw = fs.readFileSync(resolved, "utf-8");
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return res
        .status(400)
        .json({ imported: 0, skipped: 0, errors: ["invalid JSON"] });
    }

    let entries = [];
    if (Array.isArray(json)) {
      const inferred =
        word || path.basename(resolved, path.extname(resolved)).toLowerCase();
      entries.push({ key: inferred, value: json });
    } else if (json && typeof json === "object") {
      if (json.word && Array.isArray(json.data)) {
        entries.push({
          key: String(json.word).toLowerCase(),
          value: json.data,
        });
      } else {
        for (const k of Object.keys(json)) {
          if (Array.isArray(json[k])) {
            entries.push({ key: String(k).toLowerCase(), value: json[k] });
          }
        }
      }
    }

    if (entries.length === 0) {
      return res
        .status(400)
        .json({ imported: 0, skipped: 0, errors: ["no importable entries"] });
    }

    let imported = 0;
    let skipped = 0;
    for (const { key, value } of entries) {
      const existing = await getWord(key);
      if (existing) {
        skipped++;
        continue;
      }
      await upsertWord(key, value);
      imported++;
    }

    return res.json({ imported, skipped, errors: [] });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ imported: 0, skipped: 0, errors: ["internal error"] });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
