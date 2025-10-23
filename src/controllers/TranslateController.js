import { BaseController } from "./BaseController.js";
import TranslateService from "../services/TranslateService.js";
import WordService from "../services/WordService.js";

class TranslateController extends BaseController {
  constructor(translateService = null, wordService = null) {
    super();
    this.translateService = translateService || new TranslateService();
    this.wordService = wordService || new WordService();
  }

  // POST /api/translate
  translate = this.asyncHandler(async (req, res) => {
    const body = req.body || {};
    const q = typeof body.text === "string" ? body.text.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    const type = (body.type || "example").toString();

    try {
      const result = await this.translateService.translate(q, {
        context,
        type,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/translate/bulk
  translateBulk = this.asyncHandler(async (req, res) => {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const globalContext =
      typeof body.globalContext === "string" ? body.globalContext : undefined;

    try {
      const result = await this.translateService.bulkTranslate(items, {
        globalContext,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/translate/word
  translateWord = this.asyncHandler(async (req, res) => {
    const wordData = this.getBody(req);

    try {
      // Step 1: Translate all definitions and examples in one API call
      const { definitions, examples, usage } =
        await this.translateService.translateWordBulk(wordData);

      // Step 2: Update definitions in DB
      let definitionsResult = { updated: 0, skipped: 0 };
      if (definitions && definitions.length > 0) {
        definitionsResult = await this.wordService.updateSenseDefinitions(
          definitions
        );
      }

      // Step 3: Update examples in DB
      let examplesResult = { updated: 0, skipped: 0 };
      if (examples && examples.length > 0) {
        examplesResult = await this.wordService.updateExampleViIfMissing(
          examples
        );
      }

      // Step 4: Set isTranslated = true for this data entry
      let isTranslatedResult = null;
      if (wordData._id) {
        try {
          isTranslatedResult = await this.wordService.updateIsTranslated(
            wordData._id,
            true
          );
        } catch (error) {
          // Log error but don't fail the whole request
          console.error("Failed to update isTranslated:", error.message);
        }
      }

      // Return summary with token usage
      return this.sendSuccess(res, {
        word: wordData.word,
        definitions: definitionsResult,
        examples: examplesResult,
        total_definitions: definitions.length,
        total_examples: examples.length,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        isTranslated: isTranslatedResult
          ? isTranslatedResult.success
          : undefined,
      });
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });
}

export default TranslateController;
