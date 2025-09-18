import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";

// Use the provided MongoDB Atlas URI
const MONGO_URI =
  "mongodb+srv://ledacduyy_db_user:z26eNCj52nghHgwo@oxford-dic.h4p0zyz.mongodb.net/?retryWrites=true&w=majority&appName=oxford-dic";

// Choose a database and collection name
const DB_NAME = "oxford-dic";
const COLLECTION_NAME = "words";

let client = null;
let collection = null;

export async function initDb() {
  if (collection) return;
  client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection(COLLECTION_NAME);
}

export async function getWord(word) {
  if (!collection) await initDb();
  const key = String(word || "").toLowerCase();
  const doc = await collection.findOne(
    { _id: key },
    { projection: { data: 1 } }
  );
  if (!doc) return null;
  return { word: key, json: JSON.stringify(doc.data || []) };
}

export async function upsertWord(word, jsonData) {
  if (!collection) await initDb();
  const key = String(word || "").toLowerCase();
  const nowIso = new Date().toISOString();
  const data = Array.isArray(jsonData)
    ? jsonData
    : JSON.parse(String(jsonData || "[]"));
  await collection.updateOne(
    { _id: key },
    {
      $set: {
        data,
        updatedAt: nowIso,
      },
      $setOnInsert: {
        createdAt: nowIso,
      },
    },
    { upsert: true }
  );
  return true;
}

export async function closeDb() {
  if (client) {
    try {
      await client.close();
    } catch (_) {}
  }
  client = null;
  collection = null;
}

// Fetch example translations (vi) by one or many nested example _id
// Returns array of { _id: ObjectId, vi: string }
export async function getExampleViByIds(idList) {
  if (!collection) await initDb();
  const ids = (Array.isArray(idList) ? idList : [])
    .filter(Boolean)
    .map((v) => (v instanceof ObjectId ? v : new ObjectId(String(v))));
  if (ids.length === 0) return [];

  const pipeline = [
    { $unwind: "$data" },
    { $unwind: "$data.senses" },
    { $unwind: "$data.senses.examples" },
    { $match: { "data.senses.examples._id": { $in: ids } } },
    {
      $project: {
        _id: "$data.senses.examples._id",
        vi: "$data.senses.examples.vi",
      },
    },
    {
      $unionWith: {
        coll: COLLECTION_NAME,
        pipeline: [
          { $unwind: "$data" },
          { $unwind: "$data.idioms" },
          { $unwind: "$data.idioms.senses" },
          { $unwind: "$data.idioms.senses.examples" },
          { $match: { "data.idioms.senses.examples._id": { $in: ids } } },
          {
            $project: {
              _id: "$data.idioms.senses.examples._id",
              vi: "$data.idioms.senses.examples.vi",
            },
          },
        ],
      },
    },
    // In case duplicates happen (shouldn't), keep first
    {
      $group: { _id: "$_id", vi: { $first: "$vi" } },
    },
  ];

  const cursor = collection.aggregate(pipeline, { allowDiskUse: true });
  const results = await cursor.toArray();
  return results.map((r) => ({ _id: r._id, vi: r.vi || "" }));
}

// Update example "vi" for provided ids only when current vi is null/empty
// updates: array of { _id: ObjectId|string, vi: string }
// Returns { updated: number, skipped: number }
export async function updateExampleViIfMissing(updates) {
  if (!collection) await initDb();
  const list = Array.isArray(updates) ? updates : [];
  let updated = 0;
  let skipped = 0;

  for (const item of list) {
    if (!item || !item._id || typeof item.vi !== "string") {
      skipped++;
      continue;
    }
    let exId;
    try {
      exId =
        item._id instanceof ObjectId
          ? item._id
          : new ObjectId(String(item._id));
    } catch (_) {
      skipped++;
      continue;
    }
    const viText = item.vi.trim();
    if (!viText) {
      skipped++;
      continue;
    }

    const res = await collection.updateMany(
      {},
      {
        $set: {
          "data.$[].senses.$[].examples.$[e].vi": viText,
          "data.$[].idioms.$[].senses.$[].examples.$[e].vi": viText,
        },
      },
      {
        arrayFilters: [{ "e._id": exId, "e.vi": { $in: [null, ""] } }],
      }
    );

    if ((res.modifiedCount || 0) > 0) updated += res.modifiedCount;
    else skipped++;
  }

  return { updated, skipped };
}
