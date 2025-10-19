import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { GroupWordRepository } from "../repositories/GroupWordRepository.js";
import { WordRepository } from "../repositories/WordRepository.js";
import { GroupWordDTO, GroupWordListDTO } from "../dtos/GroupWordDTO.js";

/**
 * GroupWordService
 * Handles group word management logic (favorites)
 */
export class GroupWordService extends BaseService {
  constructor(
    groupWordRepository = null,
    wordRepository = null,
    dependencies = {}
  ) {
    super(groupWordRepository || new GroupWordRepository(), dependencies);
    this.wordRepository = wordRepository || new WordRepository();
  }

  /**
   * Get all group words for user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async getGroupWords(userId) {
    return this.execute(async () => {
      const groupWords = await this.repository.find({
        user_id: this.repository.toObjectId(userId),
      });

      return groupWords.map((gw) => new GroupWordListDTO(gw).transform());
    }, "getGroupWords");
  }

  /**
   * Get group word IDs containing a word
   * @param {string} wordId - Word ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async getGroupWordsByWordId(wordId, userId) {
    return this.execute(async () => {
      await this.repository.init();
      const groupWords = await this.repository.collection
        .find({
          user_id: this.repository.toObjectId(userId),
          words: String(wordId).trim(),
        })
        .project({ _id: 1 })
        .toArray();

      return groupWords.map((gw) => gw._id.toString());
    }, "getGroupWordsByWordId");
  }

  /**
   * Create new group word
   * @param {string|ObjectId} userId - User ID
   * @param {Object} data - Group word data
   * @returns {Promise<Object>}
   */
  async createGroupWord(userId, data) {
    return this.execute(async () => {
      const { name } = data;

      // Check if user already has 20 group words
      const count = await this.repository.count({
        user_id: this.repository.toObjectId(userId),
      });

      if (count >= 20) {
        const error = new Error("Group word limit reached (maximum 20)");
        error.status = 400;
        throw error;
      }

      const groupWord = await this.repository.insertOne({
        user_id: this.repository.toObjectId(userId),
        name: name.trim(),
        words: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.log("info", `Group word created: ${name}`);

      return new GroupWordDTO(groupWord).transform();
    }, "createGroupWord");
  }

  /**
   * Update group word
   * @param {string|ObjectId} groupWordId - Group word ID
   * @param {string|ObjectId} userId - User ID
   * @param {Object} updates - Group word updates
   * @returns {Promise<Object>}
   */
  async updateGroupWord(groupWordId, userId, updates) {
    return this.execute(async () => {
      const { name } = updates;

      // Check if group word exists and belongs to user
      const groupWord = await this.repository.findOne({
        _id: this.repository.toObjectId(groupWordId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!groupWord) {
        const error = new Error("Group word not found");
        error.status = 404;
        throw error;
      }

      await this.repository.updateById(groupWordId, {
        $set: {
          name: name.trim(),
          updatedAt: new Date(),
        },
      });

      this.log("info", `Group word updated: ${name}`);

      // Return updated group word
      const updatedGroupWord = await this.repository.findById(groupWordId);
      return new GroupWordDTO(updatedGroupWord).transform();
    }, "updateGroupWord");
  }

  /**
   * Delete group word
   * @param {string|ObjectId} groupWordId - Group word ID
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteGroupWord(groupWordId, userId) {
    return this.execute(async () => {
      // Check if group word exists and belongs to user
      const groupWord = await this.repository.findOne({
        _id: this.repository.toObjectId(groupWordId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!groupWord) {
        const error = new Error("Group word not found");
        error.status = 404;
        throw error;
      }

      await this.repository.deleteById(groupWordId);

      this.log("info", `Group word deleted: ${groupWord.name}`);

      return { message: "Group word deleted successfully" };
    }, "deleteGroupWord");
  }

  /**
   * Add word to group
   * @param {string|ObjectId} groupWordId - Group word ID
   * @param {string|ObjectId} userId - User ID
   * @param {string} wordId - Word ID to add
   * @returns {Promise<Object>}
   */
  async addWord(groupWordId, userId, wordId) {
    return this.execute(async () => {
      // Check if group word exists and belongs to user
      const groupWord = await this.repository.findOne({
        _id: this.repository.toObjectId(groupWordId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!groupWord) {
        const error = new Error("Group word not found");
        error.status = 404;
        throw error;
      }

      // Check if word exists
      const word = await this.wordRepository.findByWord(wordId);
      if (!word) {
        const error = new Error("Word not found");
        error.status = 404;
        throw error;
      }

      // Check if word already exists in group
      if (groupWord.words && groupWord.words.includes(wordId)) {
        const error = new Error("Word already exists in this group");
        error.status = 400;
        throw error;
      }

      // Add word to group
      await this.repository.updateById(groupWordId, {
        $addToSet: { words: wordId },
        $set: { updatedAt: new Date() },
      });

      this.log("info", `Word added to group: ${wordId} -> ${groupWord.name}`);

      // Return updated group word
      const updatedGroupWord = await this.repository.findById(groupWordId);
      return new GroupWordDTO(updatedGroupWord).transform();
    }, "addWord");
  }

  /**
   * Remove word from group
   * @param {string|ObjectId} groupWordId - Group word ID
   * @param {string|ObjectId} userId - User ID
   * @param {string} wordId - Word ID to remove
   * @returns {Promise<Object>}
   */
  async removeWord(groupWordId, userId, wordId) {
    return this.execute(async () => {
      // Check if group word exists and belongs to user
      const groupWord = await this.repository.findOne({
        _id: this.repository.toObjectId(groupWordId),
        user_id: this.repository.toObjectId(userId),
      });

      if (!groupWord) {
        const error = new Error("Group word not found");
        error.status = 404;
        throw error;
      }

      // Remove word from group
      await this.repository.updateById(groupWordId, {
        $pull: { words: wordId },
        $set: { updatedAt: new Date() },
      });

      this.log(
        "info",
        `Word removed from group: ${wordId} <- ${groupWord.name}`
      );

      return { message: "Word removed from group successfully" };
    }, "removeWord");
  }
}

export default GroupWordService;
