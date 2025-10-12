import { ObjectId } from "mongodb";
import database from "../config/database.js";

class GroupWordModel {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection("group_words");
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, name: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ GroupWord indexes created successfully");
    } catch (error) {
      console.error("⚠️ GroupWord index creation failed:", error.message);
    }
  }

  async create(userId, name) {
    await this.init();

    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const groupWord = {
      name,
      user_id: userObjectId,
      words: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(groupWord);
    return { ...groupWord, _id: result.insertedId };
  }

  async findById(id) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    return await this.collection.findOne({ _id: objectId });
  }

  async findByIdAndUserId(id, userId) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.findOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }

  async findByUserId(userId) {
    await this.init();
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection
      .find({ user_id: userObjectId })
      .project({ _id: 1, name: 1 })
      .toArray();
  }

  async countByUserId(userId) {
    await this.init();
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.countDocuments({ user_id: userObjectId });
  }

  async updateById(id, userId, updateData) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: objectId, user_id: userObjectId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
  }

  async deleteById(id, userId) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.deleteOne({
      _id: objectId,
      user_id: userObjectId,
    });
  }

  async addWord(groupWordId, wordId, userId) {
    await this.init();
    const groupObjectId =
      groupWordId instanceof ObjectId ? groupWordId : new ObjectId(groupWordId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $addToSet: { words: wordId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async removeWord(groupWordId, wordId, userId) {
    await this.init();
    const groupObjectId =
      groupWordId instanceof ObjectId ? groupWordId : new ObjectId(groupWordId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $pull: { words: wordId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async getWordsInGroup(groupWordId, userId, page = 1, limit = 100) {
    await this.init();
    const groupObjectId =
      groupWordId instanceof ObjectId ? groupWordId : new ObjectId(groupWordId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const group = await this.collection.findOne(
      { _id: groupObjectId, user_id: userObjectId },
      { projection: { words: 1 } }
    );

    if (!group || !group.words) {
      return { words: [], total: 0 };
    }

    const skip = (page - 1) * limit;
    const total = group.words.length;
    const words = group.words.slice(skip, skip + limit);

    return { words, total };
  }

  // Get all words from all groups of a user (flattened, with pagination)
  async getAllWordsFromUserGroups(userId, page = 1, limit = 100) {
    await this.init();
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    // Get all groups for user
    const groups = await this.collection
      .find({ user_id: userObjectId })
      .project({ words: 1 })
      .toArray();

    // Flatten all words from all groups and remove duplicates
    const allWordsSet = new Set();
    groups.forEach((group) => {
      if (group.words && Array.isArray(group.words)) {
        group.words.forEach((wordId) => allWordsSet.add(wordId));
      }
    });

    const allWords = Array.from(allWordsSet);
    const total = allWords.length;

    // Apply pagination
    const skip = (page - 1) * limit;
    const words = allWords.slice(skip, skip + limit);

    return { words, total };
  }
}

export default GroupWordModel;
