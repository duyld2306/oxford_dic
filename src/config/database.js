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
      const MONGO_URI = env.MONGO_URI;
      const DB_NAME = env.DB_NAME;
      const COLLECTION_NAME = env.COLLECTION_NAME;

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

      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
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
