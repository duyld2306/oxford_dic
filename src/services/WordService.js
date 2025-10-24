import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { WordRepository } from "../repositories/WordRepository.js";
import { crawlWordDirect } from "../utils/crawl.js";
import {
  normalizeKey,
  buildVariantsFromPages,
  buildTopSymbolFromPages,
  buildPartsOfSpeechFromPages,
} from "../utils/variants.js";
import {
  WordDTO,
  WordLookupDTO,
  ExampleViDTO,
  SenseDefinitionDTO,
  PartsOfSpeechDTO,
} from "../dtos/WordDTO.js";

class WordService extends BaseService {
  constructor(wordRepository = null, dependencies = {}) {
    super(wordRepository || new WordRepository(), dependencies);
  }

  // Get all distinct parts_of_speech arrays from DB and return formatted list
  async getDistinctPartsOfSpeech() {
    return this.execute(async () => {
      await this.repository.init();
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

      const rows = await this.repository.collection
        .aggregate(pipeline)
        .toArray();

      // Format and transform using DTO
      const formatted = rows.map((r) => ({
        label: Array.isArray(r.parts)
          ? r.parts.length > 0
            ? r.parts.join(" + ")
            : "Other"
          : "",
        value: JSON.stringify(Array.isArray(r.parts) ? r.parts : []),
      }));

      return formatted.map((item) => new PartsOfSpeechDTO(item).transform());
    }, "getDistinctPartsOfSpeech");
  }

  // Get word by exact match with caching
  async getWord(word) {
    return this.execute(async () => {
      const normalizedWord = String(word || "")
        .toLowerCase()
        .trim();

      this.validateRequired({ word: normalizedWord }, ["word"]);

      // Try to get from database first
      const dbResult = await this.repository.findByWord(normalizedWord);

      if (dbResult) {
        const result = {
          word: normalizedWord,
          quantity: Array.isArray(dbResult.data) ? dbResult.data.length : 0,
          data: dbResult.data || [],
          variants: dbResult.variants || [],
          symbol: dbResult.symbol || "",
          parts_of_speech: dbResult.parts_of_speech || [],
          source: "database",
        };
        return new WordLookupDTO(result).transform();
      }

      // If not found in database, try crawling
      this.log("info", `Crawling word: ${normalizedWord}`);
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

      // Save to database for future use
      await this.repository.upsert(canonicalKey, {
        data: crawledPages,
        variants: finalVariants,
        symbol: topSymbol,
        parts_of_speech: partsOfSpeech,
      });

      this.log("info", `Word crawled and saved: ${canonicalKey}`);

      const result = {
        word: canonicalKey,
        quantity: crawledPages.length,
        data: crawledPages,
        variants: finalVariants,
        symbol: topSymbol,
        parts_of_speech: partsOfSpeech,
        source: "crawled",
      };

      return new WordLookupDTO(result).transform();
    }, "getWord");
  }

  // Search words by prefix including idioms
  async searchByPrefix(prefix, page = 1, per_page = 100, type = null) {
    return this.execute(async () => {
      const searchPrefix = prefix.trim();

      let result;
      if (type === "idiom") {
        // Search only in idioms
        result = await this.repository.searchByIdiomsOnly(
          searchPrefix,
          page,
          per_page
        );

        return {
          prefix: searchPrefix,
          total: result.total,
          words: result.words,
        };
      } else {
        // Search only in _id and variants
        result = await this.repository.searchByPrefix(
          searchPrefix,
          page,
          per_page
        );

        // Transform the result to match the expected format
        const formattedWords = result.words.map((word) => ({
          _id: word, // For word search, the word itself is the _id
          word: word,
          isIdiom: false,
        }));

        return {
          prefix: searchPrefix,
          total: result.total,
          words: formattedWords,
        };
      }
    }, "searchByPrefix");
  }

  // Lấy example vi theo ids
  async getExampleViByIds(ids) {
    return this.execute(async () => {
      if (!Array.isArray(ids) || ids.length === 0) return [];

      const results = await this.repository.getExampleViByIds(ids);
      return results.map((item) => new ExampleViDTO(item).transform());
    }, "getExampleViByIds");
  }

  // Update example vi nếu đang rỗng
  async updateExampleViIfMissing(updates) {
    return this.execute(async () => {
      if (!Array.isArray(updates) || updates.length === 0)
        return { updated: 0, skipped: 0 };

      this.log("info", `Updating ${updates.length} example vi`);
      return await this.repository.updateExampleViIfMissing(updates);
    }, "updateExampleViIfMissing");
  }

  // Update sense-level translations for given sense ids
  async updateSenseDefinitions(updates) {
    return this.execute(async () => {
      const list = Array.isArray(updates) ? updates : [updates];
      if (list.length === 0) return { updated: 0, skipped: 0 };

      this.log("info", `Updating ${list.length} sense definitions`);

      await this.repository.init();
      let updated = 0;
      let skipped = 0;

      for (const { _id, definition_vi, definition_vi_short } of list) {
        if (!_id || !ObjectId.isValid(_id)) {
          skipped++;
          continue;
        }

        // Convert to ObjectId if needed
        const senseId =
          _id instanceof ObjectId ? _id : new ObjectId(String(_id));

        // Update main senses
        const mainSenseResult = await this.repository.collection.updateMany(
          { "data.senses._id": senseId },
          {
            $set: {
              "data.$[d].senses.$[s].definition_vi": definition_vi,
              "data.$[d].senses.$[s].definition_vi_short": definition_vi_short,
            },
          },
          {
            arrayFilters: [{ "d.senses._id": senseId }, { "s._id": senseId }],
          }
        );

        // Update idiom senses
        const idiomSenseResult = await this.repository.collection.updateMany(
          { "data.idioms.senses._id": senseId },
          {
            $set: {
              "data.$[d].idioms.$[i].senses.$[s].definition_vi": definition_vi,
              "data.$[d].idioms.$[i].senses.$[s].definition_vi_short":
                definition_vi_short,
            },
          },
          {
            arrayFilters: [
              { "d.idioms.senses._id": senseId },
              { "i.senses._id": senseId },
              { "s._id": senseId },
            ],
          }
        );

        // Update phrasal verb senses
        const pvSenseResult = await this.repository.collection.updateMany(
          { "data.phrasal_verb_senses.senses._id": senseId },
          {
            $set: {
              "data.$[d].phrasal_verb_senses.$[p].senses.$[s].definition_vi":
                definition_vi,
              "data.$[d].phrasal_verb_senses.$[p].senses.$[s].definition_vi_short":
                definition_vi_short,
            },
          },
          {
            arrayFilters: [
              { "d.phrasal_verb_senses.senses._id": senseId },
              { "p.senses._id": senseId },
              { "s._id": senseId },
            ],
          }
        );

        const totalModified =
          mainSenseResult.modifiedCount +
          idiomSenseResult.modifiedCount +
          pvSenseResult.modifiedCount;

        if (totalModified > 0) {
          updated++;
          this.log(
            "info",
            `Updated sense ${_id}: ${totalModified} document(s) modified`
          );
        } else {
          skipped++;
          this.log("warn", `Sense ${_id} not found in any document`);
        }
      }

      return { updated, skipped };
    }, "updateSenseDefinitions");
  }

  // Get definition_vi_short for sense ids
  async getSenseDefinitionShortByIds(ids) {
    return this.execute(async () => {
      if (!Array.isArray(ids) || ids.length === 0) return [];

      // This method needs to be added to WordRepository
      // For now, keep using repository directly
      await this.repository.init();

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
            coll: this.repository.collection.collectionName,
            pipeline: [
              { $unwind: "$data" },
              { $unwind: "$data.idioms" },
              { $unwind: "$data.idioms.senses" },
              { $match: { "data.idioms.senses._id": { $in: ids } } },
              {
                $project: {
                  _id: "$data.idioms.senses._id",
                  definition_vi_short:
                    "$data.idioms.senses.definition_vi_short",
                  definition_vi: "$data.idioms.senses.definition_vi",
                },
              },
            ],
          },
        },
      ];

      const results = await this.repository.aggregate(pipeline, {
        allowDiskUse: true,
      });

      return results.map((item) => new SenseDefinitionDTO(item).transform());
    }, "getSenseDefinitionShortByIds");
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
    return this.execute(async () => {
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

      // Use repository for filtered pagination
      await this.repository.init();
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

      const cursor = this.repository.collection
        .find(query, { projection })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(per);

      const docs = await cursor.toArray();
      const total = await this.repository.collection.countDocuments(query);

      return {
        total,
        page: p,
        per_page: per,
        data: docs,
      };
    }, "getAll");
  }

  // Specialized, lightweight search for UI search/autocomplete
  // Returns only array of _id strings and pagination meta. Does NOT modify getAll()
  async getAllForSearch({ page = 1, per_page = 50, q = "" }) {
    return this.execute(async () => {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, parseInt(per_page, 10) || 50);

      // helper to escape user input for regex
      const escapeForRegex = (s) =>
        String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

      // prefix-only anchored, case-insensitive
      const query = {
        _id: { $regex: `^${escapeForRegex(q)}`, $options: "i" },
      };

      await this.repository.init();
      const skip = (p - 1) * per;

      // Only project _id to minimize IO
      const cursor = this.repository.collection
        .find(query, { projection: { _id: 1 } })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(per);

      const rows = await cursor.toArray();
      const total = await this.repository.collection.countDocuments(query);

      // map ObjectId or string _id to string
      const ids = rows.map((r) => (r && r._id ? String(r._id) : ""));

      return { total, page: p, per_page: per, data: ids };
    }, "getAllForSearch");
  }
}

export default WordService;
