import { ObjectId } from "mongodb";
import { BaseRepository } from "./BaseRepository.js";

/**
 * RefreshTokenRepository
 * Repository for refresh_tokens collection
 */
export class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super("refresh_tokens");
  }

  /**
   * Create indexes for refresh_tokens collection
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ token: 1 }, { unique: true });
      await this.collection.createIndex({ user: 1 });
      await this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ RefreshToken indexes created successfully");
    } catch (error) {
      console.error("⚠️ RefreshToken index creation failed:", error.message);
    }
  }

  /**
   * Create a new refresh token
   * @param {Object} tokenData - Token data
   * @returns {Promise<Object>}
   */
  async create(tokenData) {
    await this.init();

    const { user, token, userAgent, ipAddress } = tokenData;

    const refreshToken = {
      user: this.toObjectId(user),
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    };

    return await this.insertOne(refreshToken);
  }

  /**
   * Find refresh token by token string
   * @param {string} token - Token string
   * @returns {Promise<Object|null>}
   */
  async findByToken(token) {
    return await this.findOne({ token });
  }

  /**
   * Find all refresh tokens for a user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Array>}
   */
  async findByUser(userId) {
    const objectId = this.toObjectId(userId);
    return await this.find({ user: objectId });
  }

  /**
   * Delete refresh token by token string
   * @param {string} token - Token string
   * @returns {Promise<Object>}
   */
  async deleteByToken(token) {
    return await this.deleteOne({ token });
  }

  /**
   * Delete all refresh tokens for a user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteByUser(userId) {
    const objectId = this.toObjectId(userId);
    return await this.deleteMany({ user: objectId });
  }

  /**
   * Delete expired refresh tokens
   * @returns {Promise<Object>}
   */
  async deleteExpired() {
    return await this.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }

  /**
   * Update refresh token
   * @param {string} oldToken - Old token string
   * @param {string} newToken - New token string
   * @param {string} userAgent - User agent
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>}
   */
  async updateToken(oldToken, newToken, userAgent, ipAddress) {
    await this.init();

    return await this.updateOne(
      { token: oldToken },
      {
        $set: {
          token: newToken,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        },
      }
    );
  }

  /**
   * Revoke all tokens for a user (logout all devices)
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async revokeAllForUser(userId) {
    return await this.deleteByUser(userId);
  }

  /**
   * Count tokens for a user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<number>}
   */
  async countByUser(userId) {
    const objectId = this.toObjectId(userId);
    return await this.count({ user: objectId });
  }

  /**
   * Check if token exists and is valid
   * @param {string} token - Token string
   * @returns {Promise<boolean>}
   */
  async isTokenValid(token) {
    await this.init();

    const refreshToken = await this.findByToken(token);
    if (!refreshToken) return false;

    // Check if expired
    if (refreshToken.expiresAt < new Date()) {
      // Delete expired token
      await this.deleteByToken(token);
      return false;
    }

    return true;
  }
}

export default RefreshTokenRepository;

