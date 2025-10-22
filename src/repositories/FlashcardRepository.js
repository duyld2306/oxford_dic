/**
 * Flashcard Repository
 * Handles all database operations for Flashcard entity
 */

import { BaseRepository } from "./BaseRepository.js";
import { FlashcardEntity } from "../entities/Flashcard.entity.js";
import { COLLECTIONS } from "../constants/index.js";
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
      throw new ValidationError(
        "Flashcard validation failed",
        validation.errors
      );
    }

    return await this.insertOne(entity.toDocument());
  }
}
export default FlashcardRepository;
