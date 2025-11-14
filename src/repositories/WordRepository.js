import { ObjectId } from "mongodb";
import { BaseRepository } from "./BaseRepository.js";
import { COLLECTIONS } from "../constants/index.js";

/**
 * WordRepository
 * Repository for Word collection (uses string _id, not ObjectId)
 */
export class WordRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.WORDS);
  }

  /**
   * Create indexes for words collection
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ variants: 1 });
      await this.collection.createIndex({ symbol: 1 });
      await this.collection.createIndex({ parts_of_speech: 1 });
      await this.collection.createIndex({ root: 1 });
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
      { _id: word },
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
      {
        $match: {
          $or: [
            { _id: { $regex: regex } },
            { variants: { $elemMatch: { $regex: regex } } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          // gom tất cả _id + variants thành mảng words
          words: { $addToSet: "$_id" },
          variants: { $addToSet: "$variants" },
        },
      },
      {
        $project: {
          _id: 0,
          // nối _id và variants (flatten)
          words: {
            $reduce: {
              input: "$variants",
              initialValue: "$words",
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $project: {
          words: { $sortArray: { input: "$words", sortBy: -1 } },
          total: { $size: "$words" },
        },
      },
      {
        $project: {
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
    const regex = new RegExp(regexPattern, "i");

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
          _id: "$_id",
          word: "$data.idioms.word",
          pos: "$data.pos",
          isIdiom: { $literal: true },
          documentId: "$_id",
        },
      },
      // Sort theo: documentId -> pos -> word
      {
        $sort: {
          documentId: 1, // 1. Group theo _id
          pos: 1, // 2. Group theo pos
          word: 1, // 3. Sort theo word trong mỗi group
        },
      },
      // Count total và phân trang
      {
        $group: {
          _id: null,
          words: { $push: "$$ROOT" },
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
   * Assign or remove root field for a word document
   * @param {string} wordId
   * @param {string|null} rootId - if null/empty, root will be unset
   */
  async assignRoot(wordId, rootId) {
    await this.init();

    const key = String(wordId || "")
      .toLowerCase()
      .trim();
    if (!key) return { modifiedCount: 0 };

    if (
      rootId === null ||
      rootId === undefined ||
      String(rootId).trim() === ""
    ) {
      const res = await this.collection.updateOne(
        { _id: key },
        { $unset: { root: "" } }
      );
      return res;
    }

    const rootKey = String(rootId).toLowerCase().trim();
    const res = await this.collection.updateOne(
      { _id: key },
      { $set: { root: rootKey } }
    );
    return res;
  }

  /**
   * Find documents that have root equal to given rootId
   * @param {string} rootId
   * @returns {Promise<Array>} array of documents
   */
  async findByRoot(rootId) {
    await this.init();
    if (!rootId) return [];
    const key = String(rootId).toLowerCase().trim();
    const cursor = this.collection.find({ root: key }).sort({ _id: 1 });
    return await cursor.toArray();
  }

  /**
   * Update example vi if missing
   * @param {Array} updates - Array of {_id, vi}
   * @returns {Promise<Object>}
   */
  async updateExampleViIfMissing(updates) {
    await this.init();

    if (!Array.isArray(updates) || updates.length === 0) {
      return { updated: 0, skipped: 0 };
    }

    const operations = [];
    let skipped = 0;

    for (const { _id, vi } of updates) {
      if (!_id || !ObjectId.isValid(_id) || !vi) {
        skipped++;
        continue;
      }

      const objectId =
        _id instanceof ObjectId ? _id : new ObjectId(String(_id));

      // Main sense examples
      operations.push({
        updateMany: {
          filter: {
            "data.senses.examples": {
              $elemMatch: { _id: objectId, vi: { $in: [null, ""] } },
            },
          },
          update: {
            $set: { "data.$[d].senses.$[s].examples.$[ex].vi": vi },
          },
          arrayFilters: [
            { "d.senses.examples._id": objectId },
            { "s.examples._id": objectId },
            { "ex._id": objectId, "ex.vi": { $in: [null, ""] } },
          ],
        },
      });

      // Idiom sense examples
      operations.push({
        updateMany: {
          filter: {
            "data.idioms.senses.examples": {
              $elemMatch: { _id: objectId, vi: { $in: [null, ""] } },
            },
          },
          update: {
            $set: { "data.$[d].idioms.$[i].senses.$[s].examples.$[ex].vi": vi },
          },
          arrayFilters: [
            { "d.idioms.senses.examples._id": objectId },
            { "i.senses.examples._id": objectId },
            { "s.examples._id": objectId },
            { "ex._id": objectId, "ex.vi": { $in: [null, ""] } },
          ],
        },
      });

      // Phrasal verb sense examples
      operations.push({
        updateMany: {
          filter: {
            "data.phrasal_verb_senses.senses.examples": {
              $elemMatch: { _id: objectId, vi: { $in: [null, ""] } },
            },
          },
          update: {
            $set: {
              "data.$[d].phrasal_verb_senses.$[pv].senses.$[s].examples.$[ex].vi":
                vi,
            },
          },
          arrayFilters: [
            { "d.phrasal_verb_senses.senses.examples._id": objectId },
            { "pv.senses.examples._id": objectId },
            { "s.examples._id": objectId },
            { "ex._id": objectId, "ex.vi": { $in: [null, ""] } },
          ],
        },
      });
    }

    if (operations.length === 0) {
      return { updated: 0, skipped };
    }

    const result = await this.collection.bulkWrite(operations, {
      ordered: false,
    });

    // Tính tổng số modifiedCount
    let updated = 0;
    for (const key in result) {
      if (typeof result[key] === "number") {
        updated += result[key];
      }
    }

    return { updated, skipped };
  }
}

export default WordRepository;
