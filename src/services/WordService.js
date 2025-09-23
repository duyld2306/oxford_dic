import WordModel from "../models/Word.js";
import { crawlWordDirect } from "../utils/crawl.js";

class WordService {
  constructor() {
    this.wordModel = new WordModel();
  }

  // Get word by exact match with caching
  async getWord(word) {
    try {
      const normalizedWord = String(word || "")
        .trim()
        .toLowerCase();
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
      const crawledData = await crawlWordDirect(normalizedWord, 5);

      if (!crawledData || crawledData.length === 0) {
        return {
          success: false,
          error: "Word not found",
          data: null,
        };
      }

      // Save to database as a single document keyed by the first crawled page's normalized word
      const first =
        Array.isArray(crawledData) && crawledData.length > 0
          ? crawledData[0]
          : null;
      const canonicalKey =
        first && first.word
          ? String(first.word).trim().replace(/\s+/g, " ").toLowerCase()
          : normalizedWord;
      await this.wordModel.upsert(canonicalKey, crawledData);

      return {
        success: true,
        data: {
          word: canonicalKey,
          quantity: crawledData.length,
          data: crawledData,
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

  // Validate word input
  validateWord(word) {
    if (!word || typeof word !== "string") return null;
    const cleaned = word.trim().toLowerCase();
    if (!cleaned.match(/^[a-z\s-]+$/i)) return null;
    return cleaned;
  }
}

export default WordService;
