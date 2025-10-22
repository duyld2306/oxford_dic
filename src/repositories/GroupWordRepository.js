/**
 * GroupWord Repository
 * Handles all database operations for GroupWord entity
 */

import { BaseRepository } from "./BaseRepository.js";
import { GroupWordEntity } from "../entities/GroupWord.entity.js";
import { COLLECTIONS, LIMITS } from "../constants/index.js";
import { ValidationError, BusinessLogicError } from "../errors/AppError.js";

export class GroupWordRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.GROUP_WORDS);
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, name: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ GroupWord indexes created successfully");
    } catch (error) {
      console.error("⚠️ GroupWord index creation failed:", error.message);
    }
  }

  /**
   * Create a new group word
   */
  async create(userId, name) {
    await this.init();

    const userObjectId = this.toObjectId(userId);

    // Check limit
    const count = await this.countByUserId(userObjectId);
    if (count >= LIMITS.MAX_GROUP_WORDS_PER_USER) {
      throw new BusinessLogicError("Cannot create more than 20 group words");
    }

    // Create entity
    const entity = new GroupWordEntity({
      name,
      user_id: userObjectId,
      words: [],
    });

    // Validate
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        "GroupWord validation failed",
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
   * Find all group words by user ID
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
   * Count group words by user ID
   */
  async countByUserId(userId) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    return await this.count({ user_id: userObjectId });
  }

  /**
   * Update group word
   */
  async updateGroupWord(id, userId, updateData) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: objectId, user_id: userObjectId },
      { $set: updateData }
    );
  }

  /**
   * Delete group word
   */
  async deleteGroupWord(id, userId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.deleteOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }

  /**
   * Add word to group
   */
  async addWord(groupWordId, wordId, userId) {
    await this.init();
    const groupObjectId = this.toObjectId(groupWordId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $addToSet: { words: wordId },
      }
    );
  }

  /**
   * Remove word from group
   */
  async removeWord(groupWordId, wordId, userId) {
    await this.init();
    const groupObjectId = this.toObjectId(groupWordId);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $pull: { words: wordId },
      }
    );
  }

  /**
   * Get words in group with pagination
   */
  async getWordsInGroup(groupWordId, userId, page = 1, limit = 100) {
    await this.init();
    const groupObjectId = this.toObjectId(groupWordId);
    const userObjectId = this.toObjectId(userId);

    const group = await this.findOne(
      { _id: groupObjectId, user_id: userObjectId },
      { projection: { words: 1 } }
    );

    if (!group || !group.words) {
      return { words: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const total = group.words.length;
    const words = group.words.slice(skip, skip + limit);

    return { words, total };
  }

  /**
   * Get all words from all groups of a user (flattened, with pagination)
   */
  async getAllWordsFromUserGroups(userId, page = 1, limit = 100) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    // Get all groups for user
    const groups = await this.find(
      { user_id: userObjectId },
      { projection: { words: 1 } }
    );

    // Flatten all words from all groups and remove duplicates
    const allWordsSet = new Set();
    groups.forEach((group) => {
      if (group.words && Array.isArray(group.words)) {
        group.words.forEach((wordId) => allWordsSet.add(wordId));
      }
    });

    const allWords = Array.from(allWordsSet);
    const total = allWords.length;

    // Apply pagination
    const skip = (page - 1) * limit;
    const words = allWords.slice(skip, skip + limit);

    return { words, total };
  }
}

export default GroupWordRepository;
