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
      const processSenses = (sensesArray) => {
        sensesArray.forEach((sense) => {
          if (sense._id && sense.definition) {
            definitions.push({
              _id: sense._id,
              definition: sense.definition,
            });
          }
        });
      };

      // Process all sense types
      processSenses(senses);

      // Process phrasal verbs
      phrasal_verb_senses.forEach((pv) => {
        if (pv.senses && Array.isArray(pv.senses)) {
          processSenses(pv.senses);
        }
      });

      // Build compact user prompt - only definitions
      let userPrompt = `Context: ${word}${pos ? ` (${pos})` : ""}\n`;

      if (definitions.length > 0) {
        userPrompt += `\nDEFINITIONS:\n`;
        definitions.forEach((def, idx) => {
          userPrompt += `• [${def._id}] ${def.definition}\n`;
        });
      }

      if (idioms.length > 0) {
        userPrompt += `\nIDIOMS:\n`;
        idioms.forEach((idiom) => {
          if (idiom.word) {
            userPrompt += `- Context: ${idiom.word}:\n`;
          }

          if (idiom.senses && Array.isArray(idiom.senses)) {
            idiom.senses.forEach((sense) => {
              if (sense._id && sense.definition) {
                userPrompt += `• [${sense._id}] ${sense.definition}\n`;
              }
            });
          }
        });
      }

      // System prompt for definitions only
      const systemPrompt = `Bạn là dịch giả Anh–Việt chuyên nghiệp.
Dịch tự nhiên theo ngữ cảnh. Nếu nghĩa thuộc IDIOMS, phải dịch theo nghĩa thành ngữ.
Trả về JSON hợp lệ duy nhất, escape tất cả " \ \n \t và các ký tự đặc biệt trong chuỗi, không thêm markdown, không giải thích:
{
 "definitions": [{"_id": "...","definition_vi": "...","definition_vi_short": "..."}]
}
 _id: giữ nguyên từ dòng "• [id] ...";
definition_vi: bản dịch tự nhiên;
definition_vi_short: 3–4 nghĩa ngắn (từ/cụm từ, cách nhau dấu phẩy);`;

      // Log full prompt
      const fullPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      this.log("info", `Full prompt:\n${fullPrompt}`);

      // Call Google AI
      const resp = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 20000,
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

      // Robust JSON parsing
      let jsonText = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      // Remove problematic non-printable/control characters
      jsonText = jsonText.replace(/[\u0000-\u001F]+/g, "");

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
        `Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`
      );

      return {
        definitions: translatedDefinitions,
        usage,
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

      // Helper to process senses
      const processSenses = (sensesArray) => {
        sensesArray.forEach((sense) => {
          if (sense.examples && Array.isArray(sense.examples)) {
            const senseExamples = [];
            sense.examples.forEach((ex) => {
              if (ex._id && ex.en) {
                const exampleData = {
                  _id: ex._id,
                  text: ex.en,
                };
                senseExamples.push(exampleData);
              }
            });

            // Group examples by definition
            if (senseExamples.length > 0 && sense._id) {
              definitionExamplesMap.set(sense._id, {
                definition: sense.definition,
                examples: senseExamples,
              });
            }
          }
        });
      };

      // Process all sense types
      processSenses(senses);

      // Process phrasal verbs
      phrasal_verb_senses.forEach((pv) => {
        if (pv.senses && Array.isArray(pv.senses)) {
          processSenses(pv.senses);
        }
      });

      // Build compact user prompt - group examples by definition (same as translateBulk)
      let userPrompt = `Word: ${word}${pos ? ` (${pos})` : ""}\n`;
      if (definitionExamplesMap.size > 0) {
        userPrompt += `\nEXAMPLES (grouped by definition):\n`;

        let exampleIndex = 1;
        definitionExamplesMap.forEach((data, defId) => {
          userPrompt += `Context: ${data.definition}\n`;
          data.examples.forEach((ex) => {
            userPrompt += `• ${exampleIndex}. [${ex._id}] "${ex.text}"\n`;
            exampleIndex++;
          });
        });
      }

      if (idioms.length > 0) {
        userPrompt += `\nIDIOMS EXAMPLES(grouped by definition):\n`;

        idioms.forEach((idiom) => {
          let baseContext = "Context: ";
          if (idiom.word) {
            baseContext += `${idiom.word}: `;
          }

          if (Array.isArray(idiom.senses)) {
            idiom.senses.forEach((sense) => {
              let context = baseContext; // Reset context per sense
              if (sense._id && sense.definition) {
                context += sense.definition;
                userPrompt += `${context}\n`;

                if (Array.isArray(sense.examples)) {
                  sense.examples.forEach((ex) => {
                    if (ex._id && ex.en) {
                      userPrompt += `• [${ex._id}] "${ex.en}"\n`;
                    }
                  });
                }
              }
            });
          }
        });
      }

      // System prompt for examples only
      const systemPrompt = `Bạn là dịch giả Anh–Việt chuyên nghiệp.

Chỉ nhiệm vụ sau:
- Dịch tự nhiên (không word-by-word) các câu ví dụ bắt đầu bằng "•".
- Với IDIOMS EXAMPLES: dịch theo nghĩa thành ngữ.
- Mỗi dòng "•" có dạng: • [id] text → output giữ nguyên "_id" và dịch phần text.
- Không dịch / không trả về bất kỳ nội dung nào khác (word, definition, context…).
- Không tự tạo ví dụ; nếu không có dòng "•" thì không trả output.
- Trả về JSON hợp lệ duy nhất, escape tất cả " \ \n \t và các ký tự đặc biệt trong chuỗi, không markdown, không giải thích:
{
 "examples": [{"_id": "...", "vi": "..."}]
}
"vi": nghĩa tiếng Việt tự nhiên theo ngữ cảnh.`;

      // Log full prompt
      const fullPrompt = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
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
          maxOutputTokens: 20000,
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

      // Robust JSON parsing
      let jsonText = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      // Remove problematic non-printable/control characters
      jsonText = jsonText.replace(/[\u0000-\u001F]+/g, "");

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
        usage,
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
