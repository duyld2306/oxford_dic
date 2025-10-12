import WordModel from "../models/Word.js";
import { crawlWordDirect } from "../utils/crawl.js";
import {
  normalizeKey,
  buildVariantsFromPages,
  buildTopSymbolFromPages,
  buildPartsOfSpeechFromPages,
} from "../utils/variants.js";

class WordService {
  constructor() {
    this.wordModel = new WordModel();
  }

  // Get all distinct parts_of_speech arrays from DB and return formatted list
  async getDistinctPartsOfSpeech() {
    try {
      await this.wordModel.init();
      // Aggregate distinct arrays by joined-string key to dedupe exact arrays
      // Only consider documents where parts_of_speech is an array to avoid conversion errors
      const pipeline = [
        { $match: { parts_of_speech: { $type: "array" } } },
        {
          $project: {
            parts_of_speech: 1,
            // join array elements with a separator to create a stable key
            key: {
              $reduce: {
                input: "$parts_of_speech",
                initialValue: "",
                in: {
                  $cond: [
                    { $eq: ["$$value", ""] },
                    "$$this",
                    { $concat: ["$$value", "||", "$$this"] },
                  ],
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$key",
            parts: { $first: "$parts_of_speech" },
          },
        },
        { $project: { _id: 0, parts: 1 } },
      ];

      const rows = await this.wordModel.collection
        .aggregate(pipeline)
        .toArray();
      // Format: [{ label: parts.join("+"), value: JSON.stringify(parts) }]
      return rows.map((r) => ({
        label: Array.isArray(r.parts)
          ? r.parts.length > 0
            ? r.parts.join(" + ")
            : "Other"
          : "",
        value: JSON.stringify(Array.isArray(r.parts) ? r.parts : []),
      }));
    } catch (error) {
      console.error("WordService.getDistinctPartsOfSpeech error:", error);
      return [];
    }
  }

  // Get word by exact match with caching
  async getWord(word) {
    try {
      const normalizedWord = String(word || "")
        .toLowerCase()
        .trim();
      if (!normalizedWord) {
        throw new Error("Word is required");
      }

      // Try to get from database first
      const dbResult = await this.wordModel.findByWord(normalizedWord);

      if (dbResult) {
        return {
          word: normalizedWord,
          quantity: Array.isArray(dbResult.data) ? dbResult.data.length : 0,
          data: dbResult.data || [],
          source: "database",
        };
      }

      // If not found in database, try crawling
      const crawledPages = await crawlWordDirect(normalizedWord, 5);

      if (!crawledPages || crawledPages.length === 0) {
        const err = new Error("Word not found");
        err.status = 404;
        throw err;
      }

      // Build top-level variants array from crawled pages (preserve original casing)
      const finalVariants = buildVariantsFromPages(crawledPages);

      // canonical key: first crawled page's found word normalized
      const canonicalRaw =
        (finalVariants && finalVariants[0]) || normalizedWord;
      const canonicalKey = normalizeKey(canonicalRaw);

      // Compute top-level symbol from page-level symbols collected during crawl
      const topSymbol = buildTopSymbolFromPages(crawledPages);

      // Build parts_of_speech array from crawledPages
      const partsOfSpeech = buildPartsOfSpeechFromPages(crawledPages);

      // Save to database for future use with shape { data: [...], variants: [...], symbol, parts_of_speech }
      await this.wordModel.upsert(canonicalKey, {
        data: crawledPages,
        variants: finalVariants,
        symbol: topSymbol,
        parts_of_speech: partsOfSpeech,
      });

      return {
        word: canonicalKey,
        quantity: crawledPages.length,
        data: crawledPages,
        variants: finalVariants,
        symbol: topSymbol,
        parts_of_speech: partsOfSpeech,
        source: "crawled",
      };
    } catch (error) {
      console.error("WordService.getWord error:", error);
      // rethrow to be handled by controller/error middleware
      throw error;
    }
  }

  // Search words by prefix
  async searchByPrefix(prefix, current = 1, limit = 20) {
    try {
      const searchPrefix = String(prefix || "").trim();
      if (!searchPrefix) {
        const err = new Error("Search prefix is required");
        err.status = 400;
        throw err;
      }

      const result = await this.wordModel.searchByPrefix(
        searchPrefix,
        current,
        limit
      );

      return {
        prefix: searchPrefix,
        total: result.total,
        words: result.words,
      };
    } catch (error) {
      console.error("WordService.searchByPrefix error:", error);
      throw error;
    }
  }

  // Lấy example vi theo ids
  async getExampleViByIds(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return [];
      return await this.wordModel.getExampleViByIds(ids);
    } catch (error) {
      console.error("WordService.getExampleViByIds error:", error);
      return [];
    }
  }

  // Update example vi nếu đang rỗng
  async updateExampleViIfMissing(updates) {
    try {
      if (!Array.isArray(updates) || updates.length === 0)
        return { updated: 0, skipped: 0 };
      return await this.wordModel.updateExampleViIfMissing(updates);
    } catch (error) {
      console.error("WordService.updateExampleViIfMissing error:", error);
      return { updated: 0, skipped: 0 };
    }
  }

  // Update sense-level translations for given sense ids
  async updateSenseDefinitions(updates) {
    try {
      const list = Array.isArray(updates) ? updates : [updates];
      if (list.length === 0) return { updated: 0, skipped: 0 };
      return await this.wordModel.updateSenseDefinitions(list);
    } catch (error) {
      console.error("WordService.updateSenseDefinitions error:", error);
      return { updated: 0, skipped: 0 };
    }
  }

  // Get definition_vi_short for sense ids
  async getSenseDefinitionShortByIds(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return [];
      return await this.wordModel.getSenseDefinitionShortByIds(ids);
    } catch (error) {
      console.error("WordService.getSenseDefinitionShortByIds error:", error);
      return [];
    }
  }

  // Validate word input
  validateWord(word) {
    if (!word || typeof word !== "string") return null;
    const cleaned = word.trim().toLowerCase();
    if (!cleaned.match(/^[a-z\s-]+$/i)) return null;
    return cleaned;
  }

  // Get all documents with pagination
  async getAll({
    page = 1,
    per_page = 100,
    q = "",
    symbol = "",
    parts_of_speech = "",
  }) {
    try {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, parseInt(per_page, 10) || 100);

      // build mongo query
      const query = {};

      // helper to escape user input for regex
      const escapeForRegex = (s) =>
        String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

      if (q) {
        query._id = { $regex: escapeForRegex(q), $options: "i" };
      }

      // parts_of_speech filter: expected as JSON.stringify(sortedArray)
      if (parts_of_speech && String(parts_of_speech).trim() !== "") {
        try {
          const parsed = JSON.parse(parts_of_speech);
          if (Array.isArray(parsed)) {
            // exact match of top-level array (order matters)
            query.parts_of_speech = parsed;
          }
        } catch (e) {
          // ignore parse errors and do not filter
        }
      }

      const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
      if (symbol === "other") {
        query.symbol = { $nin: SYMBOL_ORDER };
      } else if (SYMBOL_ORDER.includes(symbol)) {
        query.symbol = symbol;
      }

      // Use collection directly for filtered pagination
      await this.wordModel.init();
      const skip = (p - 1) * per;

      const projection = {
        _id: 1,
        data: 1,
        variants: 1,
        createdAt: 1,
        updatedAt: 1,
        symbol: 1,
        parts_of_speech: 1,
      };

      const cursor = this.wordModel.collection
        .find(query, { projection })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(per);

      const docs = await cursor.toArray();
      const total = await this.wordModel.collection.countDocuments(query);

      return {
        total,
        page: p,
        per_page: per,
        data: docs,
      };
    } catch (error) {
      console.error("WordService.getAll error:", error);
      throw error;
    }
  }

  // Specialized, lightweight search for UI search/autocomplete
  // Returns only array of _id strings and pagination meta. Does NOT modify getAll()
  async getAllForSearch({ page = 1, per_page = 50, q = "" }) {
    try {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, parseInt(per_page, 10) || 50);

      // helper to escape user input for regex
      const escapeForRegex = (s) =>
        String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

      // prefix-only anchored, case-insensitive
      const query = {
        _id: { $regex: `^${escapeForRegex(q)}`, $options: "i" },
      };

      await this.wordModel.init();
      const skip = (p - 1) * per;

      // Only project _id to minimize IO
      const cursor = this.wordModel.collection
        .find(query, { projection: { _id: 1 } })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(per);

      const rows = await cursor.toArray();
      const total = await this.wordModel.collection.countDocuments(query);

      // map ObjectId or string _id to string
      const ids = rows.map((r) => (r && r._id ? String(r._id) : ""));

      return { total, page: p, per_page: per, data: ids };
    } catch (error) {
      console.error("WordService.getAllForSearch error:", error);
      throw error;
    }
  }
}

export default WordService;
