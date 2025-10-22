/**
 * Category Repository
 * Handles all database operations for Category entity
 */

import { BaseRepository } from "./BaseRepository.js";
import { CategoryEntity } from "../entities/Category.entity.js";
import { COLLECTIONS, LIMITS } from "../constants/index.js";
import { ValidationError, BusinessLogicError } from "../errors/AppError.js";

export class CategoryRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.CATEGORIES);
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, name: 1 });
      await this.collection.createIndex({ words: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ Category indexes created successfully");
    } catch (error) {
      console.error("⚠️ Category index creation failed:", error.message);
    }
  }

  /**
   * Create a new category
   */
  async create(userId, name) {
    await this.init();

    const userObjectId = this.toObjectId(userId);

    // Check limit
    const count = await this.countByUserId(userObjectId);
    if (count >= LIMITS.MAX_CATEGORIES_PER_USER) {
      throw new BusinessLogicError("Cannot create more than 20 categories");
    }

    // Create entity
    const entity = new CategoryEntity({
      name,
      user_id: userObjectId,
      words: [],
    });

    // Validate
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        "Category validation failed",
        validation.errors
      );
    }

    return await this.insertOne(entity.toDocument());
  }

  /**
   * Find by ID and user ID (ownership check)
   */
  async findByIdAndUserId(id, userId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.findOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }

  /**
   * Find all categories by user ID
   */
  async findByUserId(userId) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    return await this.find(
      { user_id: userObjectId },
      { projection: { _id: 1, name: 1 } }
    );
  }

  /**
   * Count categories by user ID
   */
  async countByUserId(userId) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    return await this.count({ user_id: userObjectId });
  }

  /**
   * Update category
   */
  async updateCategory(id, userId, updateData) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: objectId, user_id: userObjectId },
      { $set: updateData }
    );
  }

  /**
   * Delete category
   */
  async deleteCategory(id, userId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.deleteOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }

  /**
   * Add word to category
   */
  async addWord(categoryId, wordId, userId) {
    await this.init();
    const categoryObjectId = this.toObjectId(categoryId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $addToSet: { words: wordId },
      }
    );
  }

  /**
   * Remove word from category
   */
  async removeWord(categoryId, wordId, userId) {
    await this.init();
    const categoryObjectId = this.toObjectId(categoryId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $pull: { words: wordId },
      }
    );
  }

  /**
   * Add multiple words to a category (batch operation)
   */
  async addWords(categoryId, wordIds, userId) {
    await this.init();
    const categoryObjectId = this.toObjectId(categoryId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $addToSet: { words: { $each: wordIds } },
      }
    );
  }

  /**
   * Remove multiple words from a category (batch operation)
   */
  async removeWords(categoryId, wordIds, userId) {
    await this.init();
    const categoryObjectId = this.toObjectId(categoryId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $pull: { words: { $in: wordIds } },
      }
    );
  }

  /**
   * Get all words from a category
   */
  async getWordsInCategory(categoryId, userId) {
    await this.init();
    const categoryObjectId = this.toObjectId(categoryId);
    const userObjectId = this.toObjectId(userId);

    const category = await this.findOne(
      { _id: categoryObjectId, user_id: userObjectId },
      { projection: { words: 1 } }
    );

    if (!category) {
      return null;
    }

    return category.words || [];
  }

  /**
   * Get categories by word IDs
   */
  async getCategoriesByWordIds(wordIds, userId) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    const categories = await this.find(
      {
        user_id: userObjectId,
        words: { $in: wordIds },
      },
      { projection: { _id: 1, words: 1 } }
    );

    // Create a map of word_id -> [category_ids]
    const wordCategoryMap = {};

    categories.forEach((category) => {
      category.words.forEach((wordId) => {
        if (!wordCategoryMap[wordId]) {
          wordCategoryMap[wordId] = [];
        }
        wordCategoryMap[wordId].push(category._id);
      });
    });

    return wordCategoryMap;
  }
}

export default CategoryRepository;
