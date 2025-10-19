import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { WordRepository } from "../repositories/WordRepository.js";
import { CategoryDTO, CategoryListDTO } from "../dtos/CategoryDTO.js";

/**
 * CategoryService
 * Handles category management logic
 */
export class CategoryService extends BaseService {
  constructor(
    categoryRepository = null,
    wordRepository = null,
    dependencies = {}
  ) {
    super(categoryRepository || new CategoryRepository(), dependencies);
    this.wordRepository = wordRepository || new WordRepository();
  }

  /**
   * Get all categories for user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async getCategories(userId) {
    return this.execute(async () => {
      const categories = await this.repository.find({
        user_id: this.repository.toObjectId(userId),
      });

      return categories.map((cat) => new CategoryListDTO(cat).transform());
    }, "getCategories");
  }

  /**
   * Get category IDs containing a word
   * @param {string} wordId - Word ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async getCategoriesByWordId(wordId, userId) {
    return this.execute(async () => {
      await this.repository.init();
      const categories = await this.repository.collection
        .find({
          user_id: this.repository.toObjectId(userId),
          words: String(wordId).trim(),
        })
        .project({ _id: 1 })
        .toArray();

      return categories.map((cat) => cat._id.toString());
    }, "getCategoriesByWordId");
  }

  /**
   * Create new category
   * @param {string|ObjectId} userId - User ID
   * @param {Object} data - Category data
   * @returns {Promise<Object>}
   */
  async createCategory(userId, data) {
    return this.execute(async () => {
      const { name } = data;

      // Check if user already has 20 categories
      const count = await this.repository.count({
        user_id: this.repository.toObjectId(userId),
      });

      if (count >= 20) {
        const error = new Error("Category limit reached (maximum 20)");
        error.status = 400;
        throw error;
      }

      const category = await this.repository.insertOne({
        user_id: this.repository.toObjectId(userId),
        name: name.trim(),
        words: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.log("info", `Category created: ${name}`);

      return new CategoryDTO(category).transform();
    }, "createCategory");
  }

  /**
   * Update category
   * @param {string|ObjectId} categoryId - Category ID
   * @param {string|ObjectId} userId - User ID
   * @param {Object} updates - Category updates
   * @returns {Promise<Object>}
   */
  async updateCategory(categoryId, userId, updates) {
    return this.execute(async () => {
      const { name } = updates;

      // Check if category exists and belongs to user
      const category = await this.repository.findOne({
        _id: this.repository.toObjectId(categoryId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
      }

      await this.repository.updateById(categoryId, {
        $set: {
          name: name.trim(),
          updatedAt: new Date(),
        },
      });

      this.log("info", `Category updated: ${name}`);

      // Return updated category
      const updatedCategory = await this.repository.findById(categoryId);
      return new CategoryDTO(updatedCategory).transform();
    }, "updateCategory");
  }

  /**
   * Delete category
   * @param {string|ObjectId} categoryId - Category ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteCategory(categoryId, userId) {
    return this.execute(async () => {
      // Check if category exists and belongs to user
      const category = await this.repository.findOne({
        _id: this.repository.toObjectId(categoryId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
      }

      await this.repository.deleteById(categoryId);

      this.log("info", `Category deleted: ${category.name}`);

      return { message: "Category deleted successfully" };
    }, "deleteCategory");
  }

  /**
   * Add words to category
   * @param {string|ObjectId} categoryId - Category ID
   * @param {string|ObjectId} userId - User ID
   * @param {Array<string>} wordIds - Word IDs to add
   * @returns {Promise<Object>}
   */
  async addWords(categoryId, userId, wordIds) {
    return this.execute(async () => {
      if (!Array.isArray(wordIds) || wordIds.length === 0) {
        const error = new Error("wordIds must be a non-empty array");
        error.status = 400;
        throw error;
      }

      // Check if category exists and belongs to user
      const category = await this.repository.findOne({
        _id: this.repository.toObjectId(categoryId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
      }

      // Verify all words exist
      await this.wordRepository.init();
      const existingWords = await this.wordRepository.collection
        .find({ _id: { $in: wordIds } })
        .project({ _id: 1 })
        .toArray();

      if (existingWords.length !== wordIds.length) {
        const error = new Error("One or more words not found");
        error.status = 404;
        throw error;
      }

      // Add words to category (prevent duplicates)
      const currentWords = category.words || [];
      const newWords = wordIds.filter((id) => !currentWords.includes(id));

      if (newWords.length === 0) {
        return { message: "All words already in category" };
      }

      await this.repository.updateById(categoryId, {
        $addToSet: { words: { $each: newWords } },
        $set: { updatedAt: new Date() },
      });

      this.log(
        "info",
        `Added ${newWords.length} words to category: ${category.name}`
      );

      // Return updated category
      const updatedCategory = await this.repository.findById(categoryId);
      return new CategoryDTO(updatedCategory).transform();
    }, "addWords");
  }

  /**
   * Remove words from category
   * @param {string|ObjectId} categoryId - Category ID
   * @param {string|ObjectId} userId - User ID
   * @param {Array<string>} word_ids - Word IDs to remove
   * @returns {Promise<Object>}
   */
  async removeWords(categoryId, userId, word_ids) {
    return this.execute(async () => {
      // Check if category exists and belongs to user
      const category = await this.repository.findOne({
        _id: this.repository.toObjectId(categoryId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!category) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
      }

      // Remove words from category
      await this.repository.updateById(categoryId, {
        $pull: { words: { $in: word_ids } },
        $set: { updatedAt: new Date() },
      });

      this.log(
        "info",
        `Removed ${word_ids.length} words from category: ${category.name}`
      );

      return { message: `${word_ids.length} words removed from category` };
    }, "removeWords");
  }
}

export default CategoryService;
