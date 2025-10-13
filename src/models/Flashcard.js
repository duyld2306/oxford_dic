import { ObjectId } from "mongodb";
import database from "../config/database.js";

class Flashcard {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection("flashcards");
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ flashcard_group_id: 1 });
      await this.collection.createIndex({ flashcard_group_id: 1, word_id: 1 });
      await this.collection.createIndex({ word_id: 1 });
      console.log("✅ Flashcard indexes created successfully");
    } catch (error) {
      console.error("⚠️ Flashcard index creation failed:", error.message);
    }
  }

  // Create a new flashcard
  async create(data) {
    await this.init();

    const groupObjectId =
      data.flashcard_group_id instanceof ObjectId
        ? data.flashcard_group_id
        : new ObjectId(data.flashcard_group_id);

    const flashcard = {
      flashcard_group_id: groupObjectId,
      word_id: data.word_id, // String
      status: data.status || "new", // "new" | "learning" | "mastered"
      progress: {
        times_shown: 0,
        times_correct: 0,
        last_reviewed_at: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(flashcard);
    return { ...flashcard, _id: result.insertedId };
  }

  // Find flashcard by group and word
  async findByGroupAndWord(flashcardGroupId, wordId) {
    await this.init();

    const groupObjectId =
      flashcardGroupId instanceof ObjectId
        ? flashcardGroupId
        : new ObjectId(flashcardGroupId);

    return await this.collection.findOne({
      flashcard_group_id: groupObjectId,
      word_id: wordId,
    });
  }

  // Find all flashcards in a group
  async findByGroupId(flashcardGroupId) {
    await this.init();

    const groupObjectId =
      flashcardGroupId instanceof ObjectId
        ? flashcardGroupId
        : new ObjectId(flashcardGroupId);

    return await this.collection
      .find({ flashcard_group_id: groupObjectId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Find flashcard by ID
  async findById(id) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.findOne({ _id: flashcardObjectId });
  }

  // Update flashcard status
  async updateStatus(id, status) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.updateOne(
      { _id: flashcardObjectId },
      {
        $set: {
          status: status,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Update flashcard progress
  async updateProgress(id, progressData) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    const updateData = {
      updatedAt: new Date(),
    };

    if (progressData.times_shown !== undefined) {
      updateData["progress.times_shown"] = progressData.times_shown;
    }
    if (progressData.times_correct !== undefined) {
      updateData["progress.times_correct"] = progressData.times_correct;
    }
    if (progressData.last_reviewed_at !== undefined) {
      updateData["progress.last_reviewed_at"] = progressData.last_reviewed_at;
    }

    return await this.collection.updateOne(
      { _id: flashcardObjectId },
      { $set: updateData }
    );
  }

  // Increment times shown
  async incrementTimesShown(id) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.updateOne(
      { _id: flashcardObjectId },
      {
        $inc: { "progress.times_shown": 1 },
        $set: {
          "progress.last_reviewed_at": new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Increment times correct
  async incrementTimesCorrect(id) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.updateOne(
      { _id: flashcardObjectId },
      {
        $inc: {
          "progress.times_shown": 1,
          "progress.times_correct": 1,
        },
        $set: {
          "progress.last_reviewed_at": new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Delete flashcard
  async delete(id) {
    await this.init();

    const flashcardObjectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.deleteOne({ _id: flashcardObjectId });
  }

  // Delete flashcard by group and word
  async deleteByGroupAndWord(flashcardGroupId, wordId) {
    await this.init();

    const groupObjectId =
      flashcardGroupId instanceof ObjectId
        ? flashcardGroupId
        : new ObjectId(flashcardGroupId);

    return await this.collection.deleteOne({
      flashcard_group_id: groupObjectId,
      word_id: wordId,
    });
  }

  // Delete all flashcards in a group
  async deleteByGroupId(flashcardGroupId) {
    await this.init();

    const groupObjectId =
      flashcardGroupId instanceof ObjectId
        ? flashcardGroupId
        : new ObjectId(flashcardGroupId);

    return await this.collection.deleteMany({
      flashcard_group_id: groupObjectId,
    });
  }

  // Get flashcard statistics for a group
  async getGroupStats(flashcardGroupId) {
    await this.init();

    const groupObjectId =
      flashcardGroupId instanceof ObjectId
        ? flashcardGroupId
        : new ObjectId(flashcardGroupId);

    const stats = await this.collection
      .aggregate([
        { $match: { flashcard_group_id: groupObjectId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Format stats
    const result = {
      total: 0,
      new: 0,
      learning: 0,
      mastered: 0,
    };

    stats.forEach((stat) => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    return result;
  }
}

export default Flashcard;
