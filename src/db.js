import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

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

// Normalize word to group similar words (e.g., -ability, ability-, ability -> ability)
function normalizeWord(word) {
  if (!word || typeof word !== "string") return "";

  // Remove leading and trailing hyphens and convert to lowercase
  return word
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .trim();
}

// Group words by their normalized form
function groupWordsByNormalizedForm(words) {
  const groups = {};

  for (const wordData of words) {
    if (!wordData || !wordData.word) continue;

    const normalized = normalizeWord(wordData.word);
    if (!normalized) continue;

    if (!groups[normalized]) {
      groups[normalized] = [];
    }

    // Add ObjectId to each word entry if not present
    if (!wordData._id) {
      wordData._id = new ObjectId();
    }

    groups[normalized].push(wordData);
  }

  return groups;
}

// Import data from JSON file and save to database
export async function importJsonData(filePath) {
  if (!collection) await initDb();

  try {
    // Read and parse JSON file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const words = JSON.parse(fileContent);

    if (!Array.isArray(words)) {
      throw new Error("JSON file must contain an array of word objects");
    }

    // Group words by normalized form
    const groupedWords = groupWordsByNormalizedForm(words);

    const results = {
      totalWords: words.length,
      groupedWords: Object.keys(groupedWords).length,
      imported: 0,
      errors: [],
    };

    // Save each group to database
    for (const [normalizedWord, wordData] of Object.entries(groupedWords)) {
      try {
        const nowIso = new Date().toISOString();

        // Check if word already exists
        const existingWord = await collection.findOne({ _id: normalizedWord });

        if (existingWord) {
          // Word exists, merge new data with existing data
          const existingData = existingWord.data || [];
          const existingWordTexts = new Set(
            existingData.map((item) => item.word)
          );

          // Only add new word entries that don't already exist
          const newWordData = wordData.filter(
            (item) => !existingWordTexts.has(item.word)
          );

          if (newWordData.length > 0) {
            await collection.updateOne(
              { _id: normalizedWord },
              {
                $push: { data: { $each: newWordData } },
                $set: { updatedAt: nowIso },
              }
            );
            results.imported++;
            console.log(
              `✅ Merged ${newWordData.length} new entries for word: ${normalizedWord}`
            );
          } else {
            console.log(`⏭️  Skipped word: ${normalizedWord} (no new entries)`);
          }
        } else {
          // Word doesn't exist, create new entry
          await collection.updateOne(
            { _id: normalizedWord },
            {
              $set: {
                data: wordData,
                updatedAt: nowIso,
              },
              $setOnInsert: {
                createdAt: nowIso,
              },
            },
            { upsert: true }
          );
          results.imported++;
          console.log(
            `✅ Created new word: ${normalizedWord} with ${wordData.length} entries`
          );
        }
      } catch (error) {
        results.errors.push({
          word: normalizedWord,
          error: error.message,
        });
        console.error(
          `❌ Error processing word ${normalizedWord}:`,
          error.message
        );
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to import JSON data: ${error.message}`);
  }
}

// Import multiple JSON files (a.json, b.json, etc.)
export async function importMultipleJsonFiles(directoryPath = "./src/mock") {
  if (!collection) await initDb();

  const results = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: [],
    totalWords: 0,
    totalGroupedWords: 0,
    totalImported: 0,
    allErrors: [],
  };

  try {
    // Get all JSON files in directory
    const files = fs
      .readdirSync(directoryPath)
      .filter((file) => file.endsWith(".json"))
      .sort();

    results.totalFiles = files.length;

    for (const file of files) {
      try {
        const filePath = path.join(directoryPath, file);
        const fileResult = await importJsonData(filePath);

        results.successfulFiles++;
        results.totalWords += fileResult.totalWords;
        results.totalGroupedWords += fileResult.groupedWords;
        results.totalImported += fileResult.imported;
        results.allErrors.push(...fileResult.errors);

        console.log(
          `✅ Imported ${file}: ${fileResult.imported}/${fileResult.totalWords} words grouped into ${fileResult.groupedWords} entries`
        );
      } catch (error) {
        results.failedFiles.push({
          file,
          error: error.message,
        });
        console.error(`❌ Failed to import ${file}: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to import multiple JSON files: ${error.message}`);
  }
}
