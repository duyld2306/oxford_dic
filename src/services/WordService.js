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
      if (!normalizedWord) throw new Error("Word is required");

      // 1) Try DB first
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

      // 2) Crawl when missing
      const crawled = await crawlWordDirect(normalizedWord, 5);
      if (
        !crawled ||
        !Array.isArray(crawled.words) ||
        crawled.words.length === 0
      ) {
        return { success: false, error: "Word not found", data: null };
      }

      const words = crawled.words;
      const variants = Array.isArray(crawled.variants) ? crawled.variants : [];

      const first = words[0] || null;
      const canonicalKey =
        first && first.word
          ? String(first.word).trim().replace(/\s+/g, " ").toLowerCase()
          : normalizedWord;

      // Persist as single document: top-level relate_words + data array
      await this.wordModel.upsert(canonicalKey, {
        data: words,
        relate_words: variants,
      });

      return {
        success: true,
        data: {
          word: canonicalKey,
          quantity: words.length,
          data: words,
          source: "crawled",
        },
      };
    } catch (error) {
      console.error("WordService.getWord error:", error);
      return { success: false, error: error.message, data: null };
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
