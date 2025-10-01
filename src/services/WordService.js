import WordModel from "../models/Word.js";
import { crawlWordDirect } from "../utils/crawl.js";
import {
  normalizeKey,
  buildVariantsFromPages,
  buildTopSymbolFromPages,
} from "../utils/variants.js";

class WordService {
  constructor() {
    this.wordModel = new WordModel();
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
          success: true,
          data: {
            word: normalizedWord,
            quantity: Array.isArray(dbResult.data) ? dbResult.data.length : 0,
            data: dbResult.data || [],
            source: "database",
          },
        };
      }

      // If not found in database, try crawling
      const crawledPages = await crawlWordDirect(normalizedWord, 5);

      if (!crawledPages || crawledPages.length === 0) {
        return {
          success: false,
          error: "Word not found",
          data: null,
        };
      }

      // Build top-level variants array from crawled pages (preserve original casing)
      const finalVariants = buildVariantsFromPages(crawledPages);

      // canonical key: first crawled page's found word normalized
      const canonicalRaw =
        (finalVariants && finalVariants[0]) || normalizedWord;
      const canonicalKey = normalizeKey(canonicalRaw);

      // Compute top-level symbol from page-level symbols collected during crawl
      const topSymbol = buildTopSymbolFromPages(crawledPages);

      // Save to database for future use with shape { data: [...], variants: [...], symbol }
      await this.wordModel.upsert(canonicalKey, {
        data: crawledPages,
        variants: finalVariants,
        symbol: topSymbol,
      });

      return {
        success: true,
        data: {
          word: canonicalKey,
          quantity: crawledPages.length,
          data: crawledPages,
          variants: finalVariants,
          source: "crawled",
        },
      };
    } catch (error) {
      console.error("WordService.getWord error:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Search words by prefix
  async searchByPrefix(prefix, limit = 20) {
    try {
      const searchPrefix = String(prefix || "").trim();
      if (!searchPrefix) {
        return {
          success: false,
          error: "Search prefix is required",
          data: [],
        };
      }

      const results = await this.wordModel.searchByPrefix(searchPrefix, limit);

      return {
        success: true,
        data: {
          prefix: searchPrefix,
          count: results.length,
          words: results,
        },
      };
    } catch (error) {
      console.error("WordService.searchByPrefix error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
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
  async getAll(page = 1, per_page = 100) {
    try {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, parseInt(per_page, 10) || 100);
      const result = await this.wordModel.paginate(p, per);
      return {
        success: true,
        data: {
          total: result.total,
          page: p,
          per_page: per,
          data: result.docs,
        },
      };
    } catch (error) {
      console.error('WordService.getAll error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default WordService;
