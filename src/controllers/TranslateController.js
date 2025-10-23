import { BaseController } from "./BaseController.js";
import TranslateService from "../services/TranslateService.js";

class TranslateController extends BaseController {
  constructor(translateService = null) {
    super();
    this.translateService = translateService || new TranslateService();
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
}

export default TranslateController;
