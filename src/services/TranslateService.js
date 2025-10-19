import OpenAI from "openai";
import { BaseService } from "./BaseService.js";
import env from "../config/env.js";

/**
 * TranslateService
 * Handles translation using OpenAI API
 */
export class TranslateService extends BaseService {
  constructor(dependencies = {}) {
    super(null, dependencies); // No repository needed
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Translate text using OpenAI
   * @param {string} text - Text to translate
   * @param {Object} options - Translation options
   * @returns {Promise<Object>}
   */
  async translate(text, options = {}) {
    return this.execute(async () => {
      this.validateRequired({ text }, ["text"]);

      const {
        from = "en",
        to = "vi",
        context = "",
        model = "gpt-3.5-turbo",
      } = options;

      const systemPrompt = `You are a professional translator. Translate the following text from ${from} to ${to}. ${
        context ? `Context: ${context}` : ""
      }`;

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const translation = response.choices[0]?.message?.content || "";

      this.log("info", `Translated text: ${text.substring(0, 50)}...`);

      return {
        original: text,
        translation,
        from,
        to,
      };
    }, "translate");
  }

  /**
   * Bulk translate multiple texts
   * @param {Array<string>} texts - Texts to translate
   * @param {Object} options - Translation options
   * @returns {Promise<Array>}
   */
  async bulkTranslate(texts, options = {}) {
    return this.execute(async () => {
      this.validateRequired({ texts }, ["texts"]);

      if (!Array.isArray(texts) || texts.length === 0) {
        const error = new Error("texts must be a non-empty array");
        error.status = 400;
        throw error;
      }

      const {
        from = "en",
        to = "vi",
        context = "",
        model = "gpt-3.5-turbo",
      } = options;

      const systemPrompt = `You are a professional translator. Translate the following texts from ${from} to ${to}. ${
        context ? `Context: ${context}` : ""
      } Return the translations as a JSON array in the same order.`;

      const userPrompt = JSON.stringify(texts);

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const translationsText = response.choices[0]?.message?.content || "[]";
      let translations = [];

      try {
        translations = JSON.parse(translationsText);
      } catch (error) {
        this.log("error", `Failed to parse translations: ${error.message}`);
        translations = texts.map(() => ""); // Return empty translations on error
      }

      this.log("info", `Bulk translated ${texts.length} texts`);

      return texts.map((text, index) => ({
        original: text,
        translation: translations[index] || "",
        from,
        to,
      }));
    }, "bulkTranslate");
  }
}

export default TranslateService;

