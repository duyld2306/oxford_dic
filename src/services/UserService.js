import bcrypt from "bcryptjs";
import { BaseService } from "./BaseService.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { RefreshTokenRepository } from "../repositories/RefreshTokenRepository.js";
import { UserProfileDTO, UserListDTO } from "../dtos/UserDTO.js";

/**
 * UserService
 * Handles user profile and management logic
 */
export class UserService extends BaseService {
  constructor(
    userRepository = null,
    refreshTokenRepository = null,
    dependencies = {}
  ) {
    super(userRepository || new UserRepository(), dependencies);
    this.refreshTokenRepository =
      refreshTokenRepository || new RefreshTokenRepository();
  }

  /**
   * Get user profile
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    return this.execute(async () => {
      const user = await this.repository.findById(userId);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      return new UserProfileDTO(user).transform();
    }, "getProfile");
  }

  /**
   * Update user profile
   * @param {string|ObjectId} userId - User ID
   * @param {Object} updates - Profile updates
   * @param {string} userRole - Current user role
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, updates, userRole) {
    return this.execute(async () => {
      // Do not allow updating profile fields for superadmin accounts
      if (userRole === "superadmin") {
        const error = new Error("Updating profile for superadmin is forbidden");
        error.status = 403;
        throw error;
      }

      const { fullname, gender, phone_number } = updates;

      // Validate gender if provided
      const ALLOWED_GENDERS = ["male", "female", "other"];
      if (gender !== undefined && gender !== null) {
        if (!ALLOWED_GENDERS.includes(gender)) {
          const error = new Error(
            `Invalid gender value. Allowed values: ${ALLOWED_GENDERS.join(", ")}`
          );
          error.status = 400;
          throw error;
        }
      }

      const updateData = {};
      if (fullname !== undefined) updateData.fullname = fullname;
      if (gender !== undefined) updateData.gender = gender;
      if (phone_number !== undefined) updateData.phone_number = phone_number;

      if (Object.keys(updateData).length === 0) {
        const error = new Error("No valid fields to update");
        error.status = 400;
        throw error;
      }

      updateData.updatedAt = new Date();

      const result = await this.repository.updateById(userId, updateData);

      if (result.matchedCount === 0) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      const updatedUser = await this.repository.findById(userId);

      this.log("info", `Profile updated for user: ${updatedUser.email}`);

      return new UserProfileDTO(updatedUser).transform();
    }, "updateProfile");
  }

  /**
   * Change user password
   * @param {string|ObjectId} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    return this.execute(async () => {
      this.validateRequired(
        { currentPassword, newPassword },
        ["currentPassword", "newPassword"]
      );

      if (newPassword.length < 6) {
        const error = new Error("Password must be at least 6 characters long");
        error.status = 400;
        throw error;
      }

      const user = await this.repository.findById(userId);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        const error = new Error("Current password is incorrect");
        error.status = 401;
        throw error;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.repository.updateById(userId, {
        password: hashedPassword,
        updatedAt: new Date(),
      });

      // Revoke all refresh tokens for this user (force re-login)
      await this.refreshTokenRepository.deleteByUser(userId);

      this.log("info", `Password changed for user: ${user.email}`);

      return { message: "Change password successfully" };
    }, "changePassword");
  }

  /**
   * List users (superadmin only)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>}
   */
  async listUsers(filters = {}, pagination = {}) {
    return this.execute(async () => {
      const { name, role, isVerified } = filters;
      const { page = 1, per_page = 100 } = pagination;

      const p = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, parseInt(per_page, 10) || 100);

      // Build query
      const query = {};

      if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        query.$or = [
          { fullname: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ];
      }

      if (role && ["user", "admin", "superadmin"].includes(role)) {
        query.role = role;
      }

      if (isVerified !== null && isVerified !== undefined) {
        query.isVerified = isVerified;
      }

      await this.repository.init();

      const skip = (p - 1) * per;

      // Only expose safe fields
      const projection = {
        _id: 1,
        email: 1,
        fullname: 1,
        role: 1,
        gender: 1,
        isVerified: 1,
        createdAt: 1,
        updatedAt: 1,
      };

      const cursor = this.repository.collection
        .find(query, { projection })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(per);

      const users = await cursor.toArray();
      const total = await this.repository.collection.countDocuments(query);

      return {
        total,
        page: p,
        per_page: per,
        data: users.map((user) => new UserListDTO(user).transform()),
      };
    }, "listUsers");
  }

  /**
   * Set user verification status (superadmin only)
   * @param {string|ObjectId} userId - User ID
   * @param {boolean} isVerified - Verification status
   * @returns {Promise<Object>}
   */
  async setVerified(userId, isVerified) {
    return this.execute(async () => {
      this.validateRequired({ userId, isVerified }, ["userId", "isVerified"]);

      // Prevent changing verification for superadmin accounts
      const targetUser = await this.repository.findById(userId);
      if (!targetUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      if (targetUser.role === "superadmin") {
        const error = new Error(
          "Cannot change verification status of superadmin"
        );
        error.status = 403;
        throw error;
      }

      await this.repository.updateById(userId, {
        isVerified: Boolean(isVerified),
        updatedAt: new Date(),
      });

      this.log(
        "info",
        `Verification status set to ${isVerified} for user: ${targetUser.email}`
      );

      return { message: "User verification status updated successfully" };
    }, "setVerified");
  }

  /**
   * Assign role to user (superadmin only)
   * @param {string|ObjectId} userId - User ID
   * @param {string} role - New role
   * @returns {Promise<Object>}
   */
  async assignRole(userId, role) {
    return this.execute(async () => {
      this.validateRequired({ userId, role }, ["userId", "role"]);

      const ALLOWED_ROLES = ["user", "admin", "superadmin"];
      if (!ALLOWED_ROLES.includes(role)) {
        const error = new Error(
          `Invalid role. Allowed values: ${ALLOWED_ROLES.join(", ")}`
        );
        error.status = 400;
        throw error;
      }

      const targetUser = await this.repository.findById(userId);
      if (!targetUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      await this.repository.updateById(userId, {
        role,
        updatedAt: new Date(),
      });

      this.log("info", `Role assigned to ${role} for user: ${targetUser.email}`);

      return { message: "User role updated successfully" };
    }, "assignRole");
  }
}

export default UserService;

