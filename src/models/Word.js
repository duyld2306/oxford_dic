import { ObjectId } from "mongodb";
import database from "../config/database.js";

// escape string to be used inside RegExp
const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class WordModel {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.getCollection();
    }
  }

  // Get word by exact match
  async findByWord(word) {
    await this.init();
    const key = String(word || "").trim();
    if (!key) return null;

    // normalized lookup key (_id is stored as lowercase normalized)
    const lowerKey = key.replace(/\s+/g, " ").toLowerCase();

    // try exact _id match first, then by top-level `variants` array (case-insensitive element match)
    const re = new RegExp(`^${escapeForRegex(key)}$`, "i");

    const doc = await this.collection.findOne(
      {
        $or: [{ _id: lowerKey }, { variants: { $elemMatch: { $regex: re } } }],
      },
      {
        projection: {
          _id: 1,
          data: 1,
          variants: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    return doc;
  }

  // (removed) findByVariant - use findByWord instead which already checks top-level variants case-insensitively

  // Search words by prefix (case insensitive)
  async searchByPrefix(prefix, limit = 20) {
    await this.init();
    const searchPrefix = String(prefix || "").trim();
    if (!searchPrefix) return [];

    // Case-insensitive regex anchored at start
    const regex = new RegExp(
      `^${searchPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i"
    );

    const pipeline = [
      { $unwind: "$data" },
      {
        $match: {
          $or: [
            { "data.word": { $regex: regex } },
            { _id: { $regex: regex } },
            { variants: { $elemMatch: { $regex: regex } } },
          ],
        },
      },
      {
        $group: {
          _id: "$data.word",
          word: { $first: "$data.word" },
        },
      },
      { $sort: { word: 1 } },
      { $limit: limit },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // Upsert word data
  async upsert(word, data) {
    await this.init();
    const key = String(word || "").toLowerCase();
    const nowIso = new Date().toISOString();

    // Accept two shapes: legacy `data` is array, or new shape { data: [...], variants: [...] }
    let dbData = data;
    const topLevel = {};
    if (data && Array.isArray(data.data)) {
      dbData = data.data;
      if (Array.isArray(data.variants)) topLevel.variants = data.variants;
    }

    const result = await this.collection.updateOne(
      { _id: key },
      {
        $set: Object.assign({ data: dbData, updatedAt: nowIso }, topLevel),
        $setOnInsert: { createdAt: nowIso },
      },
      { upsert: true }
    );

    return result;
  }

  // Lấy example vi theo ids
  async getExampleViByIds(idList) {
    await this.init();
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
          coll: this.collection.collectionName,
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
      {
        $unionWith: {
          coll: this.collection.collectionName,
          pipeline: [
            { $unwind: "$data" },
            { $unwind: "$data.phrasal_verb_senses" },
            { $unwind: "$data.phrasal_verb_senses.examples" },
            {
              $match: { "data.phrasal_verb_senses.examples._id": { $in: ids } },
            },
            {
              $project: {
                _id: "$data.phrasal_verb_senses.examples._id",
                vi: "$data.phrasal_verb_senses.examples.vi",
              },
            },
          ],
        },
      },
      { $group: { _id: "$_id", vi: { $first: "$vi" } } },
    ];
    const cursor = this.collection.aggregate(pipeline, { allowDiskUse: true });
    const results = await cursor.toArray();
    return results.map((r) => ({ _id: r._id, vi: r.vi || "" }));
  }

  // Update example "vi" cho các ids nếu đang rỗng
  async updateExampleViIfMissing(updates) {
    await this.init();
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
      const res = await this.collection.updateMany(
        {},
        {
          $set: {
            "data.$[].senses.$[].examples.$[e].vi": viText,
            "data.$[].idioms.$[].senses.$[].examples.$[e].vi": viText,
            "data.$[].phrasal_verb_senses.$[].examples.$[e].vi": viText,
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
}

export default WordModel;
