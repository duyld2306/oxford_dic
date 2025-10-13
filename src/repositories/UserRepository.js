/**
 * User Repository
 * Handles all database operations for User entity
 */

import bcrypt from "bcryptjs";
import { BaseRepository } from "./BaseRepository.js";
import { UserEntity, UserRoles, UserGenders } from "../entities/User.entity.js";
import { COLLECTIONS, LIMITS, ERROR_MESSAGES } from "../constants/index.js";
import {
  ConflictError,
  ValidationError,
  AuthorizationError,
} from "../errors/AppError.js";

export class UserRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Create indexes
   */
  async createIndexes() {
    try {
      await this.collection.createIndex({ email: 1 }, { unique: true });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ User indexes created successfully");
    } catch (error) {
      console.error("⚠️ User index creation failed:", error.message);
    }
  }

  /**
   * Create a new user
   */
  async create(userData) {
    await this.init();

    // Create entity
    const userEntity = new UserEntity(userData);

    // Validate
    const validation = userEntity.validate();
    if (!validation.isValid) {
      throw new ValidationError(ERROR_MESSAGES.VALIDATION_ERROR, validation.errors);
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(userEntity.email);
    if (existingUser) {
      throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      userEntity.password,
      LIMITS.BCRYPT_SALT_ROUNDS
    );
    userEntity.password = hashedPassword;

    // Insert
    const result = await this.insertOne(userEntity.toDocument());

    // Return without password
    const { password, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    await this.init();
    return await this.findOne({ email });
  }

  /**
   * Find user by email without password
   */
  async findByEmailSafe(email) {
    await this.init();
    return await this.findOne({ email }, { projection: { password: 0 } });
  }

  /**
   * Find user by ID without password
   */
  async findByIdSafe(id) {
    await this.init();
    const objectId = this.toObjectId(id);
    return await this.findOne(
      { _id: objectId },
      { projection: { password: 0, favorites: 0 } }
    );
  }

  /**
   * Update user by ID
   */
  async updateUser(id, updateData) {
    await this.init();
    const objectId = this.toObjectId(id);

    // Validate gender if provided
    if (updateData.gender !== undefined && updateData.gender !== null) {
      if (!Object.values(UserGenders).includes(updateData.gender)) {
        throw new ValidationError(ERROR_MESSAGES.INVALID_GENDER);
      }
    }

    return await this.updateById(objectId, { $set: updateData });
  }

  /**
   * Verify user
   */
  async verifyUser(id) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateById(objectId, {
      $set: { isVerified: true },
    });
  }

  /**
   * Set last verification sent timestamp
   */
  async setLastVerificationSent(id, date = new Date()) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateById(objectId, {
      $set: { lastVerificationSent: date },
    });
  }

  /**
   * Clear last verification sent timestamp
   */
  async clearLastVerificationSent(id) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateById(objectId, {
      $unset: { lastVerificationSent: "" },
    });
  }

  /**
   * Compare password
   */
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update password
   */
  async updatePassword(id, newPassword) {
    await this.init();
    const objectId = this.toObjectId(id);

    const hashedPassword = await bcrypt.hash(
      newPassword,
      LIMITS.BCRYPT_SALT_ROUNDS
    );

    return await this.updateById(objectId, {
      $set: { password: hashedPassword },
    });
  }

  /**
   * Update user role
   */
  async updateRole(userId, newRole) {
    await this.init();
    const objectId = this.toObjectId(userId);

    // Validate role
    if (!Object.values(UserRoles).includes(newRole)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ROLE);
    }

    // Prevent changing superadmin role
    const user = await this.findById(objectId);
    if (user && user.role === UserRoles.SUPERADMIN) {
      throw new AuthorizationError(ERROR_MESSAGES.CANNOT_CHANGE_SUPERADMIN_ROLE);
    }

    return await this.updateById(objectId, {
      $set: { role: newRole },
    });
  }
}

export default UserRepository;

