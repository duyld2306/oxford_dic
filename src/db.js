import { MongoClient } from "mongodb";

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
