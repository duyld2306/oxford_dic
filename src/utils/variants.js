function normalizeKey(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/[^a-zA-Z\s-]+/g, "") // ❌ loại bỏ mọi ký tự KHÔNG phải chữ; giữ nguyên khoảng trắng, '-'
    .replace(/-/g, " ") // ✅ thay mọi '-' thành ' '
    .replace(/\s+/g, " ") // ✅ gom nhiều khoảng trắng liên tiếp thành 1
    .toLowerCase() // ✅ viết thường
    .trim(); // ✅ bỏ khoảng trắng đầu/cuối
}

function buildTopSymbolFromPages(pages) {
  const SYMBOL_ORDER = ["a1", "a2", "b1", "b2", "c1"];
  if (!Array.isArray(pages)) return "";
  const collected = pages
    .map((p) => (p && typeof p.symbol === "string" ? p.symbol.trim() : ""))
    .filter((s) => s !== "");
  if (collected.length === 0) return "";
  for (const s of SYMBOL_ORDER) {
    if (collected.includes(s)) return s;
  }
  return collected[0] || "";
}

function buildPartsOfSpeechFromPages(pages) {
  if (!Array.isArray(pages)) return [];
  const partsOfSpeech = pages
    .map((p) => (p && typeof p.pos === "string" ? p.pos.trim() : ""))
    .filter((s) => s !== "");
  return Array.from(new Set(partsOfSpeech)).sort();
}

export { normalizeKey, buildTopSymbolFromPages, buildPartsOfSpeechFromPages };
