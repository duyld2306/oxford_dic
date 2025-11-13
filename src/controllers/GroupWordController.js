import { BaseController } from "./BaseController.js";
import GroupWordService from "../services/GroupWordService.js";
import WordService from "../services/WordService.js";
import CategoryService from "../services/CategoryService.js";

class GroupWordController extends BaseController {
  constructor(
    groupWordService = null,
    wordService = null,
    categoryService = null
  ) {
    super();
    this.groupWordService = groupWordService || new GroupWordService();
    this.wordService = wordService || new WordService();
    this.categoryService = categoryService || new CategoryService();
  }

  // GET /api/group-words - Get all group_words
  getGroupWords = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const groupWords = await this.groupWordService.getGroupWords(userId);
    return this.sendSuccess(res, groupWords);
  });

  // POST /api/group-words - Create new group_word
  createGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { name } = this.getBody(req);

    try {
      const groupWord = await this.groupWordService.createGroupWord(userId, {
        name,
      });
      return this.sendCreated(res, groupWord);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // PUT /api/group-words/:id - Update group_word
  updateGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const { name } = this.getBody(req);

    try {
      const result = await this.groupWordService.updateGroupWord(id, userId, {
        name,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // DELETE /api/group-words/:id - Delete group_word
  deleteGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);

    try {
      const result = await this.groupWordService.deleteGroupWord(id, userId);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/group-words/favorites - Get favorites
  getFavorites = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const {
      group_word_id,
      q,
      symbol,
      parts_of_speech,
      page = 1,
      per_page = 100,
    } = this.getQuery(req);

    const result = await this.groupWordService.getFavorites({
      userId,
      group_word_id,
      q,
      symbol,
      parts_of_speech,
      page,
      per_page,
    });

    return this.sendSuccess(res, result.data, {
      total: result.total,
      page,
      per_page,
    });
  });

  // POST /api/group-words/favorites - Add word to group
  addFavorite = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id, word_id } = this.getBody(req);

    try {
      const result = await this.groupWordService.addWord(
        group_word_id,
        userId,
        word_id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // DELETE /api/group-words/favorites - Remove word from group
  removeFavorite = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id, word_id } = this.getBody(req);

    try {
      const result = await this.groupWordService.removeWord(
        group_word_id,
        userId,
        word_id
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/group-words/:word_id - Get group word IDs containing this word
  getGroupWordsByWordId = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { word_id } = this.getParams(req);

    const groupIds = await this.groupWordService.getGroupWordsByWordId(
      word_id,
      userId
    );

    return this.sendSuccess(res, groupIds);
  });
}

export default GroupWordController;
