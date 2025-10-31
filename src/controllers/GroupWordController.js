import { BaseController } from "./BaseController.js";
import GroupWordService from "../services/GroupWordService.js";
import WordService from "../services/WordService.js";
import CategoryService from "../services/CategoryService.js";

class GroupWordController extends BaseController {
  constructor(
    groupWordService = null,
    wordService = null,
    categoryService = null
  ) {
    super();
    this.groupWordService = groupWordService || new GroupWordService();
    this.wordService = wordService || new WordService();
    this.categoryService = categoryService || new CategoryService();
  }

  // GET /api/group-words - Get all group_words
  getGroupWords = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const groupWords = await this.groupWordService.getGroupWords(userId);
    return this.sendSuccess(res, groupWords);
  });

  // POST /api/group-words - Create new group_word
  createGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { name } = this.getBody(req);

    try {
      const groupWord = await this.groupWordService.createGroupWord(userId, {
        name,
      });
      return this.sendCreated(res, groupWord);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // PUT /api/group-words/:id - Update group_word
  updateGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const { name } = this.getBody(req);

    try {
      const result = await this.groupWordService.updateGroupWord(id, userId, {
        name,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // DELETE /api/group-words/:id - Delete group_word
  deleteGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);

    try {
      const result = await this.groupWordService.deleteGroupWord(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/group-words/favorites - Get favorites
  getFavorites = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id, q, symbol, parts_of_speech } = this.getQuery(req);

    // Get all group words for user (with full data including words array)
    const groupWords = await this.groupWordService.repository.find({
      user_id: this.groupWordService.repository.toObjectId(userId),
    });

    // Filter by group_word_id if provided
    let targetGroupWords = groupWords;
    if (group_word_id) {
      targetGroupWords = groupWords.filter(
        (gw) => gw._id.toString() === group_word_id
      );
    }

    // Collect all word IDs from all group words
    const allWordIds = [];
    targetGroupWords.forEach((gw) => {
      if (gw.words && Array.isArray(gw.words)) {
        allWordIds.push(...gw.words);
      }
    });

    // Remove duplicates
    const uniqueWordIds = [...new Set(allWordIds)];

    if (uniqueWordIds.length === 0) {
      return this.sendSuccess(res, [], { total: 0, page: 1, per_page: 100 });
    }

    // Build Mongo filter
    const query = {
      _id: { $in: uniqueWordIds },
    };

    // Escape regex helper
    const escapeForRegex = (s) =>
      String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 🔍 Search filter applied to _id (định dạng string)
    if (q) {
      query._id = {
        $in: uniqueWordIds,
        $regex: escapeForRegex(q),
        $options: "i",
      };
    }

    // 🧩 parts_of_speech filter
    if (parts_of_speech && String(parts_of_speech).trim() !== "") {
      try {
        const parsed = JSON.parse(parts_of_speech);
        if (Array.isArray(parsed)) {
          query.parts_of_speech = parsed;
        }
      } catch (e) {}
    }

    // 🔠 symbol filter
    const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
    if (symbol === "other") {
      query.symbol = { $nin: SYMBOL_ORDER };
    } else if (SYMBOL_ORDER.includes(symbol)) {
      query.symbol = symbol;
    }

    // ✅ Lấy dữ liệu trực tiếp từ DB theo uniqueWordIds + filters
    const words = await this.wordService.repository.find(query);

    const wordsWithCategories = await Promise.all(
      words.map(async (word) => {
        const categoryIds = await this.categoryService.getCategoriesByWordId(
          word._id,
          userId
        );

        return {
          ...word,
          category_ids: categoryIds || [],
        };
      })
    );

    return this.sendSuccess(res, wordsWithCategories);
  });

  // POST /api/group-words/favorites - Add word to group
  addFavorite = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id, word_id } = this.getBody(req);

    try {
      const result = await this.groupWordService.addWord(
        group_word_id,
        userId,
        word_id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // DELETE /api/group-words/favorites - Remove word from group
  removeFavorite = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id, word_id } = this.getBody(req);

    try {
      const result = await this.groupWordService.removeWord(
        group_word_id,
        userId,
        word_id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/group-words/:word_id - Get group word IDs containing this word
  getGroupWordsByWordId = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { word_id } = this.getParams(req);

    const groupIds = await this.groupWordService.getGroupWordsByWordId(
      word_id,
      userId
    );

    return this.sendSuccess(res, groupIds);
  });
}

export default GroupWordController;
