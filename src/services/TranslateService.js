import { BaseService } from "./BaseService.js";

/**
 * TranslateService
 * Handles translation using Google AI Studio (Gemini API)
 * Matches TranslateControllerTemp.js logic
 */
export class TranslateService extends BaseService {
  constructor(dependencies = {}) {
    super(null, dependencies); // No repository needed
  }

  /**
   * Translate entire word object (definitions + examples) in one API call
   * @param {Object} wordData - Word object with senses, idioms, phrasal_verb_senses
   * @returns {Promise<Object>} { definitions: [{_id, definition_vi, definition_vi_short}], examples: [{_id, vi}] }
   */
  async translateWordBulk(wordData) {
    return this.execute(async () => {
      // Validate input
      if (!wordData || typeof wordData !== "object") {
        const error = new Error("Missing word data");
        error.status = 400;
        throw error;
      }

      const {
        word,
        pos,
        senses = [],
        idioms = [],
        phrasal_verb_senses = [],
      } = wordData;

      if (!word) {
        const error = new Error("Missing word field");
        error.status = 400;
        throw error;
      }

      // Get Google AI config
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      const MODEL = process.env.GOOGLE_MODEL;

      if (!GOOGLE_API_KEY) {
        const error = new Error("Missing GOOGLE_API_KEY in environment");
        error.status = 500;
        throw error;
      }

      // Lazy import Google AI SDK
      let GoogleGenerativeAI;
      try {
        GoogleGenerativeAI = (await import("@google/generative-ai"))
          .GoogleGenerativeAI;
      } catch (e) {
        const error = new Error("Google AI SDK not available");
        error.status = 500;
        throw error;
      }

      const client = new GoogleGenerativeAI(GOOGLE_API_KEY);
      const model = client.getGenerativeModel(
        { model: MODEL },
        { apiVersion: "v1" }
      );

      // Collect all definitions and examples (grouped by definition)
      const definitions = [];
      const definitionExamplesMap = new Map(); // Map<definition_id, examples[]>

      // Helper to process senses
      const processSenses = (sensesArray, sourceType = "sense") => {
        sensesArray.forEach((sense) => {
          if (sense._id && sense.definition) {
            definitions.push({
              _id: sense._id,
              definition: sense.definition,
              context: `${word} (${pos || sourceType})`,
            });

            // Process examples for this sense
            const senseExamples = [];
            if (sense.examples && Array.isArray(sense.examples)) {
              sense.examples.forEach((ex) => {
                if (ex._id && ex.en && !ex.vi) {
                  senseExamples.push({
                    _id: ex._id,
                    text: ex.en,
                  });
                }
              });
            }

            // Store examples grouped by definition
            if (senseExamples.length > 0) {
              definitionExamplesMap.set(sense._id, senseExamples);
            }
          }
        });
      };

      // Process main senses
      processSenses(senses, "sense");

      // Process idioms
      idioms.forEach((idiom) => {
        if (idiom.senses && Array.isArray(idiom.senses)) {
          processSenses(idiom.senses, "idiom");
        }
      });

      // Process phrasal_verb_senses
      processSenses(phrasal_verb_senses, "phrasal_verb");

      // If nothing to translate, return empty
      if (definitions.length === 0 && definitionExamplesMap.size === 0) {
        return {
          definitions: [],
          examples: [],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
      }

      // Build optimized prompt
      const systemPrompt = `Bạn là dịch giả Anh–Việt chuyên nghiệp.
Dịch tự nhiên, rõ ràng theo ngữ cảnh.
Trả về JSON hợp lệ:
{
 "definitions": [{"_id": "...","definition_vi": "...","definition_vi_short": "..."}],
 "examples": [{"_id": "...","vi": "..."}]
}
definition_vi: bản dịch tự nhiên;
definition_vi_short: 3–4 nghĩa ngắn (từ/cụm từ, cách nhau dấu phẩy);
vi: dịch ví dụ theo ngữ cảnh.
Chỉ trả JSON, không chú thích.`;

      // Build compact user prompt - group examples by definition
      let userPrompt = `Word: ${word}${pos ? ` (${pos})` : ""}\n\n`;

      if (definitions.length > 0) {
        userPrompt += `DEFINITIONS:\n`;
        definitions.forEach((def, idx) => {
          userPrompt += `${idx + 1}. [${def._id}] ${def.definition}\n`;

          // Add examples for this definition
          const defExamples = definitionExamplesMap.get(def._id);
          if (defExamples && defExamples.length > 0) {
            defExamples.forEach((ex) => {
              userPrompt += `   - [${ex._id}] "${ex.text}"\n`;
            });
          }
        });
      }

      // Count total examples
      let totalExamples = 0;
      definitionExamplesMap.forEach((exs) => {
        totalExamples += exs.length;
      });

      // Log full prompt
      const fullPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      this.log(
        "info",
        `Translating word: ${word}, ${definitions.length} definitions, ${totalExamples} examples`
      );
      this.log("info", `Full prompt:\n${fullPrompt}`);

      // Call Google AI API
      const resp = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }, { text: userPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.3,
        },
      });

      const content =
        resp?.response?.text?.()?.trim?.() || resp?.response?.text || "";

      // Log raw response from Google AI
      this.log("info", `Google AI raw response:\n${content}`);

      // Extract usage information from response
      const usage = {
        prompt_tokens: resp?.response?.usageMetadata?.promptTokenCount || 0,
        completion_tokens:
          resp?.response?.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: resp?.response?.usageMetadata?.totalTokenCount || 0,
      };

      // Parse JSON response
      let jsonText = content.trim();
      // Remove markdown code blocks if present
      jsonText = jsonText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let result;
      try {
        result = JSON.parse(jsonText);
      } catch (e) {
        this.log("error", `Failed to parse Google AI response: ${e.message}`);
        this.log("error", `Raw response: ${content}`);
        const error = new Error("Invalid JSON response from Google AI");
        error.status = 500;
        error.raw = content;
        throw error;
      }

      // Log parsed result
      this.log("info", `Parsed result:\n${JSON.stringify(result, null, 2)}`);

      // Validate and return
      const translatedDefinitions = result.definitions || [];
      const translatedExamples = result.examples || [];

      this.log(
        "info",
        `Translated ${translatedDefinitions.length} definitions, ${translatedExamples.length} examples`
      );
      this.log(
        "info",
        `Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
      );

      return {
        definitions: translatedDefinitions,
        examples: translatedExamples,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    }, "translateWordBulk");
  }
}

export default TranslateService;
