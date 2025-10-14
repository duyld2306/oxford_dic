import { ObjectId } from "mongodb";
import UserModel from "../models/User.js";
import WordModel from "../models/Word.js";
import GroupWordModel from "../models/GroupWord.js";
import CategoryModel from "../models/Category.js";
import asyncHandler from "../middleware/asyncHandler.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { respond } from "../utils/respond.js";

const userModel = new UserModel();
const wordModel = new WordModel();
const groupWordModel = new GroupWordModel();
const categoryModel = new CategoryModel();
const refreshTokenModel = new RefreshTokenModel();

class UserController {
  // GET /api/users/profile
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const user = await userModel.findByIdSafe(userId);
    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    res.apiSuccess({ data: user });
  });

  // PUT /api/users/profile
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;
    // Do not allow updating profile fields for superadmin accounts via this endpoint
    if (req.user && req.user.role === "superadmin") {
      return res.apiError("Updating profile for superadmin is forbidden", 403);
    }
    const { fullname, gender, phone_number } = req.body;
    // Validate gender if provided
    if (gender !== undefined && gender !== null) {
      if (!UserModel.ALLOWED_GENDERS.includes(gender)) {
        return res.apiError(
          `Invalid gender value. Allowed values: ${UserModel.ALLOWED_GENDERS.join(
            ", "
          )}`,
          400
        );
      }
    }

    const updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (gender !== undefined) updateData.gender = gender;
    if (phone_number !== undefined) updateData.phone_number = phone_number;

    if (Object.keys(updateData).length === 0) {
      return res.apiError("No valid fields to update", 400);
    }

    const result = await userModel.updateById(userId, updateData);

    if (result.matchedCount === 0) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    const updatedUser = await userModel.findByIdSafe(userId);

    return respond.success(res, "USER.PROFILE_UPDATED", updatedUser);
  });

  // POST /api/users/change-password
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.apiError(
        "currentPassword, newPassword and confirmPassword are required",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return res.apiError(
        "New password and confirm password do not match",
        400
      );
    }

    if (newPassword.length < 6) {
      return res.apiError("Password must be at least 6 characters long", 400);
    }

    // Get user including password
    const user = await userModel.findById(userId);
    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    const isMatch = await userModel.comparePassword(
      currentPassword,
      user.password
    );
    if (!isMatch) {
      return res.apiError("Current password is incorrect", 401);
    }

    // Update password
    await userModel.updatePassword(userId, newPassword);

    // Revoke all refresh tokens for this user (force re-login)
    await refreshTokenModel.revokeAllForUser(userId);

    res.apiSuccess({ message: "Change password successfully" });
  });

  // GET /api/users/group_words - Get all group_words for user
  getGroupWords = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const groupWords = await groupWordModel.findByUserId(userId);

    res.apiSuccess({
      data: groupWords,
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // GET /api/users/group_words/:word_id - Get group word IDs containing this word
  getGroupWordsByWordId = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { word_id } = req.params;

    if (!word_id || String(word_id).trim() === "") {
      return res.apiError("word_id is required", 400);
    }

    const wordId = String(word_id).trim();

    // Find all group_words belonging to user that contain this word
    await groupWordModel.init();
    const groupWords = await groupWordModel.collection
      .find({
        user_id: userId instanceof ObjectId ? userId : new ObjectId(userId),
        words: wordId,
      })
      .project({ _id: 1 })
      .toArray();

    // Extract IDs
    const groupWordIds = groupWords.map((gw) => gw._id.toString());

    res.apiSuccess({
      data: groupWordIds,
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // POST /api/users/group_words - Create new group_word
  createGroupWord = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    // Check if user already has 20 group_words
    const count = await groupWordModel.countByUserId(userId);
    if (count >= 20) {
      return respond.error(res, "GROUP_WORD.LIMIT_REACHED");
    }

    const groupWord = await groupWordModel.create(userId, name.trim());

    res.apiSuccess({
      data: {
        _id: groupWord._id,
        name: groupWord.name,
      },
      message: "Group word created successfully",
      error_code: "",
    });
  });

  // PUT /api/users/group_words/:group_word_id - Update group_word
  updateGroupWord = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { group_word_id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(group_word_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if group_word exists and belongs to user
    const groupWord = await groupWordModel.findByIdAndUserId(
      groupObjectId,
      userId
    );
    if (!groupWord) {
      return respond.error(res, "GROUP_WORD.NOT_FOUND");
    }

    // Update group_word
    await groupWordModel.updateById(groupObjectId, userId, {
      name: name.trim(),
    });

    res.apiSuccess({
      data: null,
      message: "Group word updated successfully",
      error_code: "",
    });
  });

  // DELETE /api/users/group_words/:group_word_id - Delete group_word
  deleteGroupWord = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { group_word_id } = req.params;

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(group_word_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if group_word exists and belongs to user
    const groupWord = await groupWordModel.findByIdAndUserId(
      groupObjectId,
      userId
    );
    if (!groupWord) {
      return respond.error(res, "GROUP_WORD.NOT_FOUND");
    }

    // Check if group_word has any words
    if (groupWord.words && groupWord.words.length > 0) {
      return respond.error(res, "GROUP_WORD.NOT_EMPTY");
    }

    // Delete group_word
    await groupWordModel.deleteById(groupObjectId, userId);

    res.apiSuccess({
      data: null,
      message: "Group word deleted successfully",
      error_code: "",
    });
  });

  // GET /api/users/categories - Get all categories for user
  getCategories = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const categories = await categoryModel.findByUserId(userId);

    res.apiSuccess({
      data: categories,
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // GET /api/users/categories/:word_id - Get category IDs containing this word
  getCategoriesByWordId = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { word_id } = req.params;

    if (!word_id || String(word_id).trim() === "") {
      return res.apiError("word_id is required", 400);
    }

    const wordId = String(word_id).trim();

    // Find all categories belonging to user that contain this word
    await categoryModel.init();
    const categories = await categoryModel.collection
      .find({
        user_id: userId instanceof ObjectId ? userId : new ObjectId(userId),
        words: wordId,
      })
      .project({ _id: 1 })
      .toArray();

    // Extract IDs
    const categoryIds = categories.map((cat) => cat._id.toString());

    res.apiSuccess({
      data: categoryIds,
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // POST /api/users/categories - Create new category
  createCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    // Check if user already has 20 categories
    const count = await categoryModel.countByUserId(userId);
    if (count >= 20) {
      return respond.error(res, "CATEGORY.LIMIT_REACHED");
    }

    const category = await categoryModel.create(userId, name.trim());

    res.apiSuccess({
      data: {
        _id: category._id,
        name: category.name,
      },
      message: "Category created successfully",
      error_code: "",
    });
  });

  // PUT /api/users/categories/:category_id - Update category
  updateCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { category_id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    let categoryObjectId;
    try {
      categoryObjectId = new ObjectId(category_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if category exists and belongs to user
    const category = await categoryModel.findByIdAndUserId(
      categoryObjectId,
      userId
    );
    if (!category) {
      return respond.error(res, "CATEGORY.NOT_FOUND");
    }

    // Update category
    await categoryModel.updateById(categoryObjectId, userId, {
      name: name.trim(),
    });

    res.apiSuccess({
      data: null,
      message: "Category updated successfully",
      error_code: "",
    });
  });

  // DELETE /api/users/categories/:category_id - Delete category
  deleteCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { category_id } = req.params;

    let categoryObjectId;
    try {
      categoryObjectId = new ObjectId(category_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if category exists and belongs to user
    const category = await categoryModel.findByIdAndUserId(
      categoryObjectId,
      userId
    );
    if (!category) {
      return respond.error(res, "CATEGORY.NOT_FOUND");
    }

    // Check if category has any words
    if (category.words && category.words.length > 0) {
      return respond.error(res, "CATEGORY.NOT_EMPTY");
    }

    // Delete category
    await categoryModel.deleteById(categoryObjectId, userId);

    res.apiSuccess({
      data: null,
      message: "Category deleted successfully",
      error_code: "",
    });
  });

  // POST /api/users/categories/:category_id/words - Add words to category
  addWordsToCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { category_id } = req.params;
    const { word_ids } = req.body;

    // Validate category_id
    let categoryObjectId;
    try {
      categoryObjectId = new ObjectId(category_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Validate word_ids
    if (!Array.isArray(word_ids) || word_ids.length === 0) {
      return res.apiError("word_ids must be a non-empty array", 400);
    }

    // Validate all word_ids are strings
    if (!word_ids.every((id) => typeof id === "string" && id.trim())) {
      return res.apiError("All word_ids must be non-empty strings", 400);
    }

    // Check if category exists and belongs to user
    const category = await categoryModel.findByIdAndUserId(
      categoryObjectId,
      userId
    );
    if (!category) {
      return respond.error(res, "CATEGORY.NOT_FOUND");
    }

    // Verify all words exist
    await wordModel.init();
    const existingWords = await wordModel.collection
      .find({ _id: { $in: word_ids } })
      .project({ _id: 1 })
      .toArray();

    if (existingWords.length !== word_ids.length) {
      const foundIds = existingWords.map((w) => w._id);
      const missingIds = word_ids.filter((id) => !foundIds.includes(id));
      return res.apiError(`Words not found: ${missingIds.join(", ")}`, 404);
    }

    // Filter out duplicates (words already in category)
    const existingWordIds = category.words || [];
    const newWordIds = word_ids.filter((id) => !existingWordIds.includes(id));

    if (newWordIds.length === 0) {
      return res.apiError("All words already exist in this category", 400);
    }

    // Add words to category
    await categoryModel.addWords(categoryObjectId, newWordIds, userId);

    res.apiSuccess({
      data: null,
      message: `${newWordIds.length} word(s) added to category successfully`,
      error_code: "",
    });
  });

  // GET /api/users/categories/:category_id/words - Get words from category
  getWordsFromCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { category_id } = req.params;
    const q = req.query.q || "";
    const symbol = req.query.symbol || "";
    const partsOfSpeech = req.query.parts_of_speech || "";
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 100;

    if (page < 1 || perPage < 1 || perPage > 100) {
      return res.apiError("Invalid pagination parameters", 400);
    }

    // Validate symbol
    if (symbol && !["a1", "a2", "b1", "b2", "c1", "other"].includes(symbol)) {
      return res.apiError(
        "symbol must be one of: a1, a2, b1, b2, c1, other",
        400
      );
    }

    // Validate category_id
    let categoryObjectId;
    try {
      categoryObjectId = new ObjectId(category_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Get category and verify ownership
    const wordIds = await categoryModel.getWordsInCategory(
      categoryObjectId,
      userId
    );

    if (wordIds === null) {
      return respond.error(res, "CATEGORY.NOT_FOUND");
    }

    // Build query for filtering words
    await wordModel.init();
    const query = { _id: { $in: wordIds } };

    // Helper to escape user input for regex
    const escapeForRegex = (s) =>
      String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Apply search query filter
    if (q && String(q).trim() !== "") {
      const searchQuery = String(q).trim();
      query._id = {
        $in: wordIds,
        $regex: escapeForRegex(searchQuery),
        $options: "i",
      };
    }

    // Apply symbol filter
    const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
    if (symbol === "other") {
      query.symbol = { $nin: SYMBOL_ORDER };
    } else if (SYMBOL_ORDER.includes(symbol)) {
      query.symbol = symbol;
    }

    // Apply parts_of_speech filter
    if (partsOfSpeech && String(partsOfSpeech).trim() !== "") {
      try {
        const parsed = JSON.parse(partsOfSpeech);
        if (Array.isArray(parsed)) {
          query.parts_of_speech = parsed;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Get total count after filtering
    const total = await wordModel.collection.countDocuments(query);

    // Get words with pagination and full data
    const skip = (page - 1) * perPage;
    const projection = {
      _id: 1,
      data: 1,
      variants: 1,
      createdAt: 1,
      updatedAt: 1,
      symbol: 1,
      parts_of_speech: 1,
    };

    const words = await wordModel.collection
      .find(query, { projection })
      .sort({ _id: 1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    // Get category_ids for each word
    const wordIdsInPage = words.map((w) => w._id);
    const wordCategoryMap = await categoryModel.getCategoriesByWordIds(
      wordIdsInPage,
      userId
    );

    // Add category_ids to each word
    const wordsWithCategories = words.map((word) => ({
      ...word,
      category_ids: wordCategoryMap[word._id] || [],
    }));

    res.apiSuccess({
      data: wordsWithCategories,
      meta: {
        total,
        page,
        per_page: perPage,
      },
      message: "",
      error_code: "",
    });
  });

  // DELETE /api/users/categories/:category_id/words - Remove words from category
  removeWordsFromCategory = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { category_id } = req.params;
    const { word_ids } = req.body;

    // Validate category_id
    let categoryObjectId;
    try {
      categoryObjectId = new ObjectId(category_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Validate word_ids
    if (!Array.isArray(word_ids) || word_ids.length === 0) {
      return res.apiError("word_ids must be a non-empty array", 400);
    }

    // Validate all word_ids are strings
    if (!word_ids.every((id) => typeof id === "string" && id.trim())) {
      return res.apiError("All word_ids must be non-empty strings", 400);
    }

    // Check if category exists and belongs to user
    const category = await categoryModel.findByIdAndUserId(
      categoryObjectId,
      userId
    );
    if (!category) {
      return respond.error(res, "CATEGORY.NOT_FOUND");
    }

    // Verify all words exist
    await wordModel.init();
    const existingWords = await wordModel.collection
      .find({ _id: { $in: word_ids } })
      .project({ _id: 1 })
      .toArray();

    if (existingWords.length !== word_ids.length) {
      const foundIds = existingWords.map((w) => w._id);
      const missingIds = word_ids.filter((id) => !foundIds.includes(id));
      return res.apiError(`Words not found: ${missingIds.join(", ")}`, 404);
    }

    // Remove words from category
    await categoryModel.removeWords(categoryObjectId, word_ids, userId);

    res.apiSuccess({
      data: null,
      message: `${word_ids.length} word(s) removed from category successfully`,
      error_code: "",
    });
  });

  // GET /api/users/favorites - Get favorites
  getFavorites = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const groupWordId = req.query.group_word_id;
    const q = req.query.q || "";
    const symbol = req.query.symbol || "";
    const partsOfSpeech = req.query.parts_of_speech || "";
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 100;

    if (page < 1 || perPage < 1 || perPage > 100) {
      return res.apiError("Invalid pagination parameters", 400);
    }

    // Validate symbol
    if (symbol && !["a1", "a2", "b1", "b2", "c1", "other"].includes(symbol)) {
      return res.apiError(
        "symbol must be one of: a1, a2, b1, b2, c1, other",
        400
      );
    }

    let wordIds = [];

    // If group_word_id is provided, get words from that group
    if (groupWordId) {
      let groupObjectId;
      try {
        groupObjectId = new ObjectId(groupWordId);
      } catch (error) {
        return respond.error(res, "VALIDATION.INVALID_ID");
      }

      // Check if group exists and belongs to user
      const groupWord = await groupWordModel.findByIdAndUserId(
        groupObjectId,
        userId
      );
      if (!groupWord) {
        return respond.error(res, "GROUP_WORD.NOT_FOUND");
      }

      // Get all words from group (no pagination yet, we'll filter first)
      const { words } = await groupWordModel.getWordsInGroup(
        groupObjectId,
        userId,
        1,
        999999
      );
      wordIds = words;
    } else {
      // Get all favorites from all groups (flattened, no pagination yet)
      const { words } = await groupWordModel.getAllWordsFromUserGroups(
        userId,
        1,
        999999
      );
      wordIds = words;
    }

    // Build query for filtering words
    await wordModel.init();
    const query = { _id: { $in: wordIds } };

    // Helper to escape user input for regex
    const escapeForRegex = (s) =>
      String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Apply search query filter
    if (q && String(q).trim() !== "") {
      const searchQuery = String(q).trim();
      query._id = {
        $in: wordIds,
        $regex: escapeForRegex(searchQuery),
        $options: "i",
      };
    }

    // Apply symbol filter
    const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
    if (symbol === "other") {
      query.symbol = { $nin: SYMBOL_ORDER };
    } else if (SYMBOL_ORDER.includes(symbol)) {
      query.symbol = symbol;
    }

    // Apply parts_of_speech filter
    if (partsOfSpeech && String(partsOfSpeech).trim() !== "") {
      try {
        const parsed = JSON.parse(partsOfSpeech);
        if (Array.isArray(parsed)) {
          query.parts_of_speech = parsed;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Get total count after filtering
    const total = await wordModel.collection.countDocuments(query);

    // Get words with pagination and full data
    const skip = (page - 1) * perPage;
    const projection = {
      _id: 1,
      data: 1,
      variants: 1,
      createdAt: 1,
      updatedAt: 1,
      symbol: 1,
      parts_of_speech: 1,
    };

    const words = await wordModel.collection
      .find(query, { projection })
      .sort({ _id: 1 })
      .skip(skip)
      .limit(perPage)
      .toArray();

    // Get category_ids for each word
    const wordIdsInPage = words.map((w) => w._id);
    const wordCategoryMap = await categoryModel.getCategoriesByWordIds(
      wordIdsInPage,
      userId
    );

    // Add category_ids to each word
    const wordsWithCategories = words.map((word) => ({
      ...word,
      category_ids: wordCategoryMap[word._id] || [],
    }));

    res.apiSuccess({
      data: wordsWithCategories,
      meta: {
        total,
        page,
        per_page: perPage,
      },
      message: "",
      error_code: "",
    });
  });

  // POST /api/users/favorites - Add word to group
  addFavorite = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { group_word_id, word_id } = req.body;

    if (!group_word_id || !word_id) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    if (typeof word_id !== "string") {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(group_word_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if group_word exists and belongs to user
    const groupWord = await groupWordModel.findByIdAndUserId(
      groupObjectId,
      userId
    );
    if (!groupWord) {
      return respond.error(res, "GROUP_WORD.NOT_FOUND");
    }

    // Check if word exists
    await wordModel.init();
    const word = await wordModel.collection.findOne({ _id: word_id });
    if (!word) {
      return respond.error(res, "WORD.NOT_FOUND");
    }

    // Check if word already exists in group (prevent duplicates)
    if (groupWord.words && groupWord.words.some((id) => id === word_id)) {
      return res.apiError("Word already exists in this group", 400);
    }

    // Add word to group_word
    await groupWordModel.addWord(groupObjectId, word_id, userId);

    res.apiSuccess({
      data: null,
      message: "Word added to group successfully",
      error_code: "",
    });
  });

  // GET /api/users/list - Superadmin only: list users with pagination and name/email search
  listUsers = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const per_page = Math.max(1, parseInt(req.query.per_page, 10) || 100);
    const name = String(req.query.name || "").trim();
    const roleFilter = String(req.query.role || "").trim();
    const isVerifiedRaw = req.query.isVerified;

    let isVerifiedFilter = null;
    if (isVerifiedRaw !== undefined) {
      if (isVerifiedRaw === "true" || isVerifiedRaw === true)
        isVerifiedFilter = true;
      else if (isVerifiedRaw === "false" || isVerifiedRaw === false)
        isVerifiedFilter = false;
      else return res.apiError("Invalid isVerified value", 400);
    }

    // Build query: search fullname OR email (case-insensitive, partial)
    const query = {};
    if (name) {
      const escaped = name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
      query.$or = [
        { fullname: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    // role filter
    if (roleFilter) {
      if (["user", "admin", "superadmin"].includes(roleFilter)) {
        query.role = roleFilter;
      } else {
        return res.apiError("Invalid role filter", 400);
      }
    }

    // isVerified filter
    if (isVerifiedFilter !== null) {
      query.isVerified = isVerifiedFilter;
    }

    await userModel.init();

    const skip = (page - 1) * per_page;

    // Only expose safe fields
    const projection = {
      _id: 1,
      email: 1,
      fullname: 1,
      role: 1,
      gender: 1,
      isVerified: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const cursor = userModel.collection
      .find(query, { projection })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(per_page);

    const rows = await cursor.toArray();
    const total = await userModel.collection.countDocuments(query);

    // Map _id to string for consistency
    const users = rows.map((u) => ({
      ...u,
      _id: String(u._id),
    }));

    res.apiSuccess({
      data: users,
      meta: { total, page, per_page },
      message: "",
      error_code: "",
    });
  });

  // POST /api/users/set-verified - Superadmin only: set isVerified (true/false) for a user
  setVerified = asyncHandler(async (req, res) => {
    const { user_id, isVerified } = req.body;

    if (!user_id || typeof isVerified === "undefined") {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    let userObjectId;
    try {
      userObjectId = new ObjectId(user_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Prevent changing verification for superadmin accounts (safety)
    const targetUser = await userModel.findById(userObjectId);
    if (!targetUser) return respond.error(res, "USER.USER_NOT_FOUND");
    if (targetUser.role === "superadmin") {
      return res.apiError(
        "Cannot change verification status of superadmin",
        403
      );
    }

    await userModel.setVerified(userObjectId, !!isVerified);

    res.apiSuccess({
      data: null,
      message: "Verification status updated",
      error_code: "",
    });
  });

  // DELETE /api/users/favorites - Remove word from group
  removeFavorite = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { group_word_id, word_id } = req.body;

    if (!group_word_id || !word_id) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(group_word_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Check if group_word exists and belongs to user
    const groupWord = await groupWordModel.findByIdAndUserId(
      groupObjectId,
      userId
    );
    if (!groupWord) {
      return respond.error(res, "GROUP_WORD.NOT_FOUND");
    }

    // Remove word from group_word
    await groupWordModel.removeWord(groupObjectId, word_id, userId);

    res.apiSuccess({
      data: null,
      message: "Word removed from group successfully",
      error_code: "",
    });
  });

  // POST /api/users/assign-role - Assign role to user (superadmin only)
  assignRole = asyncHandler(async (req, res) => {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return respond.error(res, "VALIDATION.REQUIRED_FIELDS");
    }

    // Validate role
    if (!["admin", "user"].includes(role)) {
      return respond.error(res, "VALIDATION.INVALID_ROLE");
    }

    let userObjectId;
    try {
      userObjectId = new ObjectId(user_id);
    } catch (error) {
      return respond.error(res, "VALIDATION.INVALID_ID");
    }

    // Update user role
    await userModel.updateRole(userObjectId, role);

    res.apiSuccess({
      data: null,
      message: "Role assigned successfully",
      error_code: "",
    });
  });
}

export default UserController;
