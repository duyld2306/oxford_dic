import asyncHandler from "../middleware/asyncHandler.js";
import FlashcardGroup from "../models/FlashcardGroup.js";
import Flashcard from "../models/Flashcard.js";
import GroupWord from "../models/GroupWord.js";
import Word from "../models/Word.js";
import { ObjectId } from "mongodb";

const flashcardGroupModel = new FlashcardGroup();
const flashcardModel = new Flashcard();
const groupWordModel = new GroupWord();
const wordModel = new Word();

class FlashcardController {
  // GET /api/users/flashcard_groups - Get all flashcard groups
  getFlashcardGroups = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const flashcardGroups = await flashcardGroupModel.findByUserId(userId);

    // Get stats for each group
    const groupsWithStats = await Promise.all(
      flashcardGroups.map(async (group) => {
        const stats = await flashcardModel.getGroupStats(group._id);
        return {
          ...group,
          stats,
        };
      })
    );

    res.apiSuccess({
      data: groupsWithStats,
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // GET /api/users/flashcard_groups/:id - Get flashcard group details
  getFlashcardGroupById = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(id);
    } catch (error) {
      return res.apiError("Invalid flashcard group ID", 400);
    }

    const flashcardGroup = await flashcardGroupModel.findByIdAndUserId(
      groupObjectId,
      userId
    );

    if (!flashcardGroup) {
      return res.apiError("Flashcard group not found", 404);
    }

    // Get flashcards in this group
    const flashcards = await flashcardModel.findByGroupId(groupObjectId);

    // Get word details for each flashcard
    await wordModel.init();
    const wordIds = flashcards.map((f) => f.word_id);
    const words = await wordModel.collection
      .find({ _id: { $in: wordIds } })
      .toArray();

    // Create word map
    const wordMap = {};
    words.forEach((word) => {
      wordMap[word._id] = word;
    });

    // Attach word details to flashcards
    const flashcardsWithWords = flashcards.map((flashcard) => ({
      ...flashcard,
      word: wordMap[flashcard.word_id] || null,
    }));

    // Get stats
    const stats = await flashcardModel.getGroupStats(groupObjectId);

    res.apiSuccess({
      data: {
        ...flashcardGroup,
        flashcards: flashcardsWithWords,
        stats,
      },
      meta: null,
      message: "",
      error_code: "",
    });
  });

  // POST /api/users/flashcard_groups - Create new flashcard group
  createFlashcardGroup = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { name, description, source_type } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.apiError("Name is required", 400);
    }

    if (source_type && !["manual", "group_word"].includes(source_type)) {
      return res.apiError("source_type must be 'manual' or 'group_word'", 400);
    }

    const flashcardGroup = await flashcardGroupModel.create({
      user_id: userId,
      name: name.trim(),
      description: description || "",
      source_type: source_type || "manual",
      source_id: null,
    });

    res.apiSuccess({
      data: flashcardGroup,
      message: "Flashcard group created successfully",
      error_code: "",
    });
  });

  // PUT /api/users/flashcard_groups/:id - Update flashcard group
  updateFlashcardGroup = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { name, description } = req.body;

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(id);
    } catch (error) {
      return res.apiError("Invalid flashcard group ID", 400);
    }

    // Check if group exists and belongs to user
    const existingGroup = await flashcardGroupModel.findByIdAndUserId(
      groupObjectId,
      userId
    );

    if (!existingGroup) {
      return res.apiError("Flashcard group not found", 404);
    }

    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.apiError("Name must be a non-empty string", 400);
      }
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description;
    }

    await flashcardGroupModel.update(groupObjectId, userId, updates);

    res.apiSuccess({
      data: null,
      message: "Flashcard group updated successfully",
      error_code: "",
    });
  });

  // DELETE /api/users/flashcard_groups/:id - Delete flashcard group
  deleteFlashcardGroup = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(id);
    } catch (error) {
      return res.apiError("Invalid flashcard group ID", 400);
    }

    // Check if group exists and belongs to user
    const existingGroup = await flashcardGroupModel.findByIdAndUserId(
      groupObjectId,
      userId
    );

    if (!existingGroup) {
      return res.apiError("Flashcard group not found", 404);
    }

    // Delete all flashcards in this group
    await flashcardModel.deleteByGroupId(groupObjectId);

    // Delete the group
    await flashcardGroupModel.delete(groupObjectId, userId);

    res.apiSuccess({
      data: null,
      message: "Flashcard group deleted successfully",
      error_code: "",
    });
  });

  // POST /api/users/flashcards - Add word to flashcard group
  addFlashcard = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { flashcard_group_id, word_id } = req.body;

    if (!flashcard_group_id || !word_id) {
      return res.apiError("flashcard_group_id and word_id are required", 400);
    }

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(flashcard_group_id);
    } catch (error) {
      return res.apiError("Invalid flashcard_group_id", 400);
    }

    // Check if group exists and belongs to user
    const flashcardGroup = await flashcardGroupModel.findByIdAndUserId(
      groupObjectId,
      userId
    );

    if (!flashcardGroup) {
      return res.apiError("Flashcard group not found", 404);
    }

    // Check if word exists
    await wordModel.init();
    const word = await wordModel.collection.findOne({ _id: word_id });
    if (!word) {
      return res.apiError("Word not found", 404);
    }

    // Check if flashcard already exists
    const existingFlashcard = await flashcardModel.findByGroupAndWord(
      groupObjectId,
      word_id
    );

    if (existingFlashcard) {
      return res.apiError("Word already exists in this flashcard group", 400);
    }

    // Create flashcard
    const flashcard = await flashcardModel.create({
      flashcard_group_id: groupObjectId,
      word_id: word_id,
    });

    // Add flashcard to group
    await flashcardGroupModel.addFlashcard(
      groupObjectId,
      userId,
      flashcard._id
    );

    res.apiSuccess({
      data: flashcard,
      message: "Flashcard added successfully",
      error_code: "",
    });
  });

  // DELETE /api/users/flashcards - Remove word from flashcard group
  removeFlashcard = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { flashcard_group_id, word_id } = req.body;

    if (!flashcard_group_id || !word_id) {
      return res.apiError("flashcard_group_id and word_id are required", 400);
    }

    let groupObjectId;
    try {
      groupObjectId = new ObjectId(flashcard_group_id);
    } catch (error) {
      return res.apiError("Invalid flashcard_group_id", 400);
    }

    // Check if group exists and belongs to user
    const flashcardGroup = await flashcardGroupModel.findByIdAndUserId(
      groupObjectId,
      userId
    );

    if (!flashcardGroup) {
      return res.apiError("Flashcard group not found", 404);
    }

    // Find flashcard
    const flashcard = await flashcardModel.findByGroupAndWord(
      groupObjectId,
      word_id
    );

    if (!flashcard) {
      return res.apiError("Flashcard not found", 404);
    }

    // Remove flashcard from group
    await flashcardGroupModel.removeFlashcard(
      groupObjectId,
      userId,
      flashcard._id
    );

    // Delete flashcard
    await flashcardModel.delete(flashcard._id);

    res.apiSuccess({
      data: null,
      message: "Flashcard removed successfully",
      error_code: "",
    });
  });

  // PUT /api/users/flashcards/:id/status - Update flashcard status
  updateFlashcardStatus = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.apiError("status is required", 400);
    }

    if (!["new", "learning", "mastered"].includes(status)) {
      return res.apiError(
        "status must be 'new', 'learning', or 'mastered'",
        400
      );
    }

    let flashcardObjectId;
    try {
      flashcardObjectId = new ObjectId(id);
    } catch (error) {
      return res.apiError("Invalid flashcard ID", 400);
    }

    // Find flashcard
    const flashcard = await flashcardModel.findById(flashcardObjectId);
    if (!flashcard) {
      return res.apiError("Flashcard not found", 404);
    }

    // Check ownership via flashcard group
    const flashcardGroup = await flashcardGroupModel.findByIdAndUserId(
      flashcard.flashcard_group_id,
      userId
    );

    if (!flashcardGroup) {
      return res.apiError("Flashcard not found", 404);
    }

    // Update status
    await flashcardModel.updateStatus(flashcardObjectId, status);

    res.apiSuccess({
      data: null,
      message: "Flashcard status updated successfully",
      error_code: "",
    });
  });

  // POST /api/users/flashcard_groups/sync_from_group_word/:group_word_id
  syncFromGroupWord = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { group_word_id } = req.params;

    let groupWordObjectId;
    try {
      groupWordObjectId = new ObjectId(group_word_id);
    } catch (error) {
      return res.apiError("Invalid group_word_id", 400);
    }

    // Check if group_word exists and belongs to user
    const groupWord = await groupWordModel.findByIdAndUserId(
      groupWordObjectId,
      userId
    );

    if (!groupWord) {
      return res.apiError("Group word not found", 404);
    }

    // Check if flashcard_group already exists for this group_word
    let flashcardGroup = await flashcardGroupModel.findBySource(
      "group_word",
      groupWordObjectId,
      userId
    );

    if (!flashcardGroup) {
      // Create new flashcard_group
      flashcardGroup = await flashcardGroupModel.create({
        user_id: userId,
        name: groupWord.name,
        description: `Synced from group word: ${groupWord.name}`,
        source_type: "group_word",
        source_id: groupWordObjectId,
      });

      // Create flashcards for all words in group_word
      const wordIds = groupWord.words || [];
      for (const wordId of wordIds) {
        const flashcard = await flashcardModel.create({
          flashcard_group_id: flashcardGroup._id,
          word_id: wordId,
        });

        // Add flashcard to group
        await flashcardGroupModel.addFlashcard(
          flashcardGroup._id,
          userId,
          flashcard._id
        );
      }
    } else {
      // Flashcard group exists, sync new words
      const existingFlashcards = await flashcardModel.findByGroupId(
        flashcardGroup._id
      );
      const existingWordIds = new Set(existingFlashcards.map((f) => f.word_id));

      const wordIds = groupWord.words || [];
      let addedCount = 0;

      for (const wordId of wordIds) {
        if (!existingWordIds.has(wordId)) {
          // Add new flashcard
          const flashcard = await flashcardModel.create({
            flashcard_group_id: flashcardGroup._id,
            word_id: wordId,
          });

          // Add flashcard to group
          await flashcardGroupModel.addFlashcard(
            flashcardGroup._id,
            userId,
            flashcard._id
          );

          addedCount++;
        }
      }

      // Update flashcard group name if changed
      if (flashcardGroup.name !== groupWord.name) {
        await flashcardGroupModel.update(flashcardGroup._id, userId, {
          name: groupWord.name,
        });
      }
    }

    // Get updated flashcard group with flashcards
    const updatedGroup = await flashcardGroupModel.findByIdAndUserId(
      flashcardGroup._id,
      userId
    );

    const flashcards = await flashcardModel.findByGroupId(flashcardGroup._id);

    // Get word details
    await wordModel.init();
    const wordIds = flashcards.map((f) => f.word_id);
    const words = await wordModel.collection
      .find({ _id: { $in: wordIds } })
      .toArray();

    const wordMap = {};
    words.forEach((word) => {
      wordMap[word._id] = word;
    });

    const flashcardsWithWords = flashcards.map((flashcard) => ({
      ...flashcard,
      word: wordMap[flashcard.word_id] || null,
    }));

    // Get stats
    const stats = await flashcardModel.getGroupStats(flashcardGroup._id);

    res.apiSuccess({
      data: {
        ...updatedGroup,
        flashcards: flashcardsWithWords,
        stats,
      },
      message: "Flashcard group synced successfully",
      error_code: "",
    });
  });
}

export default FlashcardController;
