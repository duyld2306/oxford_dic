import { BaseController } from "./BaseController.js";
import TranslateService from "../services/TranslateService.js";

class TranslateController extends BaseController {
  constructor(translateService = null) {
    super();
    this.translateService = translateService || new TranslateService();
  }

  // POST /api/translate
  translate = this.asyncHandler(async (req, res) => {
    const { text, context, type = "example" } = this.getBody(req);

    try {
      const result = await this.translateService.translate(text.trim(), {
        context: context?.trim() || "",
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
    const { texts, context, type = "example" } = this.getBody(req);

    try {
      const result = await this.translateService.bulkTranslate(texts, {
        context: context?.trim() || "",
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
}

export default TranslateController;
