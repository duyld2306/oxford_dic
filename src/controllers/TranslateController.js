import { BaseController } from "./BaseController.js";
import TranslateService from "../services/TranslateService.js";
import WordService from "../services/WordService.js";

class TranslateController extends BaseController {
  constructor(translateService = null, wordService = null) {
    super();
    this.translateService = translateService || new TranslateService();
    this.wordService = wordService || new WordService();
  }

  // POST /api/translate/definition - Translate only definitions
  translateDefinition = this.asyncHandler(async (req, res) => {
    const wordData = this.getBody(req);

    try {
      // Translate only definitions
      const { definitions, usage } =
        await this.translateService.translateDefinitionsOnly(wordData);

      // Update definitions in DB
      let definitionsResult = { updated: 0, skipped: 0 };
      if (definitions && definitions.length > 0) {
        definitionsResult = await this.wordService.updateSenseDefinitions(
          definitions
        );
      }

      // Return summary with token usage
      return this.sendSuccess(res, {
        word: wordData.word,
        definitions,
        result: definitionsResult,
        usage,
      });
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/translate/example - Translate only examples
  translateExample = this.asyncHandler(async (req, res) => {
    const wordData = this.getBody(req);

    try {
      // Translate only examples
      const { examples, usage } =
        await this.translateService.translateExamplesOnly(wordData);

      // Update examples in DB
      let examplesResult = { updated: 0, skipped: 0 };
      if (examples && examples.length > 0) {
        examplesResult = await this.wordService.updateExampleViIfMissing(
          examples
        );
      }

      // Return summary with token usage
      return this.sendSuccess(res, {
        word: wordData.word,
        examples,
        result: examplesResult,
        usage,
      });
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/translate/parallel - Translate definitions and examples in parallel
  translateParallel = this.asyncHandler(async (req, res) => {
    const wordData = this.getBody(req);

    try {
      const { definitions, examples, usage } =
        await this.translateService.translateParallel(wordData);

      // Update definitions
      let definitionsResult = { updated: 0, skipped: 0 };
      if (definitions && definitions.length > 0) {
        definitionsResult = await this.wordService.updateSenseDefinitions(
          definitions
        );
      }

      // Update examples
      let examplesResult = { updated: 0, skipped: 0 };
      if (examples && examples.length > 0) {
        examplesResult = await this.wordService.updateExampleViIfMissing(
          examples
        );
      }

      return this.sendSuccess(res, {
        word: wordData.word,
        definitions,
        examples,
        result: {
          definition: definitionsResult,
          example: examplesResult,
        },
        usage,
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
