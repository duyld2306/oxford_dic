import WordModel from "../models/Word.js";
import { crawlWordDirect } from "../crawl.js";

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
      const crawledData = await crawlWordDirect(normalizedWord, 5);

      if (!crawledData || crawledData.length === 0) {
        return {
          success: false,
          error: "Word not found",
          data: null,
        };
      }

      // Save to database for future use
      await this.wordModel.upsert(normalizedWord, crawledData);

      return {
        success: true,
        data: {
          word: normalizedWord,
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

  // Search words by text (full text search)
  async searchByText(searchText, limit = 20) {
    try {
      const searchQuery = String(searchText || "").trim();
      if (!searchQuery) {
        return {
          success: false,
          error: "Search text is required",
          data: [],
        };
      }

      const results = await this.wordModel.searchByText(searchQuery, limit);

      return {
        success: true,
        data: {
          query: searchQuery,
          count: results.length,
          words: results,
        },
      };
    } catch (error) {
      console.error("WordService.searchByText error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get word statistics
  async getStats() {
    try {
      const stats = await this.wordModel.getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("WordService.getStats error:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
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
