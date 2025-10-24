import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read db.json
const dbPath = path.join(__dirname, "data", "db.json");
const wordData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

console.log("📖 Testing POST /api/translate/word");
console.log(`Word: ${wordData.word} (${wordData.pos})`);
console.log(`Senses: ${wordData.senses.length}`);
console.log(`Idioms: ${wordData.idioms.length}`);
console.log(`Phrasal verb senses: ${wordData.phrasal_verb_senses?.length || 0}`);

// Count total definitions and examples
let totalDefinitions = 0;
let totalExamples = 0;

wordData.senses.forEach((sense) => {
  if (sense.definition) totalDefinitions++;
  if (sense.examples) totalExamples += sense.examples.filter((ex) => ex.en && !ex.vi).length;
});

wordData.idioms.forEach((idiom) => {
  if (idiom.senses) {
    idiom.senses.forEach((sense) => {
      if (sense.definition) totalDefinitions++;
      if (sense.examples) totalExamples += sense.examples.filter((ex) => ex.en && !ex.vi).length;
    });
  }
});

if (wordData.phrasal_verb_senses) {
  wordData.phrasal_verb_senses.forEach((sense) => {
    if (sense.definition) totalDefinitions++;
    if (sense.examples) totalExamples += sense.examples.filter((ex) => ex.en && !ex.vi).length;
  });
}

console.log(`\n📊 Total to translate:`);
console.log(`  - Definitions: ${totalDefinitions}`);
console.log(`  - Examples (missing vi): ${totalExamples}`);

// Call API
const API_URL = "http://localhost:4000/api/translate/word";

console.log(`\n🚀 Calling ${API_URL}...`);

fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(wordData),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("\n✅ Response:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("\n❌ Error:");
    console.error(err.message);
  });

