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

    // Build query for WordService.getAll
    let queryParams = {
      page,
      per_page,
      q: "",
      symbol: "",
      parts_of_speech: "",
    };

    // Apply filters
    if (q) queryParams.q = q;
    if (symbol) queryParams.symbol = symbol;
    if (parts_of_speech) queryParams.parts_of_speech = parts_of_speech;

    // Get words using WordService
    const result = await this.wordService.getAll(queryParams);

    // Filter only words that are in wordIds
    const filteredWords = result.data.filter((word) =>
      wordIds.includes(word._id)
    );

    return this.sendSuccess(res, filteredWords, {
      total: filteredWords.length,
      page: parseInt(page),
      per_page: parseInt(per_page),
    });
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
