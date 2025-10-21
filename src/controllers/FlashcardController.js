import { BaseController } from "./BaseController.js";
import FlashcardService from "../services/FlashcardService.js";

/**
 * FlashcardController
 * Handles flashcard (individual card) HTTP requests
 */
class FlashcardController extends BaseController {
  constructor(flashcardService = null) {
    super();
    this.flashcardService = flashcardService || new FlashcardService();
  }

  /**
   * POST /:group_id/flashcards - Add flashcard to group
   */
  addFlashcard = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { flashcard_group_id } = this.getParams(req);
    const { word_ids } = this.getBody(req);

    const result = await this.flashcardService.addFlashcard(userId, {
      flashcard_group_id: flashcard_group_id,
      word_ids,
    });
    return this.sendCreated(res, result);
  });

  /**
   * DELETE /:group_id/flashcards/:flashcard_id - Remove flashcard
   */
  removeFlashcard = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { flashcard_id } = this.getParams(req);

    const result = await this.flashcardService.removeFlashcard(
      flashcard_id,
      userId
    );
    return this.sendSuccess(res, result);
  });

  /**
   * POST /flashcards/:flashcard_id/review - Review flashcard
   */
  reviewFlashcard = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { flashcard_id } = this.getParams(req);
    const { action } = this.getBody(req);

    const result = await this.flashcardService.reviewFlashcard(
      flashcard_id,
      userId,
      action
    );
    return this.sendSuccess(res, result);
  });
}

export default FlashcardController;
