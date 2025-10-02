class TranslateController {
  constructor() {}

  // POST /api/translate
  async translate(req, res) {
    try {
      const body = req.body || {};
      const q = typeof body.text === "string" ? body.text.trim() : "";
      const context =
        typeof body.context === "string" ? body.context.trim() : "";
      const type = (body.type || "example").toString();

      if (!q) {
        const err = new Error("Missing text");
        err.status = 400;
        throw err;
      }

      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
      if (!OPENAI_KEY) {
        const err = new Error("Missing OPENAI_API_KEY in environment");
        err.status = 500;
        throw err;
      }

      // lazy import OpenAI to avoid module-level failure if package not installed
      let OpenAI;
      try {
        OpenAI = (await import("openai")).default;
      } catch (e) {
        const err = new Error("OpenAI SDK not available");
        err.status = 500;
        throw err;
      }
      const client = new OpenAI({ apiKey: OPENAI_KEY });

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

      const resp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
      });

      const raw = resp?.choices?.[0]?.message?.content?.trim?.() || "";

      if (type === "definition") {
        try {
          const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          const definition_vi = parsed.definition_vi || parsed.definition || "";
          const definition_vi_short = parsed.definition_vi_short || "";
          return res.apiSuccess(
            { data: { definition_vi, definition_vi_short } },
            200
          );
        } catch (err) {
          return res.apiError("Model did not return valid JSON", 500, { raw });
        }
      }

      return res.apiSuccess({ data: { translated: raw } }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const status =
        err && err.status && Number(err.status) >= 400
          ? Number(err.status)
          : 500;
      return res.apiError(
        msg,
        status,
        err && err.stack ? { stack: err.stack } : undefined
      );
    }
  }

  // POST /api/translate/bulk
  async translateBulk(req, res) {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const globalContext =
        typeof body.globalContext === "string" ? body.globalContext : undefined;

      if (!Array.isArray(items) || items.length === 0) {
        const err = new Error("Missing items");
        err.status = 400;
        throw err;
      }

      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
      if (!OPENAI_KEY) {
        const err = new Error("Missing OPENAI_API_KEY in environment");
        err.status = 500;
        throw err;
      }

      // lazy import OpenAI to avoid module-level failure if package not installed
      let OpenAI;
      try {
        OpenAI = (await import("openai")).default;
      } catch (e) {
        const err = new Error("OpenAI SDK not available");
        err.status = 500;
        throw err;
      }
      const client = new OpenAI({ apiKey: OPENAI_KEY });

      const systemPrompt =
        "Bạn là dịch giả chuyên nghiệp (English → Tiếng Việt). Dịch ngắn gọn, tự nhiên, dựa vào ngữ cảnh khi có. Chỉ trả về JSON như đã yêu cầu.";

      const listLines = items
        .map((it, idx) => {
          const ctx = it.context ? ` | context: ${it.context}` : "";
          return `${idx + 1}. id: ${it.id} | text: ${it.text}${ctx}`;
        })
        .join("\n");

      const instr = `Hãy dịch danh sách câu sau sang tiếng Việt. Nếu có ngữ cảnh thì ưu tiên áp dụng.\n${
        globalContext ? `Ngữ cảnh chung: ${globalContext}\n` : ""
      }\nDanh sách:\n${listLines}\n\nYêu cầu đầu ra: Trả về JSON array thuần với mỗi phần tử là {\"id\": string, \"vi\": string}. Không thêm bất kỳ ký tự nào ngoài JSON.`;

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

      return res.apiSuccess({ data }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const status =
        err && err.status && Number(err.status) >= 400
          ? Number(err.status)
          : 500;
      return res.apiError(
        msg,
        status,
        err && err.stack ? { stack: err.stack } : undefined
      );
    }
  }
}

export default TranslateController;
