import { ObjectId } from "mongodb";
import database from "../config/database.js";

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
    const raw = String(word || "").trim();
    if (!raw) return null;
    // normalize: collapse multiple spaces -> single space, then lowercase
    const key = raw.replace(/\s+/g, " ").toLowerCase();
    const dashed = key.replace(/\s+/g, "-");
    const candidates = Array.from(new Set([key, dashed]));

    // Try multiple lookup strategies:
    // 1) top-level _id
    // 2) any element in data.relate_word
    // 3) any element in data.word
    const doc = await this.collection.findOne(
      {
        $or: [
          { _id: { $in: candidates } },
          { "data.relate_word": { $in: candidates } },
          { "data.word": { $in: candidates } },
        ],
      },
      { projection: { data: 1, createdAt: 1, updatedAt: 1 } }
    );

    return doc;
  }

  // Search words by prefix (case insensitive)
  async searchByPrefix(prefix, limit = 20) {
    await this.init();
    const searchPrefix = String(prefix || "").toLowerCase();

    if (!searchPrefix) return [];

    const pipeline = [
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
        },
      },
      { $unwind: "$data" },
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
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

    const result = await this.collection.updateOne(
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
