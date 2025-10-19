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
   * Update flashcard status
   * @param {string|ObjectId} flashcardId - Flashcard ID
   * @param {string|ObjectId} userId - User ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateFlashcardStatus(flashcardId, userId, status) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardGroupRepository.init();

      const ALLOWED_STATUSES = ["new", "learning", "mastered"];
      if (!ALLOWED_STATUSES.includes(status)) {
        const error = new Error(
          `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`
        );
        error.status = 400;
        throw error;
      }

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

      // Update status
      await this.repository.updateById(flashcardId, {
        $set: {
          status,
          updatedAt: new Date(),
        },
      });

      // Return updated flashcard
      const updatedFlashcard = await this.repository.findById(flashcardId);
      return new FlashcardDTO(updatedFlashcard).transform();
    }, "updateFlashcardStatus");
  }
}

export default FlashcardService;
