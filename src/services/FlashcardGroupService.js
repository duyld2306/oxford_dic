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

      const groups = await this.repository.find({
        user_id: this.repository.toObjectId(userId),
      });

      return groups.map((group) => new FlashcardGroupDTO(group).transform());
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
   * @param {string|ObjectId} groupId - Flashcard group ID
   * @param {string|ObjectId} userId - User ID
   * @param {string|ObjectId} groupWordId - Group word ID to sync from
   * @returns {Promise<Object>}
   */
  async syncFromGroupWord(groupId, userId, groupWordId) {
    return this.execute(async () => {
      await this.repository.init();
      await this.groupWordRepository.init();
      await this.flashcardRepository.init();

      // Check if flashcard group exists and belongs to user
      const flashcardGroup = await this.repository.findOne({
        _id: this.repository.toObjectId(groupId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!flashcardGroup) {
        const error = new Error("Flashcard group not found");
        error.status = 404;
        throw error;
      }

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

      // Update flashcard group source
      await this.repository.updateById(groupId, {
        source_type: "group_word",
        source_id: this.repository.toObjectId(groupWordId),
        updatedAt: new Date(),
      });

      // Get existing flashcards in this group
      const existingFlashcards = await this.flashcardRepository.find({
        flashcard_group_id: this.repository.toObjectId(groupId),
      });

      const existingWordIds = new Set(
        existingFlashcards.map((fc) => fc.word_id)
      );

      // Add new flashcards for words not already in the group
      const wordIds = groupWord.words || [];
      const newWordIds = wordIds.filter(
        (wordId) => !existingWordIds.has(wordId)
      );

      if (newWordIds.length > 0) {
        const flashcardsToInsert = newWordIds.map((wordId) => ({
          flashcard_group_id: this.repository.toObjectId(groupId),
          word_id: wordId,
          status: "new",
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await this.flashcardRepository.insertMany(flashcardsToInsert);
      }

      this.log(
        "info",
        `Synced ${newWordIds.length} new flashcards from group_word: ${groupWord.name}`
      );

      return {
        message: `Synced ${newWordIds.length} new flashcards`,
        added: newWordIds.length,
      };
    }, "syncFromGroupWord");
  }
}

export default FlashcardGroupService;
