import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import { BaseService } from "./BaseService.js";
import { WordRepository } from "../repositories/WordRepository.js";
import {
  buildTopSymbolFromPages,
  buildPartsOfSpeechFromPages,
  buildVariantsFromPages,
} from "../utils/variants.js";

class ImportService extends BaseService {
  constructor(wordRepository = null, dependencies = {}) {
    super(wordRepository || new WordRepository(), dependencies);
  }

  // Normalize word to group similar words (e.g., -ability, ability-, ability -> ability)
  normalizeWord(word) {
    if (!word || typeof word !== "string") return "";
    return word
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .trim();
  }

  // Đệ quy thêm _id cho mọi object con trong wordData
  addMissingIdsRecursively(obj, visited = new Set()) {
    if (!obj || typeof obj !== "object") return;
    if (visited.has(obj)) return; // Ngăn lặp vô hạn với object tham chiếu lặp
    visited.add(obj);

    // Chỉ thêm _id cho object là dữ liệu từ điển (bỏ qua các object rỗng, các trường đặc biệt)
    if (!Array.isArray(obj) && !obj._id) obj._id = new ObjectId();

    // Các trường không cần đệ quy vào (chỉ là dữ liệu phụ, không phải object từ điển)
    const skipKeys = [
      "variants",
      "parts_of_speech",
      "synonyms",
      "opposites",
      "see_alsos",
      "labels",
      "cf",
      "grammar",
      "definition",
      "en",
      "vi",
      "word",
      "pos",
      "symbol",
      "phonetic",
      "phonetic_text",
      "phonetic_am",
      "phonetic_am_text",
      "createdAt",
      "updatedAt",
      "source",
      "examples",
      "dis_g",
      "score",
      "count",
      "data",
      "idioms",
      "phrasal_verb_senses",
      "phrasal_verbs",
      "senses",
      "_id",
    ];

    for (const key of Object.keys(obj)) {
      if (skipKeys.includes(key)) continue;
      const value = obj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          this.addMissingIdsRecursively(item, visited);
        }
      } else if (value && typeof value === "object") {
        this.addMissingIdsRecursively(value, visited);
      }
    }
    // Luôn đệ quy vào các mảng đặc biệt (senses, idioms, examples)
    for (const arrKey of ["senses", "idioms", "examples"]) {
      if (Array.isArray(obj[arrKey])) {
        for (const item of obj[arrKey]) {
          this.addMissingIdsRecursively(item, visited);
        }
      }
    }
  }

  // Group words by their normalized form
  groupWordsByNormalizedForm(words) {
    const groups = {};

    for (const wordData of words) {
      if (!wordData || !wordData.word) continue;

      const normalized = this.normalizeWord(wordData.word);
      if (!normalized) continue;

      if (!groups[normalized]) {
        groups[normalized] = [];
      }

      // Đệ quy thêm _id cho mọi object con
      this.addMissingIdsRecursively(wordData);

      groups[normalized].push(wordData);
    }

    return groups;
  }

  // Import data from JSON file and save to database
  async importJsonData(filePath) {
    return this.execute(async () => {
      await this.repository.init();

      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, "utf8");
      const words = JSON.parse(fileContent);

      if (!Array.isArray(words)) {
        throw new Error("JSON file must contain an array of word objects");
      }

      this.log("info", `Importing ${words.length} words from ${filePath}`);

      // Group words by normalized form
      const groupedWords = this.groupWordsByNormalizedForm(words);

      const results = {
        totalWords: words.length,
        groupedWords: Object.keys(groupedWords).length,
        imported: 0,
        errors: [],
      };

      // Save each group to database
      for (const [normalizedWord, wordDataRaw] of Object.entries(
        groupedWords
      )) {
        try {
          const nowIso = new Date().toISOString();

          const wordData = wordDataRaw.map((entry) => ({
            ...entry,
            phrasal_verb_senses: [],
            isTranslated: false, // Add isTranslated flag
          }));

          // Check if word already exists
          const existingWord = await this.repository.collection.findOne({
            _id: normalizedWord,
          });

          if (existingWord) {
            // Word exists, merge new data with existing data
            const existingData = existingWord.data || [];
            const existingWordTexts = new Set(
              existingData.map((item) => item.word)
            );

            // Only add new word entries that don't already exist
            const newWordData = wordData.filter(
              (item) => !existingWordTexts.has(item.word)
            );

            if (newWordData.length > 0) {
              // Compute merged data to determine top symbol and parts_of_speech
              const mergedData = existingData.concat(newWordData);
              const variants = buildVariantsFromPages(mergedData);
              const topSymbol = buildTopSymbolFromPages(mergedData);
              const partsOfSpeech = buildPartsOfSpeechFromPages(mergedData);

              await this.repository.collection.updateOne(
                { _id: normalizedWord },
                {
                  $push: { data: { $each: newWordData } },
                  $set: {
                    updatedAt: nowIso,
                    variants,
                    symbol: topSymbol, // always set symbol (may be empty string)
                    parts_of_speech: partsOfSpeech,
                  },
                }
              );
              results.imported++;
              this.log(
                "info",
                `Merged ${newWordData.length} new entries for word: ${normalizedWord}`
              );
            } else {
              this.log(
                "info",
                `Skipped word: ${normalizedWord} (no new entries)`
              );
            }
          } else {
            // Word doesn't exist, create new entry
            // Compute symbol and parts_of_speech from the incoming wordData
            const variants = buildVariantsFromPages(wordData);
            const topSymbol = buildTopSymbolFromPages(wordData);
            const partsOfSpeech = buildPartsOfSpeechFromPages(wordData);

            await this.repository.collection.updateOne(
              { _id: normalizedWord },
              {
                $set: {
                  data: wordData,
                  updatedAt: nowIso,
                  variants,
                  symbol: topSymbol,
                  parts_of_speech: partsOfSpeech,
                },
                $setOnInsert: {
                  createdAt: nowIso,
                },
              },
              { upsert: true }
            );
            results.imported++;
            this.log(
              "info",
              `Created new word: ${normalizedWord} with ${wordData.length} entries`
            );
          }
        } catch (error) {
          results.errors.push({
            word: normalizedWord,
            error: error.message,
          });
          this.log(
            "error",
            `Error processing word ${normalizedWord}: ${error.message}`
          );
        }
      }

      this.log(
        "info",
        `Import completed: ${results.imported}/${results.groupedWords} words imported`
      );
      return results;
    }, "importJsonData");
  }

  // Import multiple JSON files (a.json, b.json, etc.)
  async importMultipleJsonFiles(directoryPath = "./src/mock") {
    return this.execute(async () => {
      await this.repository.init();

      const results = {
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: [],
        totalWords: 0,
        totalGroupedWords: 0,
        totalImported: 0,
        allErrors: [],
      };

      // Get all JSON files in directory
      const files = fs
        .readdirSync(directoryPath)
        .filter((file) => file.endsWith(".json"))
        .sort();

      results.totalFiles = files.length;
      this.log("info", `Found ${files.length} JSON files in ${directoryPath}`);

      for (const file of files) {
        try {
          const filePath = path.join(directoryPath, file);
          const fileResult = await this.importJsonData(filePath);

          results.successfulFiles++;
          results.totalWords += fileResult.totalWords;
          results.totalGroupedWords += fileResult.groupedWords;
          results.totalImported += fileResult.imported;
          results.allErrors.push(...fileResult.errors);

          this.log(
            "info",
            `Imported ${file}: ${fileResult.imported}/${fileResult.totalWords} words grouped into ${fileResult.groupedWords} entries`
          );
        } catch (error) {
          results.failedFiles.push({
            file,
            error: error.message,
          });
          this.log("error", `Failed to import ${file}: ${error.message}`);
        }
      }

      this.log(
        "info",
        `Batch import completed: ${results.successfulFiles}/${results.totalFiles} files imported`
      );
      return results;
    }, "importMultipleJsonFiles");
  }
}

export default ImportService;
