import { BaseController } from "./BaseController.js";
import CategoryService from "../services/CategoryService.js";
import WordService from "../services/WordService.js";

class CategoryController extends BaseController {
  constructor(categoryService = null, wordService = null) {
    super();
    this.categoryService = categoryService || new CategoryService();
    this.wordService = wordService || new WordService();
  }

  // GET /api/categories - Get all categories
  getCategories = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const categories = await this.categoryService.getCategories(userId);
    return this.sendSuccess(res, categories);
  });

  // POST /api/categories - Create new category
  createCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { name } = this.getBody(req);

    try {
      const category = await this.categoryService.createCategory(userId, {
        name,
      });
      return this.sendCreated(res, category);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // PUT /api/categories/:id - Update category
  updateCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const { name } = this.getBody(req);

    try {
      const result = await this.categoryService.updateCategory(id, userId, {
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

  // DELETE /api/categories/:id - Delete category
  deleteCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);

    try {
      const result = await this.categoryService.deleteCategory(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/categories/:id/words - Add words to category
  addWordsToCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const { word_ids } = this.getBody(req);

    try {
      const result = await this.categoryService.addWords(id, userId, word_ids);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/categories/:id/words - Get words from category
  getWordsFromCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const {
      q,
      symbol,
      parts_of_speech,
      page = 1,
      per_page = 100,
    } = this.getQuery(req);

    // Get category to verify ownership and get word list (with full data)
    const category = await this.categoryService.repository.findOne({
      _id: this.categoryService.repository.toObjectId(id),
      user_id: this.categoryService.repository.toObjectId(userId),
    });

    if (!category) {
      return this.sendError(res, "Category not found", 404);
    }

    const wordIds = category.words || [];
    if (wordIds.length === 0) {
      return this.sendSuccess(res, [], { total: 0, page: 1, per_page: 100 });
    }

    // Build Mongo filter
    const query = {
      _id: { $in: wordIds },
    };

    // Escape regex helper
    const escapeForRegex = (s) =>
      String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 🔍 Search filter applied to _id (định dạng string)
    if (q) {
      query._id = { $regex: escapeForRegex(q), $options: "i" };
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

    return this.sendSuccess(res, words);
  });

  // DELETE /api/categories/:id/words - Remove words from category
  removeWordsFromCategory = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const { word_ids } = this.getBody(req);

    try {
      const result = await this.categoryService.removeWords(
        id,
        userId,
        word_ids
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/categories/:word_id - Get category IDs containing this word
  getCategoriesByWordId = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { word_id } = this.getParams(req);

    const categoryIds = await this.categoryService.getCategoriesByWordId(
      word_id,
      userId
    );

    return this.sendSuccess(res, categoryIds);
  });
}

export default CategoryController;
