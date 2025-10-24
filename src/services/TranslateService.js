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
   * Translate only definitions (no examples)
   * @param {Object} wordData - Word object with senses, idioms, phrasal_verb_senses
   * @returns {Promise<Object>} { definitions: [{_id, definition_vi, definition_vi_short}], usage }
   */
  async translateDefinitionsOnly(wordData) {
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

      // Collect all definitions (no examples)
      const definitions = [];

      // Helper to process senses
      const processSenses = (sensesArray, sourceType = "sense") => {
        sensesArray.forEach((sense) => {
          if (sense._id && sense.definition) {
            definitions.push({
              _id: sense._id,
              definition: sense.definition,
              context: sourceType === "idiom" ? `[idiom]` : "",
            });
          }
        });
      };

      // Process all sense types
      processSenses(senses, "sense");

      // Process idioms
      idioms.forEach((idiom) => {
        if (idiom.senses && Array.isArray(idiom.senses)) {
          processSenses(idiom.senses, "idiom");
        }
      });

      // Process phrasal verbs
      phrasal_verb_senses.forEach((pv) => {
        if (pv.senses && Array.isArray(pv.senses)) {
          processSenses(pv.senses, "phrasal verb");
        }
      });

      if (definitions.length === 0) {
        return {
          definitions: [],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
      }

      // Build compact user prompt - only definitions
      let userPrompt = `Word: ${word}${pos ? ` (${pos})` : ""}\n`;
      userPrompt += `DEFINITIONS:\n`;
      definitions.forEach((def, idx) => {
        userPrompt += `${idx + 1}. ${def.context ? `${def.context}: ` : ""}[${
          def._id
        }] ${def.definition}\n`;
      });

      // System prompt for definitions only
      const systemPrompt = `Bạn là dịch giả Anh–Việt chuyên nghiệp.
Dịch tự nhiên, rõ ràng theo ngữ cảnh.
Trả về JSON hợp lệ parse được bằng JSON.parse(), không thêm markdown, không giải thích:
{
 "definitions": [{"_id": "...","definition_vi": "...","definition_vi_short": "..."}]
}
definition_vi: bản dịch tự nhiên;
definition_vi_short: 3–4 nghĩa ngắn (từ/cụm từ, cách nhau dấu phẩy);`;

      // Log full prompt
      const fullPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      this.log(
        "info",
        `Translating definitions only: ${word}, ${definitions.length} definitions`
      );
      this.log("info", `Full prompt:\n${fullPrompt}`);

      // Call Google AI
      const resp = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 15000,
          temperature: 0.2,
        },
      });

      // Extract text content safely
      let content = "";
      try {
        const rawText = resp?.response?.text?.();
        if (typeof rawText === "string") {
          content = rawText.trim();
        } else if (rawText && typeof rawText.trim === "function") {
          content = rawText.trim();
        } else {
          content = String(rawText || "");
        }
      } catch (e) {
        content = String(resp?.response?.text || "");
      }

      this.log("info", `Google AI raw response:\n${content}`);

      // Extract usage information
      const usage = {
        prompt_tokens: resp?.response?.usageMetadata?.promptTokenCount || 0,
        completion_tokens:
          resp?.response?.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: resp?.response?.usageMetadata?.totalTokenCount || 0,
      };

      // Parse JSON response
      let jsonText = content;
      jsonText = jsonText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let result;
      try {
        result = JSON.parse(jsonText);
      } catch (e) {
        this.log("error", `Failed to parse response: ${e.message}`);
        this.log("error", `Raw response: ${content}`);
        const error = new Error("Invalid JSON response from Google AI");
        error.status = 500;
        error.raw = content;
        throw error;
      }

      const translatedDefinitions = result.definitions || [];

      this.log(
        "info",
        `Translated ${translatedDefinitions.length} definitions`
      );
      this.log(
        "info",
        `Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
      );

      return {
        definitions: translatedDefinitions,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    }, "translateDefinitionsOnly");
  }

  /**
   * Translate only examples (no definitions)
   * @param {Object} wordData - Word object with senses, idioms, phrasal_verb_senses
   * @returns {Promise<Object>} { examples: [{_id, vi}], usage }
   */
  async translateExamplesOnly(wordData) {
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

      // Collect all examples grouped by definition (same as translateBulk)
      const definitionExamplesMap = new Map(); // Map<definition_id, {definition, examples[]}>
      const allExamples = []; // Flat list for response

      // Helper to process senses
      const processSenses = (sensesArray, sourceType = "sense") => {
        sensesArray.forEach((sense) => {
          if (sense.examples && Array.isArray(sense.examples)) {
            const senseExamples = [];
            sense.examples.forEach((ex) => {
              if (ex._id && ex.en && !ex.vi) {
                const exampleData = {
                  _id: ex._id,
                  text: ex.en,
                };
                senseExamples.push(exampleData);
                allExamples.push(exampleData);
              }
            });

            // Group examples by definition
            if (senseExamples.length > 0 && sense._id) {
              definitionExamplesMap.set(sense._id, {
                definition: sense.definition,
                examples: senseExamples,
                context: sourceType === "idiom" ? `[idiom]` : "",
              });
            }
          }
        });
      };

      // Process all sense types
      processSenses(senses);

      // Process idioms
      idioms.forEach((idiom) => {
        if (idiom.senses && Array.isArray(idiom.senses)) {
          processSenses(idiom.senses, "idiom");
        }
      });

      // Process phrasal verbs
      phrasal_verb_senses.forEach((pv) => {
        if (pv.senses && Array.isArray(pv.senses)) {
          processSenses(pv.senses, "phrasal verb");
        }
      });

      if (allExamples.length === 0) {
        return {
          examples: [],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
      }

      // Build compact user prompt - group examples by definition (same as translateBulk)
      let userPrompt = `Word: ${word}${pos ? ` (${pos})` : ""}\n`;
      userPrompt += `EXAMPLES (grouped by definition):\n`;

      let exampleIndex = 1;
      definitionExamplesMap.forEach((data, defId) => {
        userPrompt += `${data.context ? `${data.context}: ` : ""}[${defId}] ${
          data.definition
        }\n`;
        data.examples.forEach((ex) => {
          userPrompt += `${exampleIndex}. [${ex._id}] "${ex.text}"\n`;
          exampleIndex++;
        });
      });

      // System prompt for examples only
      const systemPrompt = `Bạn là dịch giả Anh–Việt chuyên nghiệp.
Dịch tự nhiên, rõ ràng theo ngữ cảnh.
Trả về JSON hợp lệ parse được bằng JSON.parse(), không thêm markdown, không giải thích:
{
 "examples": [{"_id": "...","vi": "..."}]
}
vi: dịch ví dụ theo ngữ cảnh.`;

      // Log full prompt
      const fullPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      this.log(
        "info",
        `Translating examples only: ${word}, ${allExamples.length} examples`
      );
      this.log("info", `Full prompt:\n${fullPrompt}`);

      // Call Google AI
      const resp = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 15000,
          temperature: 0.2,
        },
      });

      // Extract text content safely
      let content = "";
      try {
        const rawText = resp?.response?.text?.();
        if (typeof rawText === "string") {
          content = rawText.trim();
        } else if (rawText && typeof rawText.trim === "function") {
          content = rawText.trim();
        } else {
          content = String(rawText || "");
        }
      } catch (e) {
        content = String(resp?.response?.text || "");
      }

      this.log("info", `Google AI raw response:\n${content}`);

      // Extract usage information
      const usage = {
        prompt_tokens: resp?.response?.usageMetadata?.promptTokenCount || 0,
        completion_tokens:
          resp?.response?.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: resp?.response?.usageMetadata?.totalTokenCount || 0,
      };

      // Parse JSON response
      let jsonText = content;
      jsonText = jsonText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let result;
      try {
        result = JSON.parse(jsonText);
      } catch (e) {
        this.log("error", `Failed to parse response: ${e.message}`);
        this.log("error", `Raw response: ${content}`);
        const error = new Error("Invalid JSON response from Google AI");
        error.status = 500;
        error.raw = content;
        throw error;
      }

      const translatedExamples = result.examples || [];

      this.log("info", `Translated ${translatedExamples.length} examples`);
      this.log(
        "info",
        `Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
      );

      return {
        examples: translatedExamples,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    }, "translateExamplesOnly");
  }

  /**
   * Translate definitions and examples in parallel (2 API calls simultaneously)
   * @param {Object} wordData - Word object with senses, idioms, phrasal_verb_senses
   * @returns {Promise<Object>} { definitions, examples, usage }
   */
  async translateParallel(wordData) {
    return this.execute(async () => {
      // Validate input
      if (!wordData || typeof wordData !== "object") {
        const error = new Error("Missing word data");
        error.status = 400;
        throw error;
      }

      const { word } = wordData;

      if (!word) {
        const error = new Error("Missing word field");
        error.status = 400;
        throw error;
      }

      this.log("info", `Translating in parallel: ${word}`);

      // Call both APIs in parallel
      const [defResult, exResult] = await Promise.all([
        this.translateDefinitionsOnly(wordData),
        this.translateExamplesOnly(wordData),
      ]);

      // Combine usage stats
      const combinedUsage = {
        prompt_tokens:
          defResult.usage.prompt_tokens + exResult.usage.prompt_tokens,
        completion_tokens:
          defResult.usage.completion_tokens + exResult.usage.completion_tokens,
        total_tokens:
          defResult.usage.total_tokens + exResult.usage.total_tokens,
      };

      return {
        definitions: defResult.definitions,
        examples: exResult.examples,
        usage: combinedUsage,
      };
    }, "translateParallel");
  }
}

export default TranslateService;
