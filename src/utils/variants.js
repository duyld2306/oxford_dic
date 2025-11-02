function normalizeKey(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/[^a-zA-Z\s-]+/g, "") // ❌ loại bỏ mọi ký tự KHÔNG phải chữ; giữ nguyên khoảng trắng, '-'
    .replace(/-{2,}/g, "-") // ✅ gộp nhiều dấu '-' liên tiếp thành một
    .replace(/^-+|-+$/g, "") // ✅ bỏ '-' ở đầu hoặc cuối
    .replace(/\s+/g, " ") // ✅ chuẩn hóa khoảng trắng
    .toLowerCase() // ✅ viết thường
    .trim(); // ✅ bỏ khoảng trắng đầu/cuối
}

function appendCounterpart(s) {
  if (!s || typeof s !== "string") return null;
  if (s.includes("-")) return s.replace(/-/g, " ");
  if (s.includes(" ")) return s.replace(/\s+/g, "-");
  return null;
}

function buildVariantsFromPages(pages) {
  const raw = [];
  if (!Array.isArray(pages)) return raw;
  for (const p of pages) {
    if (p && p.word) {
      const cleaned = normalizeKey(p.word);
      if (cleaned) raw.push(cleaned);
    }
  }
  // dedupe preserving order
  const uniq = [];
  for (const v of raw) if (!uniq.includes(v)) uniq.push(v);
  const final = [...uniq];
  for (const v of uniq) {
    const cp = appendCounterpart(v);
    if (cp && !final.includes(cp)) final.push(cp);
  }
  return final;
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

export {
  normalizeKey,
  buildVariantsFromPages,
  appendCounterpart,
  buildTopSymbolFromPages,
  buildPartsOfSpeechFromPages,
};
