import { BaseService } from "./BaseService.js";

/**
 * TranslateService
 * Handles translation using OpenAI API
 * Matches TranslateControllerTemp.js logic
 */
export class TranslateService extends BaseService {
  constructor(dependencies = {}) {
    super(null, dependencies); // No repository needed
  }

  /**
   * Translate text using OpenAI
   * @param {string} q - Text to translate
   * @param {Object} options - Translation options { context, type }
   * @returns {Promise<Object>}
   */
  async translate(q, options = {}) {
    return this.execute(async () => {
      // Validate input
      if (!q || typeof q !== "string") {
        const error = new Error("Missing text");
        error.status = 400;
        throw error;
      }

      const { context = "", type = "example" } = options;

      // Get OpenAI config
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      if (!OPENAI_KEY) {
        const error = new Error("Missing OPENAI_API_KEY in environment");
        error.status = 500;
        throw error;
      }

      // Lazy import OpenAI to avoid module-level failure if package not installed
      let OpenAI;
      try {
        OpenAI = (await import("openai")).default;
      } catch (e) {
        const error = new Error("OpenAI SDK not available");
        error.status = 500;
        throw error;
      }

      const client = new OpenAI({ apiKey: OPENAI_KEY });

      // Build prompts based on type
      const defaultSystemPrompt =
        "Bạn là dịch giả chuyên nghiệp (English → Tiếng Việt). Hãy dịch tự nhiên, rõ ràng, dựa vào ngữ cảnh. Chỉ trả về bản dịch tiếng Việt.";

      const systemPrompt =
        type === "definition"
          ? `\nBạn là dịch giả chuyên nghiệp (English → Tiếng Việt).\nNhiệm vụ: dịch và tóm tắt nghĩa từ điển.\nTrả về kết quả dưới dạng JSON với 2 khóa:\n- definition_vi: bản dịch đầy đủ, tự nhiên, rõ ràng theo ngữ cảnh.\n- definition_vi_short: 3–4 nghĩa ngắn gọn (dạng từ/cụm từ) của từ/cụm từ, viết tiếng Việt. Các nghĩa ngăn cách nhau bằng dấu phẩy (,)\nChỉ trả về JSON hợp lệ, không giải thích thêm.\n`
          : defaultSystemPrompt;

      const userPrompt =
        type === "definition"
          ? `\nCâu gốc: ${q}\nNgữ cảnh: ${context}\n\nHãy dịch và tóm tắt theo yêu cầu.\n`
          : `Câu gốc: ${q}${
              context ? `\nNgữ cảnh: ${context}` : ""
            }\n\nHãy dịch sang tiếng Việt tự nhiên.`;

      // Call OpenAI API
      const resp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
      });

      const raw = resp?.choices?.[0]?.message?.content?.trim?.() || "";

      // Handle response based on type
      if (type === "definition") {
        try {
          const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          const definition_vi = parsed.definition_vi || parsed.definition || "";
          const definition_vi_short = parsed.definition_vi_short || "";
          return { definition_vi, definition_vi_short };
        } catch (err) {
          const error = new Error("Model did not return valid JSON");
          error.status = 500;
          error.raw = raw;
          throw error;
        }
      }

      return { translated: raw };
    }, "translate");
  }

  /**
   * Bulk translate multiple items
   * @param {Array<Object>} items - Items to translate { _id, text, context? }
   * @param {Object} options - Translation options { globalContext? }
   * @returns {Promise<Array>}
   */
  async bulkTranslate(items, options = {}) {
    return this.execute(async () => {
      // Validate input
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("Missing items");
        error.status = 400;
        throw error;
      }

      const { globalContext } = options;

      // Get OpenAI config
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      if (!OPENAI_KEY) {
        const error = new Error("Missing OPENAI_API_KEY in environment");
        error.status = 500;
        throw error;
      }

      // Lazy import OpenAI to avoid module-level failure if package not installed
      let OpenAI;
      try {
        OpenAI = (await import("openai")).default;
      } catch (e) {
        const error = new Error("OpenAI SDK not available");
        error.status = 500;
        throw error;
      }

      const client = new OpenAI({ apiKey: OPENAI_KEY });

      // Build system and user prompts
      const systemPrompt =
        "Bạn là dịch giả chuyên nghiệp (English → Tiếng Việt). Dịch ngắn gọn, tự nhiên, dựa vào ngữ cảnh khi có. Chỉ trả về JSON như đã yêu cầu.";

      const listLines = items
        .map((it, idx) => {
          const ctx = it.context ? ` | context: ${it.context}` : "";
          return `${idx + 1}. _id: ${it._id} | text: ${it.text}${ctx}`;
        })
        .join("\n");

      const instr = `Hãy dịch danh sách câu sau sang tiếng Việt. Nếu có ngữ cảnh thì ưu tiên áp dụng.\n${
        globalContext ? `Ngữ cảnh chung: ${globalContext}\n` : ""
      }\nDanh sách:\n${listLines}\n\nYêu cầu đầu ra: Trả về JSON array thuần với mỗi phần tử là {\"_id\": string, \"vi\": string}. Không thêm bất kỳ ký tự nào ngoài JSON.`;

      // Call OpenAI API
      const resp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: instr },
        ],
        max_tokens: 2000,
      });

      const content = resp?.choices?.[0]?.message?.content || "";
      let jsonText = content.trim();
      const match = jsonText.match(/\[([\s\S]*?)\]/);
      if (match) jsonText = match[0];

      let data = [];
      try {
        data = JSON.parse(jsonText);
      } catch (e) {
        data = [];
      }

      return data;
    }, "bulkTranslate");
  }
}

export default TranslateService;
