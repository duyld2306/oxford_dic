import { BaseController } from "./BaseController.js";
import FlashcardGroupService from "../services/FlashcardGroupService.js";

/**
 * FlashcardGroupController
 * Handles flashcard group HTTP requests
 */
class FlashcardGroupController extends BaseController {
  constructor(flashcardGroupService = null) {
    super();
    this.flashcardGroupService =
      flashcardGroupService || new FlashcardGroupService();
  }

  /**
   * GET / - Get all flashcard groups
   */
  getFlashcardGroups = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const groups = await this.flashcardGroupService.getFlashcardGroups(userId);
    return this.sendSuccess(res, groups);
  });

  /**
   * GET /:id - Get flashcard group details
   */
  getFlashcardGroupById = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);

    const group = await this.flashcardGroupService.getFlashcardGroup(
      id,
      userId
    );
    return this.sendSuccess(res, group);
  });

  /**
   * POST / - Create new flashcard group
   */
  createFlashcardGroup = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const data = this.getBody(req);

    const group = await this.flashcardGroupService.createFlashcardGroup(
      userId,
      data
    );
    return this.sendCreated(res, group);
  });

  /**
   * PUT /:id - Update flashcard group
   */
  updateFlashcardGroup = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const updates = this.getBody(req);

    const result = await this.flashcardGroupService.updateFlashcardGroup(
      id,
      userId,
      updates
    );
    return this.sendSuccess(res, result);
  });

  /**
   * DELETE /:id - Delete flashcard group
   */
  deleteFlashcardGroup = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);

    const result = await this.flashcardGroupService.deleteFlashcardGroup(
      id,
      userId
    );
    return this.sendSuccess(res, result);
  });

  /**
   * POST /sync - Sync flashcards from group word
   */
  syncFromGroupWord = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { group_word_id } = this.getBody(req);

    const result = await this.flashcardGroupService.syncFromGroupWord(
      userId,
      group_word_id
    );
    return this.sendSuccess(res, result);
  });
}

export default FlashcardGroupController;
