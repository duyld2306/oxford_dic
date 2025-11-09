import { BaseRepository } from "./BaseRepository.js";

/**
 * NoteRepository
 * Collection: notes
 */
export class NoteRepository extends BaseRepository {
  constructor() {
    super("notes");
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ user_id: 1 });
      await this.collection.createIndex({ words: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      console.log("✅ Note indexes created successfully");
    } catch (error) {
      console.error("⚠️ Note index creation failed:", error.message);
    }
  }
}

export default NoteRepository;
