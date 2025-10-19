import { ObjectId } from "mongodb";
import { BaseRepository } from "./BaseRepository.js";
import database from "../config/database.js";

/**
 * WordRepository
 * Repository for Word collection (uses string _id, not ObjectId)
 */
export class WordRepository extends BaseRepository {
  constructor() {
    super("words"); // Collection name from database.getCollection()
  }

  /**
   * Override init to use database.getCollection() instead of db.collection()
   */
  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.getCollection(); // Words collection
      await this.createIndexes();
    }
  }

  /**
   * Create indexes for words collection
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ _id: 1 });
      await this.collection.createIndex({ variants: 1 });
      await this.collection.createIndex({ symbol: 1 });
      await this.collection.createIndex({ parts_of_speech: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ Word indexes created successfully");
    } catch (error) {
      console.error("⚠️ Word index creation failed:", error.message);
    }
  }

  /**
   * Find word by word string (not ObjectId)
   * @param {string} word - Word string
   * @returns {Promise<Object|null>}
   */
  async findByWord(word) {
    await this.init();
    const key = String(word || "")
      .toLowerCase()
      .trim();
    return await this.collection.findOne({ _id: key });
  }

  /**
   * Upsert word data
   * @param {string} word - Word key
   * @param {Object} data - Word data
   * @returns {Promise<Object>}
   */
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
      if (typeof data.symbol === "string") topLevel.symbol = data.symbol;
      if (Array.isArray(data.parts_of_speech))
        topLevel.parts_of_speech = data.parts_of_speech;
    }

    const result = await this.collection.updateOne(
      { _id: key },
      {
        $set: {
          data: dbData,
          updatedAt: nowIso,
          ...topLevel,
        },
        $setOnInsert: {
          createdAt: nowIso,
        },
      },
      { upsert: true }
    );

    return result;
  }

  /**
   * Search words by prefix (in _id and variants)
   * @param {string} searchPrefix - Search prefix
   * @param {number} page - Current page (default 1)
   * @param {number} per_page - Items per page (default 100)
   * @returns {Promise<Object>}
   */
  async searchByPrefix(searchPrefix, page = 1, per_page = 100) {
    await this.init();

    const escapeForRegex = (s) =>
      String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapeForRegex(searchPrefix)}`, "i");

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
          _id: null,
          words: { $addToSet: "$data.word" },
        },
      },
      {
        $project: {
          _id: 0,
          words: { $sortArray: { input: "$words", sortBy: -1 } },
          total: { $size: "$words" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          words: {
            $slice: ["$words", (page - 1) * per_page, per_page],
          },
        },
      },
    ];

    const result = await this.aggregate(pipeline);
    return result.length > 0
      ? { total: result[0].total, words: result[0].words }
      : { total: 0, words: [] };
  }

  /**
   * Search idioms by prefix
   * @param {string} searchPrefix - Search prefix
   * @param {number} page - Current page (default 1)
   * @param {number} per_page - Items per page (default 100)
   * @returns {Promise<Object>}
   */
  async searchByIdiomsOnly(searchPrefix, page = 1, per_page = 100) {
    await this.init();

    if (!searchPrefix) return { total: 0, words: [] };

    // 🧹 Làm sạch input: chỉ giữ lại chữ (hoa + thường)
    searchPrefix = searchPrefix
      .replace(/[^A-Za-z]+/g, " ") // Loại bỏ ký tự không phải chữ
      .replace(/\s+/g, " ") // Gom nhiều space
      .trim();

    // 🔍 Chuyển các khoảng trắng thành ".*" để match đa token
    const regexPattern = searchPrefix.replace(/\s+/g, ".*");
    const regex = new RegExp(regexPattern, "i"); // "i" => không phân biệt hoa/thường

    const pipeline = [
      { $unwind: "$data" },
      { $unwind: "$data.idioms" },
      {
        $match: {
          "data.idioms.word": { $regex: regex },
        },
      },
      {
        $project: {
          _id: 1,
          word: "$data.idioms.word",
          pos: "$data.pos",
          isIdiom: { $literal: true },
          documentId: "$_id",
        },
      },
      {
        $group: {
          _id: "$word",
          doc: { $first: "$$ROOT" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $group: {
          _id: null,
          words: { $push: "$doc" },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          words: { $slice: ["$words", (page - 1) * per_page, per_page] },
        },
      },
    ];

    const result = await this.aggregate(pipeline);
    if (result.length === 0) return { total: 0, words: [] };

    return {
      total: result[0].total,
      words: result[0].words || [],
    };
  }

  /**
   * Get example vi by ids
   * @param {Array<ObjectId>} ids - Array of example IDs
   * @returns {Promise<Array>}
   */
  async getExampleViByIds(ids) {
    await this.init();

    if (!Array.isArray(ids) || ids.length === 0) return [];

    const objectIds = ids.map((id) =>
      id instanceof ObjectId ? id : new ObjectId(id)
    );

    const pipeline = [
      { $unwind: "$data" },
      { $unwind: "$data.senses" },
      { $unwind: "$data.senses.examples" },
      { $match: { "data.senses.examples._id": { $in: objectIds } } },
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
            {
              $match: {
                "data.idioms.senses.examples._id": { $in: objectIds },
              },
            },
            {
              $project: {
                _id: "$data.idioms.senses.examples._id",
                vi: "$data.idioms.senses.examples.vi",
              },
            },
          ],
        },
      },
    ];

    const results = await this.aggregate(pipeline, { allowDiskUse: true });
    return results.map((r) => ({ _id: r._id, vi: r.vi || "" }));
  }

  /**
   * Update example vi if missing
   * @param {Array} updates - Array of {_id, vi}
   * @returns {Promise<Object>}
   */
  async updateExampleViIfMissing(updates) {
    await this.init();

    let updated = 0;
    let skipped = 0;

    for (const { _id, vi } of updates) {
      if (!_id || !vi) {
        skipped++;
        continue;
      }

      const objectId = _id instanceof ObjectId ? _id : new ObjectId(_id);

      const result = await this.collection.updateMany(
        {
          $or: [
            {
              "data.senses.examples": {
                $elemMatch: { _id: objectId, vi: { $in: [null, ""] } },
              },
            },
            {
              "data.idioms.senses.examples": {
                $elemMatch: { _id: objectId, vi: { $in: [null, ""] } },
              },
            },
          ],
        },
        {
          $set: {
            "data.$[].senses.$[].examples.$[ex].vi": vi,
            "data.$[].idioms.$[].senses.$[].examples.$[ex].vi": vi,
          },
        },
        {
          arrayFilters: [{ "ex._id": objectId }],
        }
      );

      if (result.modifiedCount > 0) updated++;
      else skipped++;
    }

    return { updated, skipped };
  }
}

export default WordRepository;
