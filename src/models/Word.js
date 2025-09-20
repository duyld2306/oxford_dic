import { ObjectId } from "mongodb";
import database from "../config/database.js";

class WordModel {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.getCollection();
    }
  }

  // Get word by exact match
  async findByWord(word) {
    await this.init();
    const key = String(word || "").toLowerCase();

    const doc = await this.collection.findOne(
      { _id: key },
      { projection: { data: 1, createdAt: 1, updatedAt: 1 } }
    );

    return doc;
  }

  // Search words by prefix (case insensitive)
  async searchByPrefix(prefix, limit = 20) {
    await this.init();
    const searchPrefix = String(prefix || "").toLowerCase();

    if (!searchPrefix) return [];

    const pipeline = [
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
        },
      },
      {
        $unwind: "$data",
      },
      {
        $match: {
          "data.word": {
            $regex: `^${searchPrefix}`,
            $options: "i",
          },
        },
      },
      {
        $project: {
          word: "$data.word",
          pos: "$data.pos",
          symbol: "$data.symbol",
          phonetic_text: "$data.phonetic_text",
          _id: "$data._id",
        },
      },
      {
        $group: {
          _id: "$word",
          word: { $first: "$word" },
          pos: { $addToSet: "$pos" },
          symbol: { $first: "$symbol" },
          phonetic_text: { $first: "$phonetic_text" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { word: 1 },
      },
      {
        $limit: limit,
      },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // Search words by text (full text search)
  async searchByText(searchText, limit = 20) {
    await this.init();
    const searchQuery = String(searchText || "").trim();

    if (!searchQuery) return [];

    const pipeline = [
      {
        $match: {
          $text: {
            $search: searchQuery,
            $caseSensitive: false,
          },
        },
      },
      {
        $unwind: "$data",
      },
      {
        $match: {
          "data.word": {
            $regex: searchQuery,
            $options: "i",
          },
        },
      },
      {
        $project: {
          word: "$data.word",
          pos: "$data.pos",
          symbol: "$data.symbol",
          phonetic_text: "$data.phonetic_text",
          _id: "$data._id",
          score: { $meta: "textScore" },
        },
      },
      {
        $group: {
          _id: "$word",
          word: { $first: "$word" },
          pos: { $addToSet: "$pos" },
          symbol: { $first: "$symbol" },
          phonetic_text: { $first: "$phonetic_text" },
          score: { $max: "$score" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { score: -1, word: 1 },
      },
      {
        $limit: limit,
      },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // Upsert word data
  async upsert(word, data) {
    await this.init();
    const key = String(word || "").toLowerCase();
    const nowIso = new Date().toISOString();

    const result = await this.collection.updateOne(
      { _id: key },
      {
        $set: {
          data,
          updatedAt: nowIso,
        },
        $setOnInsert: {
          createdAt: nowIso,
        },
      },
      { upsert: true }
    );

    return result;
  }

  // Get word statistics
  async getStats() {
    await this.init();

    const pipeline = [
      {
        $project: {
          wordCount: { $size: "$data" },
        },
      },
      {
        $group: {
          _id: null,
          totalWords: { $sum: 1 },
          totalEntries: { $sum: "$wordCount" },
        },
      },
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || { totalWords: 0, totalEntries: 0 };
  }

  // Get collection for direct operations
  getCollection() {
    return this.collection;
  }
}

export default WordModel;
