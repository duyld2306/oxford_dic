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
    // Ensure we keep an explicit reference to the groupWordRepository
    this.groupWordRepository = groupWordRepository || new GroupWordRepository();
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

  async getFavorites({
    userId,
    group_word_id,
    q,
    symbol,
    parts_of_speech,
    page,
    per_page,
  }) {
    return this.execute(async () => {
      await this.repository.init();
      await this.groupWordRepository.init();
      await this.wordRepository.init();

      // 1️⃣ Lấy groupWords của user
      const groupFilter = { user_id: this.repository.toObjectId(userId) };
      if (group_word_id)
        groupFilter._id = this.repository.toObjectId(group_word_id);

      const groupWords = await this.groupWordRepository.find(groupFilter);

      // 2️⃣ Gom tất cả wordIds
      const allWordIds = [
        ...new Set(groupWords.flatMap((gw) => gw.words || [])),
      ];

      if (!allWordIds.length) return { total: 0, data: [] };

      // 3️⃣ Tạo điều kiện truy vấn words
      const query = { _id: { $in: allWordIds } };

      if (q) {
        const regex = new RegExp(this.escapeForRegex(q), "i");
        query._id = { $in: allWordIds.filter((id) => regex.test(id)) };
      }

      if (parts_of_speech) {
        try {
          const parsed = JSON.parse(parts_of_speech);
          if (Array.isArray(parsed)) query.parts_of_speech = { $in: parsed };
        } catch {}
      }

      const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
      if (symbol === "other") query.symbol = { $nin: SYMBOL_ORDER };
      else if (SYMBOL_ORDER.includes(symbol)) query.symbol = symbol;

      // 4️⃣ Lookup categories 1 lần duy nhất
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "categories",
            let: { wordId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$wordId", "$words"] },
                      { $eq: ["$user_id", this.repository.toObjectId(userId)] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "categories",
          },
        },
        {
          $addFields: { category_ids: "$categories._id" },
        },
        { $skip: (page - 1) * per_page },
        { $limit: per_page },
      ];

      const data = await this.wordRepository.collection
        .aggregate(pipeline)
        .toArray();
      const total = allWordIds.length;

      return { total, data };
    }, "getFavorites");
  }
}

export default GroupWordService;
