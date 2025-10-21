import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { FlashcardGroupRepository } from "../repositories/FlashcardGroupRepository.js";
import { FlashcardRepository } from "../repositories/FlashcardRepository.js";
import { GroupWordRepository } from "../repositories/GroupWordRepository.js";
import {
  FlashcardGroupDTO,
  FlashcardGroupDetailDTO,
} from "../dtos/FlashcardDTO.js";

/**
 * FlashcardGroupService
 * Handles flashcard group management logic
 */
export class FlashcardGroupService extends BaseService {
  constructor(
    flashcardGroupRepository = null,
    flashcardRepository = null,
    groupWordRepository = null,
    dependencies = {}
  ) {
    super(
      flashcardGroupRepository || new FlashcardGroupRepository(),
      dependencies
    );
    this.flashcardRepository = flashcardRepository || new FlashcardRepository();
    this.groupWordRepository = groupWordRepository || new GroupWordRepository();
  }

  /**
   * Get all flashcard groups for user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async getFlashcardGroups(userId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardRepository.init();

      const groups = await this.repository.find({
        user_id: this.repository.toObjectId(userId),
      });

      // Fetch flashcards for each group to calculate is_due_for_review
      const groupsWithFlashcards = await Promise.all(
        groups.map(async (group) => {
          const flashcards = await this.flashcardRepository.find({
            flashcard_group_id: group._id,
          });
          return {
            ...group,
            flashcards_data: flashcards,
          };
        })
      );

      return groupsWithFlashcards.map((group) =>
        new FlashcardGroupDTO(group).transform()
      );
    }, "getFlashcardGroups");
  }

  /**
   * Get flashcard group details
   * @param {string|ObjectId} groupId - Group ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async getFlashcardGroup(groupId, userId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardRepository.init();

      const group = await this.repository.findOne({
        _id: this.repository.toObjectId(groupId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      // Get flashcards for this group
      const flashcards = await this.flashcardRepository.find({
        flashcard_group_id: this.repository.toObjectId(groupId),
      });

      return new FlashcardGroupDetailDTO({ ...group, flashcards }).transform();
    }, "getFlashcardGroup");
  }

  /**
   * Create flashcard group
   * @param {string|ObjectId} userId - User ID
   * @param {Object} data - Group data
   * @returns {Promise<Object>}
   */
  async createFlashcardGroup(userId, data) {
    return this.execute(async () => {
      await this.repository.init();

      const { name, description, source_type } = data;

      // Use repository.create() which includes entity validation
      const group = await this.repository.create({
        user_id: this.repository.toObjectId(userId),
        name: name?.trim(),
        description: description || "",
        source_type: source_type || "manual",
        source_id: null,
        flashcards: [],
      });

      this.log("info", `Flashcard group created: ${name}`);

      return new FlashcardGroupDTO(group).transform();
    }, "createFlashcardGroup");
  }

  /**
   * Update flashcard group
   * @param {string|ObjectId} groupId - Group ID
   * @param {string|ObjectId} userId - User ID
   * @param {Object} updates - Group updates
   * @returns {Promise<Object>}
   */
  async updateFlashcardGroup(groupId, userId, updates) {
    return this.execute(async () => {
      await this.repository.init();

      const { name, description } = updates;

      // Check if group exists and belongs to user
      const group = await this.repository.findOne({
        _id: this.repository.toObjectId(groupId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      const updateData = {};
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          const error = new Error("Name must be a non-empty string");
          error.status = 400;
          throw error;
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description;
      }

      await this.repository.updateById(groupId, {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.log("info", `Flashcard group updated: ${groupId}`);

      // Return updated group
      const updatedGroup = await this.repository.findById(groupId);
      return new FlashcardGroupDTO(updatedGroup).transform();
    }, "updateFlashcardGroup");
  }

  /**
   * Delete flashcard group
   * @param {string|ObjectId} groupId - Group ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteFlashcardGroup(groupId, userId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.flashcardRepository.init();

      // Check if group exists and belongs to user
      const group = await this.repository.findOne({
        _id: this.repository.toObjectId(groupId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!group) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

      // Delete all flashcards in this group
      await this.flashcardRepository.deleteMany({
        flashcard_group_id: this.repository.toObjectId(groupId),
      });

      // Delete the group
      await this.repository.deleteById(groupId);

      this.log("info", `Flashcard group deleted: ${group.name}`);

      return { message: "Flashcard group deleted successfully" };
    }, "deleteFlashcardGroup");
  }

  /**
   * Sync flashcard group from group_word
   * @param {string|ObjectId} userId - User ID
   * @param {string|ObjectId} groupWordId - Group word ID to sync from
   * @returns {Promise<Object>}
   */
  async syncFromGroupWord(userId, groupWordId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.groupWordRepository.init();
      await this.flashcardRepository.init();

      // Check if group_word exists and belongs to user
      const groupWord = await this.groupWordRepository.findOne({
        _id: this.groupWordRepository.toObjectId(groupWordId),
        user_id: this.groupWordRepository.toObjectId(userId),
      });

      if (!groupWord) {
        const error = new Error("Group word not found");
        error.status = 404;
        throw error;
      }

      // Find existing flashcard group with this source_id
      let flashcardGroup = await this.repository.findOne({
        user_id: this.repository.toObjectId(userId),
        source_type: "group_word",
        source_id: this.repository.toObjectId(groupWordId),
      });

      let isFirstSync = false;

      // If not exists, create new flashcard group
      if (!flashcardGroup) {
        isFirstSync = true;
        flashcardGroup = await this.repository.create({
          user_id: this.repository.toObjectId(userId),
          name: groupWord.name,
          description: groupWord.description || "",
          source_type: "group_word",
          source_id: this.repository.toObjectId(groupWordId),
          flashcards: [],
        });

        this.log(
          "info",
          `Created new flashcard group from group_word: ${groupWord.name}`
        );
      }

      // Get existing flashcards in this group
      const existingFlashcards = await this.flashcardRepository.find({
        flashcard_group_id: flashcardGroup._id,
      });

      const existingWordIds = new Set(
        existingFlashcards.map((fc) => fc.word_id)
      );

      // Add new flashcards for words not already in the group
      const wordIds = groupWord.words || [];
      const newWordIds = wordIds.filter(
        (wordId) => !existingWordIds.has(wordId)
      );

      let newFlashcardIds = [];

      if (newWordIds.length > 0) {
        const flashcardsToInsert = newWordIds.map((wordId) => ({
          flashcard_group_id: flashcardGroup._id,
          word_id: wordId,
          status: "new",
          progress: {
            times_shown: 0,
            times_correct: 0,
            accuracy: 0,
            last_reviewed_at: null,
            next_review_at: null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const result = await this.flashcardRepository.collection.insertMany(
          flashcardsToInsert
        );
        newFlashcardIds = Object.values(result.insertedIds);

        // Update flashcard_group.flashcards array
        await this.repository.collection.updateOne(
          { _id: flashcardGroup._id },
          {
            $addToSet: { flashcards: { $each: newFlashcardIds } },
            $set: { updatedAt: new Date() },
          }
        );
      }

      this.log(
        "info",
        `Synced ${newWordIds.length} new flashcards from group_word: ${groupWord.name}`
      );

      return flashcardGroup;
    }, "syncFromGroupWord");
  }
}

export default FlashcardGroupService;
