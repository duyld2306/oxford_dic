/**
 * FlashcardGroup Repository
 * Handles all database operations for FlashcardGroup entity
 */

import { BaseRepository } from "./BaseRepository.js";
import { FlashcardGroupEntity } from "../entities/FlashcardGroup.entity.js";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants/index.js";
import { ValidationError } from "../errors/AppError.js";

export class FlashcardGroupRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.FLASHCARD_GROUPS);
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, source_id: 1 });
      await this.collection.createIndex({ user_id: 1, source_type: 1 });
      console.log("✅ FlashcardGroup indexes created successfully");
    } catch (error) {
      console.error("⚠️ FlashcardGroup index creation failed:", error.message);
    }
  }

  /**
   * Create a new flashcard group
   */
  async create(data) {
    await this.init();

    // Create entity
    const entity = new FlashcardGroupEntity(data);

    // Validate
    const validation = entity.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        ERROR_MESSAGES.VALIDATION_ERROR,
        validation.errors
      );
    }

    return await this.insertOne(entity.toDocument());
  }

  /**
   * Find by user ID
   */
  async findByUserId(userId) {
    await this.init();
    const userObjectId = this.toObjectId(userId);

    return await this.find({ user_id: userObjectId });
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
   * Find by source (for sync operations)
   */
  async findBySource(sourceType, sourceId, userId) {
    await this.init();
    const sourceObjectId = this.toObjectId(sourceId);
    const userObjectId = this.toObjectId(userId);

    return await this.findOne({
      user_id: userObjectId,
      source_type: sourceType,
      source_id: sourceObjectId,
    });
  }

  /**
   * Update flashcard group
   */
  async updateFlashcardGroup(id, userId, updates) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.updateOne(
      { _id: objectId, user_id: userObjectId },
      { $set: updates }
    );
  }

  /**
   * Add flashcard to group
   */
  async addFlashcard(id, userId, flashcardId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);
    const flashcardObjectId = this.toObjectId(flashcardId);

    return await this.updateOne(
      { _id: objectId, user_id: userObjectId },
      {
        $addToSet: { flashcards: flashcardObjectId },
      }
    );
  }

  /**
   * Remove flashcard from group
   */
  async removeFlashcard(id, userId, flashcardId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);
    const flashcardObjectId = this.toObjectId(flashcardId);

    return await this.updateOne(
      { _id: objectId, user_id: userObjectId },
      {
        $pull: { flashcards: flashcardObjectId },
      }
    );
  }

  /**
   * Delete flashcard group
   */
  async deleteFlashcardGroup(id, userId) {
    await this.init();
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    return await this.deleteOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }
}

export default FlashcardGroupRepository;
