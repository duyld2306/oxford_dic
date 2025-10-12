import { ObjectId } from "mongodb";
import database from "../config/database.js";

class CategoryModel {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection("categories");
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, name: 1 });
      await this.collection.createIndex({ words: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ Category indexes created successfully");
    } catch (error) {
      console.error("⚠️ Category index creation failed:", error.message);
    }
  }

  async create(userId, name) {
    await this.init();

    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const category = {
      name,
      user_id: userObjectId,
      words: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(category);
    return { ...category, _id: result.insertedId };
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

  async addWord(categoryId, wordId, userId) {
    await this.init();
    const categoryObjectId =
      categoryId instanceof ObjectId ? categoryId : new ObjectId(categoryId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $addToSet: { words: wordId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async removeWord(categoryId, wordId, userId) {
    await this.init();
    const categoryObjectId =
      categoryId instanceof ObjectId ? categoryId : new ObjectId(categoryId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $pull: { words: wordId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Add multiple words to a category (batch operation)
  async addWords(categoryId, wordIds, userId) {
    await this.init();
    const categoryObjectId =
      categoryId instanceof ObjectId ? categoryId : new ObjectId(categoryId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $addToSet: { words: { $each: wordIds } },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Remove multiple words from a category (batch operation)
  async removeWords(categoryId, wordIds, userId) {
    await this.init();
    const categoryObjectId =
      categoryId instanceof ObjectId ? categoryId : new ObjectId(categoryId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.updateOne(
      { _id: categoryObjectId, user_id: userObjectId },
      {
        $pull: { words: { $in: wordIds } },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Get all words from a category
  async getWordsInCategory(categoryId, userId) {
    await this.init();
    const categoryObjectId =
      categoryId instanceof ObjectId ? categoryId : new ObjectId(categoryId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const category = await this.collection.findOne(
      { _id: categoryObjectId, user_id: userObjectId },
      { projection: { words: 1 } }
    );

    if (!category) {
      return null;
    }

    return category.words || [];
  }

  async getCategoriesByWordIds(wordIds, userId) {
    await this.init();
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const categories = await this.collection
      .find({
        user_id: userObjectId,
        words: { $in: wordIds },
      })
      .project({ _id: 1, words: 1 })
      .toArray();

    // Create a map of word_id -> [category_ids]
    const wordCategoryMap = {};

    categories.forEach((category) => {
      category.words.forEach((wordId) => {
        if (!wordCategoryMap[wordId]) {
          wordCategoryMap[wordId] = [];
        }
        wordCategoryMap[wordId].push(category._id);
      });
    });

    return wordCategoryMap;
  }
}

export default CategoryModel;
