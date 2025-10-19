/**
 * Flashcard Repository
 * Handles all database operations for Flashcard entity
 */

import { BaseRepository } from "./BaseRepository.js";
import { FlashcardEntity, FlashcardStatus } from "../entities/Flashcard.entity.js";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants/index.js";
import { ValidationError } from "../errors/AppError.js";

export class FlashcardRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.FLASHCARDS);
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ flashcard_group_id: 1 });
      await this.collection.createIndex({ flashcard_group_id: 1, word_id: 1 });
      await this.collection.createIndex({ word_id: 1 });
      console.log("✅ Flashcard indexes created successfully");
    } catch (error) {
      console.error("⚠️ Flashcard index creation failed:", error.message);
    }
  }

  /**
   * Create a new flashcard
   */
  async create(data) {
    await this.init();

    // Create entity
    const entity = new FlashcardEntity(data);

    // Validate
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(ERROR_MESSAGES.VALIDATION_ERROR, validation.errors);
    }

    return await this.insertOne(entity.toDocument());
  }

  /**
   * Find flashcard by group and word
   */
  async findByGroupAndWord(flashcardGroupId, wordId) {
    await this.init();
    const groupObjectId = this.toObjectId(flashcardGroupId);

    return await this.findOne({
      flashcard_group_id: groupObjectId,
      word_id: wordId,
    });
  }

  /**
   * Find all flashcards in a group
   */
  async findByGroupId(flashcardGroupId) {
    await this.init();
    const groupObjectId = this.toObjectId(flashcardGroupId);

    return await this.find({ flashcard_group_id: groupObjectId });
  }

  /**
   * Update flashcard status
   */
  async updateStatus(id, status) {
    await this.init();
    const objectId = this.toObjectId(id);

    // Validate status
    if (!Object.values(FlashcardStatus).includes(status)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_FLASHCARD_STATUS);
    }

    return await this.updateById(objectId, {
      $set: { status },
    });
  }

  /**
   * Update flashcard progress
   */
  async updateProgress(id, progressData) {
    await this.init();
    const objectId = this.toObjectId(id);

    const updateFields = {};
    if (progressData.times_shown !== undefined) {
      updateFields["progress.times_shown"] = progressData.times_shown;
    }
    if (progressData.times_correct !== undefined) {
      updateFields["progress.times_correct"] = progressData.times_correct;
    }
    if (progressData.last_reviewed_at !== undefined) {
      updateFields["progress.last_reviewed_at"] = progressData.last_reviewed_at;
    }

    return await this.updateById(objectId, {
      $set: updateFields,
    });
  }

  /**
   * Increment times shown
   */
  async incrementTimesShown(id) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateById(objectId, {
      $inc: { "progress.times_shown": 1 },
      $set: { "progress.last_reviewed_at": new Date() },
    });
  }

  /**
   * Increment times correct
   */
  async incrementTimesCorrect(id) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateById(objectId, {
      $inc: { "progress.times_correct": 1 },
    });
  }

  /**
   * Delete flashcard
   */
  async deleteFlashcard(flashcardGroupId, wordId) {
    await this.init();
    const groupObjectId = this.toObjectId(flashcardGroupId);

    return await this.deleteOne({
      flashcard_group_id: groupObjectId,
      word_id: wordId,
    });
  }

  /**
   * Delete all flashcards in a group
   */
  async deleteByGroupId(flashcardGroupId) {
    await this.init();
    const groupObjectId = this.toObjectId(flashcardGroupId);

    return await this.deleteMany({
      flashcard_group_id: groupObjectId,
    });
  }

  /**
   * Get statistics for a flashcard group
   */
  async getGroupStats(flashcardGroupId) {
    await this.init();
    const groupObjectId = this.toObjectId(flashcardGroupId);

    const pipeline = [
      {
        $match: { flashcard_group_id: groupObjectId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.aggregate(pipeline);

    const stats = {
      total: 0,
      new: 0,
      learning: 0,
      mastered: 0,
    };

    results.forEach((result) => {
      const status = result._id;
      const count = result.count;
      stats.total += count;
      if (status === FlashcardStatus.NEW) stats.new = count;
      if (status === FlashcardStatus.LEARNING) stats.learning = count;
      if (status === FlashcardStatus.MASTERED) stats.mastered = count;
    });

    return stats;
  }
}

export default FlashcardRepository;

