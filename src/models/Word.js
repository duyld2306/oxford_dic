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

  // Search words by prefix (case insensitive)
  async searchByPrefix(prefix, current = 1, limit = 20) {
    await this.init();

    let searchPrefix = String(prefix || "")
      .replace(/[^a-z-]+/gi, " ") // Loại bỏ ký tự không phải chữ hoặc "-", thay bằng space
      .replace(/\s+/g, " ") // Gom nhiều space thành 1
      .replace(/-+/g, "-") // Gom nhiều dấu '-' liên tiếp thành 1
      .replace(/^-+|-+$/g, "") // Xóa '-' ở đầu hoặc cuối chuỗi
      .trim(); // Xóa space 2 đầu

    if (!searchPrefix) {
      return { total: 0, words: [] };
    }

    const regex = new RegExp(`^${searchPrefix}`, "i");

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
          words: { $addToSet: "$data.word" }, // gom thành mảng, loại trùng
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
            $slice: ["$words", (current - 1) * limit, limit],
          },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result.length > 0
      ? { total: result[0].total, words: result[0].words }
      : { total: 0, words: [] };
  }

  async searchByIdiomsOnly(prefix, current = 1, limit = 20) {
    await this.init();

    let searchPrefix = String(prefix || "").trim();
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
          words: { $slice: ["$words", (current - 1) * limit, limit] },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();

    if (!result.length || !result[0].words) {
      return { total: 0, words: [] };
    }

    // 2️⃣ Sort logic ở NodeJS (ưu tiên match mạnh hơn)
    const words = result[0].words.sort((a, b) => {
      const aWord = a.word.toLowerCase();
      const bWord = b.word.toLowerCase();
      const exact = searchPrefix.toLowerCase();

      // Ưu tiên: trùng toàn cụm
      if (aWord === exact && bWord !== exact) return -1;
      if (bWord === exact && aWord !== exact) return 1;

      // Ưu tiên: có cụm liền nhau
      const aHasPhrase = aWord.includes(exact);
      const bHasPhrase = bWord.includes(exact);
      if (aHasPhrase && !bHasPhrase) return -1;
      if (!aHasPhrase && bHasPhrase) return 1;

      // Giữ nguyên thứ tự còn lại
      return 0;
    });

    // 3️⃣ Cắt phân trang
    const paginated = words.slice((current - 1) * limit, current * limit);

    return {
      total: result[0].total,
      words: paginated,
    };
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
      if (typeof data.symbol === "string") topLevel.symbol = data.symbol;
      if (Array.isArray(data.parts_of_speech))
        topLevel.parts_of_speech = data.parts_of_speech;
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

  // Paginate all documents
  // returns { total, docs }
  async paginate(page = 1, perPage = 100) {
    await this.init();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePer = Math.max(1, parseInt(perPage, 10) || 100);
    const skip = (safePage - 1) * safePer;

    const projection = {
      _id: 1,
      data: 1,
      variants: 1,
      createdAt: 1,
      updatedAt: 1,
      symbol: 1,
    };

    const cursor = this.collection
      .find({}, { projection })
      .sort({ _id: 1 })
      .skip(skip)
      .limit(safePer);
    const docs = await cursor.toArray();
    const total = await this.collection.countDocuments();
    return { total, docs };
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
            "data.$[].phrasal_verb_senses.$[].senses.$[].examples.$[e].vi":
              viText,
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

  // Update sense-level Vietnamese definitions by sense _id
  // updates: [{ _id, definition_vi?, definition_vi_short? }, ...]
  async updateSenseDefinitions(updates) {
    await this.init();
    const list = Array.isArray(updates) ? updates : [updates];
    let updated = 0;
    let skipped = 0;

    for (const item of list) {
      if (!item || !item._id) {
        skipped++;
        continue;
      }

      let senseId;
      try {
        senseId =
          item._id instanceof ObjectId
            ? item._id
            : new ObjectId(String(item._id));
      } catch (e) {
        skipped++;
        continue;
      }

      const setObj = {};
      if (typeof item.definition_vi === "string")
        setObj["data.$[].senses.$[s].definition_vi"] = item.definition_vi;
      if (typeof item.definition_vi_short === "string")
        setObj["data.$[].senses.$[s].definition_vi_short"] =
          item.definition_vi_short;
      if (typeof item.definition_vi === "string")
        setObj["data.$[].idioms.$[].senses.$[s].definition_vi"] =
          item.definition_vi;
      if (typeof item.definition_vi_short === "string")
        setObj["data.$[].idioms.$[].senses.$[s].definition_vi_short"] =
          item.definition_vi_short;
      if (typeof item.definition_vi === "string")
        setObj["data.$[].phrasal_verb_senses.$[].senses.$[s].definition_vi"] =
          item.definition_vi;
      if (typeof item.definition_vi_short === "string")
        setObj[
          "data.$[].phrasal_verb_senses.$[].senses.$[s].definition_vi_short"
        ] = item.definition_vi_short;

      if (Object.keys(setObj).length === 0) {
        skipped++;
        continue;
      }

      const res = await this.collection.updateMany(
        {},
        { $set: setObj },
        { arrayFilters: [{ "s._id": senseId }] }
      );

      if ((res.modifiedCount || 0) > 0) updated += res.modifiedCount;
      else skipped++;
    }

    return { updated, skipped };
  }

  // Get sense-level definition_vi_short for given sense _id list
  async getSenseDefinitionShortByIds(idList) {
    await this.init();
    const ids = (Array.isArray(idList) ? idList : [])
      .filter(Boolean)
      .map((v) => (v instanceof ObjectId ? v : new ObjectId(String(v))));
    if (ids.length === 0) return [];

    const pipeline = [
      { $unwind: "$data" },
      { $unwind: "$data.senses" },
      { $match: { "data.senses._id": { $in: ids } } },
      {
        $project: {
          _id: "$data.senses._id",
          definition_vi_short: "$data.senses.definition_vi_short",
          definition_vi: "$data.senses.definition_vi",
        },
      },
      {
        $unionWith: {
          coll: this.collection.collectionName,
          pipeline: [
            { $unwind: "$data" },
            { $unwind: "$data.idioms" },
            { $unwind: "$data.idioms.senses" },
            { $match: { "data.idioms.senses._id": { $in: ids } } },
            {
              $project: {
                _id: "$data.idioms.senses._id",
                definition_vi_short: "$data.idioms.senses.definition_vi_short",
                definition_vi: "$data.idioms.senses.definition_vi",
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
            { $unwind: "$data.phrasal_verb_senses.senses" },
            {
              $match: {
                "data.phrasal_verb_senses.senses._id": { $in: ids },
              },
            },
            {
              $project: {
                _id: "$data.phrasal_verb_senses.senses._id",
                definition_vi_short:
                  "$data.phrasal_verb_senses.senses.definition_vi_short",
                definition_vi: "$data.phrasal_verb_senses.senses.definition_vi",
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$_id",
          definition_vi_short: { $first: "$definition_vi_short" },
          definition_vi: { $first: "$definition_vi" },
        },
      },
    ];

    const cursor = this.collection.aggregate(pipeline, { allowDiskUse: true });
    const results = await cursor.toArray();
    return results.map((r) => ({
      _id: r._id,
      definition_vi_short: r.definition_vi_short || "",
      definition_vi: r.definition_vi || "",
    }));
  }
}

export default WordModel;
