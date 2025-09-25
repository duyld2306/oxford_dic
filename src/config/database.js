import { MongoClient } from "mongodb";
import env from "./env.js";

class DatabaseConfig {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      const MONGO_URI = env.MONGO_URI || process.env.MONGO_URI || "";
      const DB_NAME = env.DB_NAME || process.env.DB_NAME || "oxford-dic";
      const COLLECTION_NAME =
        env.COLLECTION_NAME || process.env.COLLECTION_NAME || "words";

      this.client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      this.collection = this.db.collection(COLLECTION_NAME);
      this.isConnected = true;

      // Create indexes for better performance
      await this.createIndexes();

      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Index for word lookup (already exists as _id)
      await this.collection.createIndex({ _id: 1 });

      // Index for word search by prefix
      await this.collection.createIndex(
        {
          "data.word": "text",
        },
        {
          name: "word_text_index",
          weights: { "data.word": 10 },
        }
      );

      // Index for word search by prefix (case insensitive)
      await this.collection.createIndex(
        {
          "data.word": 1,
        },
        {
          name: "word_prefix_index",
          collation: { locale: "en", strength: 2 }, // Case insensitive
        }
      );

      // Index for part of speech
      await this.collection.createIndex({
        "data.pos": 1,
      });

      // Compound index for word + pos
      await this.collection.createIndex(
        {
          "data.word": 1,
          "data.pos": 1,
        },
        {
          collation: { locale: "en", strength: 2 },
        }
      );

      console.log("✅ Database indexes created successfully");
    } catch (error) {
      console.error(
        "⚠️ Index creation failed (may already exist):",
        error.message
      );
    }
  }

  getCollection() {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }
    return this.collection;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log("✅ Database disconnected");
    }
  }
}

// Singleton instance
const database = new DatabaseConfig();
export default database;
