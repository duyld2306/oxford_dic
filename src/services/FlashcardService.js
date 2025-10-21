import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { FlashcardRepository } from "../repositories/FlashcardRepository.js";
import { FlashcardGroupRepository } from "../repositories/FlashcardGroupRepository.js";
import { WordRepository } from "../repositories/WordRepository.js";
import { FlashcardDTO } from "../dtos/FlashcardDTO.js";

/**
 * FlashcardService
 * Handles flashcard (individual card) management logic
 */
export class FlashcardService extends BaseService {
  constructor(
    flashcardRepository = null,
    flashcardGroupRepository = null,
    wordRepository = null,
    dependencies = {}
  ) {
    super(flashcardRepository || new FlashcardRepository(), dependencies);
    this.flashcardGroupRepository =
      flashcardGroupRepository || new FlashcardGroupRepository();
    this.wordRepository = wordRepository || new WordRepository();
  }

  /**
   * Add flashcard(s)
   * @param {string|ObjectId} userId - User ID
   * @param {Object} data - Flashcard data (word_ids)
   * @returns {Promise<Object>}
   */
  async addFlashcard(userId, data) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardGroupRepository.init();
      await this.wordRepository.init();

      const { flashcard_group_id, word_ids } = data;

      // Check if group exists and belongs to user
      const group = await this.flashcardGroupRepository.findOne({
        _id: this.flashcardGroupRepository.toObjectId(flashcard_group_id),
        user_id: this.flashcardGroupRepository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      // Verify all words exist
      const existingWords = await this.wordRepository.collection
        .find({ _id: { $in: word_ids } })
        .project({ _id: 1 })
        .toArray();

      if (existingWords.length !== word_ids.length) {
        const error = new Error("One or more words not found");
        error.status = 404;
        throw error;
      }

      // Get existing flashcards for this group
      const existingFlashcards = await this.repository.collection
        .find({
          flashcard_group_id:
            this.flashcardGroupRepository.toObjectId(flashcard_group_id),
          word_id: { $in: word_ids },
        })
        .project({ word_id: 1 })
        .toArray();

      const existingWordIds = existingFlashcards.map((f) => f.word_id);
      const newWordIds = word_ids.filter((id) => !existingWordIds.includes(id));

      if (newWordIds.length === 0) {
        return { message: "All words already in flashcard group" };
      }

      // Bulk insert new flashcards
      const flashcardsToInsert = newWordIds.map((word_id) => ({
        flashcard_group_id:
          this.flashcardGroupRepository.toObjectId(flashcard_group_id),
        word_id: word_id,
        status: "new",
        progress: {
          times_shown: 0,
          times_correct: 0,
          last_reviewed_at: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await this.repository.collection.insertMany(
        flashcardsToInsert
      );

      // Update flashcard_group.flashcards array with new flashcard IDs
      const newFlashcardIds = Object.values(result.insertedIds);
      await this.flashcardGroupRepository.collection.updateOne(
        {
          _id: this.flashcardGroupRepository.toObjectId(flashcard_group_id),
          user_id: this.flashcardGroupRepository.toObjectId(userId),
        },
        {
          $addToSet: { flashcards: { $each: newFlashcardIds } },
          $set: { updatedAt: new Date() },
        }
      );

      this.log(
        "info",
        `Added ${newWordIds.length} flashcards to group: ${
          group.name || flashcard_group_id
        }`
      );

      return {
        message: `${newWordIds.length} flashcards added successfully`,
        added: newWordIds.length,
        skipped: existingWordIds.length,
      };
    }, "addFlashcard");
  }

  /**
   * Remove flashcard
   * @param {string|ObjectId} flashcardId - Flashcard ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async removeFlashcard(flashcardId, userId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardGroupRepository.init();

      // Get flashcard
      const flashcard = await this.repository.findById(flashcardId);
      if (!flashcard) {
        const error = new Error("Flashcard not found");
        error.status = 404;
        throw error;
      }

      // Check if group belongs to user
      const group = await this.flashcardGroupRepository.findOne({
        _id: flashcard.flashcard_group_id,
        user_id: this.flashcardGroupRepository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      // Delete flashcard from flashcards collection
      await this.repository.deleteById(flashcardId);

      // Remove flashcard_id from flashcard_group.flashcards array
      await this.flashcardGroupRepository.collection.updateOne(
        {
          _id: flashcard.flashcard_group_id,
          user_id: this.flashcardGroupRepository.toObjectId(userId),
        },
        {
          $pull: { flashcards: this.repository.toObjectId(flashcardId) },
          $set: { updatedAt: new Date() },
        }
      );

      this.log("info", `Flashcard removed: ${flashcardId}`);

      return { message: "Flashcard removed successfully" };
    }, "removeFlashcard");
  }

  /**
   * Review flashcard - Update progress with spaced repetition
   * @param {string|ObjectId} flashcardId - Flashcard ID
   * @param {string|ObjectId} userId - User ID
   * @param {string} action - "remember" or "forget"
   * @returns {Promise<Object>}
   */
  async reviewFlashcard(flashcardId, userId, action) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardGroupRepository.init();

      // Get flashcard
      const flashcard = await this.repository.findById(flashcardId);
      if (!flashcard) {
        const error = new Error("Flashcard not found");
        error.status = 404;
        throw error;
      }

      // Check if group belongs to user
      const group = await this.flashcardGroupRepository.findOne({
        _id: flashcard.flashcard_group_id,
        user_id: this.flashcardGroupRepository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      // Initialize progress if not exists
      const progress = flashcard.progress || {
        times_shown: 0,
        times_correct: 0,
        accuracy: 0,
        last_reviewed_at: null,
        next_review_at: null,
      };

      // Increment times_shown
      progress.times_shown += 1;

      // Spaced repetition intervals (in days)
      const intervals = [1, 2, 4, 7, 15, 30];

      if (action === "remember") {
        // Increment times_correct
        progress.times_correct += 1;

        // Calculate accuracy
        progress.accuracy =
          Math.round(
            (progress.times_correct / progress.times_shown) * 100 * 100
          ) / 100; // Round to 2 decimal places

        // Determine next interval
        const intervalDays =
          intervals[Math.min(progress.times_correct - 1, intervals.length - 1)];

        // Calculate next_review_at at 00:00:00 of the due date
        const next = new Date();
        next.setDate(next.getDate() + intervalDays);
        next.setHours(0, 0, 0, 0);
        progress.next_review_at = next;

        // Update status based on progress
        if (progress.times_correct >= 5) {
          flashcard.status = "mastered";
        } else if (progress.times_correct >= 1) {
          flashcard.status = "learning";
        }
      } else if (action === "forget") {
        // Reset times_correct
        progress.times_correct = 0;

        // Calculate accuracy
        progress.accuracy = 0;

        // Set next_review_at to 00:00:00 of the next day
        const next = new Date();
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        progress.next_review_at = next;

        // Reset status to learning
        flashcard.status = "learning";
      }

      // Set last_reviewed_at to current time
      progress.last_reviewed_at = new Date();

      // Update flashcard
      await this.repository.updateById(flashcardId, {
        $set: {
          progress,
          status: flashcard.status,
          updatedAt: new Date(),
        },
      });

      this.log("info", `Flashcard reviewed: ${flashcardId} - ${action}`);

      // Return updated flashcard with progress
      return {
        flashcard_id: flashcardId,
        progress: {
          times_shown: progress.times_shown,
          times_correct: progress.times_correct,
          accuracy: progress.accuracy,
          last_reviewed_at: progress.last_reviewed_at,
          next_review_at: progress.next_review_at,
        },
        status: flashcard.status,
      };
    }, "reviewFlashcard");
  }
}

export default FlashcardService;
