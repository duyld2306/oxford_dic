import { ObjectId } from "mongodb";
import database from "../config/database.js";

class FlashcardGroup {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection("flashcard_groups");
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ user_id: 1, source_id: 1 });
      await this.collection.createIndex({ user_id: 1, source_type: 1 });
      console.log("✅ FlashcardGroup indexes created successfully");
    } catch (error) {
      console.error("⚠️ FlashcardGroup index creation failed:", error.message);
    }
  }

  // Create a new flashcard group
  async create(data) {
    await this.init();

    const userObjectId =
      data.user_id instanceof ObjectId
        ? data.user_id
        : new ObjectId(data.user_id);

    const flashcardGroup = {
      user_id: userObjectId,
      name: data.name,
      source_type: data.source_type || "manual", // "group_word" | "manual"
      source_id: data.source_id || null,
      description: data.description || "",
      flashcards: data.flashcards || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(flashcardGroup);
    return { ...flashcardGroup, _id: result.insertedId };
  }

  // Find all flashcard groups by user ID
  async findByUserId(userId) {
    await this.init();

    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection
      .find({ user_id: userObjectId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Find flashcard group by ID and user ID (ownership check)
  async findByIdAndUserId(id, userId) {
    await this.init();

    const groupObjectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.findOne({
      _id: groupObjectId,
      user_id: userObjectId,
    });
  }

  // Find flashcard group by source (for sync)
  async findBySource(sourceType, sourceId, userId) {
    await this.init();

    const sourceObjectId =
      sourceId instanceof ObjectId ? sourceId : new ObjectId(sourceId);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.findOne({
      user_id: userObjectId,
      source_type: sourceType,
      source_id: sourceObjectId,
    });
  }

  // Update flashcard group
  async update(id, userId, updates) {
    await this.init();

    const groupObjectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.user_id;
    delete updateData.createdAt;

    const result = await this.collection.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      { $set: updateData }
    );

    return result;
  }

  // Add flashcard to group
  async addFlashcard(id, userId, flashcardId) {
    await this.init();

    const groupObjectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    const flashcardObjectId =
      flashcardId instanceof ObjectId ? flashcardId : new ObjectId(flashcardId);

    return await this.collection.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $addToSet: { flashcards: flashcardObjectId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Remove flashcard from group
  async removeFlashcard(id, userId, flashcardId) {
    await this.init();

    const groupObjectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);
    const flashcardObjectId =
      flashcardId instanceof ObjectId ? flashcardId : new ObjectId(flashcardId);

    return await this.collection.updateOne(
      { _id: groupObjectId, user_id: userObjectId },
      {
        $pull: { flashcards: flashcardObjectId },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Delete flashcard group
  async delete(id, userId) {
    await this.init();

    const groupObjectId = id instanceof ObjectId ? id : new ObjectId(id);
    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.deleteOne({
      _id: groupObjectId,
      user_id: userObjectId,
    });
  }

  // Count flashcard groups by user
  async countByUserId(userId) {
    await this.init();

    const userObjectId =
      userId instanceof ObjectId ? userId : new ObjectId(userId);

    return await this.collection.countDocuments({ user_id: userObjectId });
  }
}

export default FlashcardGroup;
