import { ObjectId } from "mongodb";
import database from "../config/database.js";

class RefreshTokenModel {
  constructor() {
    this.collection = null;
  }

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection('refresh_tokens');
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ token: 1 }, { unique: true });
      await this.collection.createIndex({ user: 1 });
      await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ RefreshToken indexes created successfully");
    } catch (error) {
      console.error("⚠️ RefreshToken index creation failed:", error.message);
    }
  }

  async create(tokenData) {
    await this.init();
    
    const { user, token, userAgent, ipAddress } = tokenData;
    
    const refreshToken = {
      user: user instanceof ObjectId ? user : new ObjectId(user),
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    };

    const result = await this.collection.insertOne(refreshToken);
    return { ...refreshToken, _id: result.insertedId };
  }

  async findByToken(token) {
    await this.init();
    return await this.collection.findOne({ token });
  }

  async findByUser(userId) {
    await this.init();
    const objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.find({ user: objectId }).toArray();
  }

  async deleteByToken(token) {
    await this.init();
    return await this.collection.deleteOne({ token });
  }

  async deleteByUser(userId) {
    await this.init();
    const objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.deleteMany({ user: objectId });
  }

  async deleteExpired() {
    await this.init();
    return await this.collection.deleteMany({
      expiresAt: { $lt: new Date() }
    });
  }

  async updateToken(oldToken, newToken, userAgent, ipAddress) {
    await this.init();
    
    return await this.collection.updateOne(
      { token: oldToken },
      {
        $set: {
          token: newToken,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date()
        }
      }
    );
  }

  // Clean up expired tokens (can be called periodically)
  async cleanup() {
    await this.init();
    const result = await this.deleteExpired();
    console.log(`🧹 Cleaned up ${result.deletedCount} expired refresh tokens`);
    return result;
  }

  // Get all active tokens for a user (for security purposes)
  async getActiveTokensForUser(userId) {
    await this.init();
    const objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
    
    return await this.collection.find(
      { 
        user: objectId,
        expiresAt: { $gt: new Date() }
      },
      {
        projection: {
          token: 0, // Don't return the actual token
          userAgent: 1,
          ipAddress: 1,
          createdAt: 1,
          expiresAt: 1
        }
      }
    ).toArray();
  }

  // Revoke all tokens for a user (useful for logout all devices)
  async revokeAllForUser(userId) {
    await this.init();
    const objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
    return await this.collection.deleteMany({ user: objectId });
  }
}

export default RefreshTokenModel;
