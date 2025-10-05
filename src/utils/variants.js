// Utility helpers for building and normalizing variants
function escapeString(s) {
  return String(s || "");
}

function normalizeKey(s) {
  return escapeString(s).replace(/\s+/g, " ").toLowerCase();
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
    if (p && p.word) raw.push(p.word);
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
