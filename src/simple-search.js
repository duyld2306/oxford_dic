import express from "express";
import compression from "compression";
import { MongoClient } from "mongodb";

const app = express();
app.use(compression());
app.use(express.json());

// Database connection
const MONGO_URI =
  "mongodb+srv://ledacduyy_db_user:z26eNCj52nghHgwo@oxford-dic.h4p0zyz.mongodb.net/?retryWrites=true&w=majority&appName=oxford-dic";
const DB_NAME = "oxford-dic";
const COLLECTION_NAME = "words";

let client = null;
let collection = null;

async function initDb() {
  if (collection) return;
  client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection(COLLECTION_NAME);
}

// Search words by prefix
app.get("/api/search", async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
      });
    }

    await initDb();
    const searchPrefix = String(query).toLowerCase().trim();

    const pipeline = [
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
        },
      },
      {
        $unwind: "$data",
      },
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
        },
      },
      {
        $project: {
          word: "$data.word",
          pos: "$data.pos",
          symbol: "$data.symbol",
          phonetic_text: "$data.phonetic_text",
          _id: "$data._id",
        },
      },
      {
        $group: {
          _id: "$word",
          word: { $first: "$word" },
          pos: { $addToSet: "$pos" },
          symbol: { $first: "$symbol" },
          phonetic_text: { $first: "$phonetic_text" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { word: 1 },
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return res.json({
      success: true,
      data: {
        query: searchPrefix,
        count: results.length,
        words: results,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Original lookup API
app.get("/api/lookup", async (req, res) => {
  try {
    const { word } = req.query;
    if (!word) {
      return res
        .status(400)
        .json({ success: false, error: "Word parameter is required" });
    }

    await initDb();
    const key = String(word).toLowerCase();
    const doc = await collection.findOne(
      { _id: key },
      { projection: { data: 1 } }
    );

    if (!doc) {
      return res.status(404).json({ success: false, error: "Word not found" });
    }

    return res.json({
      success: true,
      data: {
        word: key,
        quantity: Array.isArray(doc.data) ? doc.data.length : 0,
        data: doc.data || [],
      },
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Oxford Dictionary API with Search",
    endpoints: {
      lookup: "GET /api/lookup?word=hang",
      search: "GET /api/search?q=hang&limit=20",
    },
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Search API running on http://localhost:${PORT}`);
  console.log(`🔍 Search: http://localhost:${PORT}/api/search?q=hang`);
  console.log(`📖 Lookup: http://localhost:${PORT}/api/lookup?word=hang`);
});
