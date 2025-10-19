import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { BaseService } from "./BaseService.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { RefreshTokenRepository } from "../repositories/RefreshTokenRepository.js";
import emailService from "../utils/sendEmail.js";
import env from "../config/env.js";
import { AuthResponseDTO, UserProfileDTO } from "../dtos/UserDTO.js";

/**
 * AuthService
 * Handles authentication and authorization logic
 */
export class AuthService extends BaseService {
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
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>}
   */
  async register(userData) {
    return this.execute(async () => {
      const { email, password, fullname, gender, phone_number } = userData;

      // Validation
      this.validateRequired({ email, password }, ["email", "password"]);

      if (password.length < 6) {
        const error = new Error("Password must be at least 6 characters long");
        error.status = 400;
        throw error;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const error = new Error("Invalid email format");
        error.status = 400;
        throw error;
      }

      // Check if user already exists
      const existingUser = await this.repository.findOne({
        email: email.toLowerCase().trim(),
      });

      if (existingUser) {
        const error = new Error("Email already registered");
        error.status = 400;
        throw error;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await this.repository.insertOne({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullname: fullname || "",
        gender: gender || null,
        phone_number: phone_number || null,
        role: "user",
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate verification token
      const verificationToken = jwt.sign(
        { userId: user._id, type: "verification" },
        env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      // Record lastVerificationSent timestamp
      await this.repository.updateById(user._id, {
        lastVerificationSent: new Date(),
      });

      this.log("info", `User registered: ${user.email}`);

      return new UserProfileDTO(user).transform();
    }, "register");
  }

  /**
   * Verify user email
   * @param {string} token - Verification token
   * @returns {Promise<Object>}
   */
  async verifyEmail(token) {
    return this.execute(async () => {
      this.validateRequired({ token }, ["token"]);

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          const err = new Error("Verification token has expired");
          err.status = 400;
          throw err;
        } else if (error.name === "JsonWebTokenError") {
          const err = new Error("Invalid verification token");
          err.status = 400;
          throw err;
        }
        throw error;
      }

      if (decoded.type !== "verification") {
        const error = new Error("Invalid verification token");
        error.status = 400;
        throw error;
      }

      // Find user
      const user = await this.repository.findById(decoded.userId);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      if (user.isVerified) {
        const error = new Error("Email already verified");
        error.status = 400;
        throw error;
      }

      // Verify user
      await this.repository.updateById(user._id, {
        isVerified: true,
        lastVerificationSent: null,
        updatedAt: new Date(),
      });

      this.log("info", `Email verified: ${user.email}`);

      return { message: "Email verified successfully. You can now log in." };
    }, "verifyEmail");
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} metadata - Request metadata (userAgent, ipAddress)
   * @returns {Promise<Object>}
   */
  async login(email, password, metadata = {}) {
    return this.execute(async () => {
      this.validateRequired({ email, password }, ["email", "password"]);

      // Find user
      const user = await this.repository.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
      }

      if (!user.isVerified) {
        const error = new Error(
          "Email not verified. Please verify your email first."
        );
        error.status = 403;
        throw error;
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRE }
      );

      const refreshToken = jwt.sign(
        { userId: user._id, type: "refresh" },
        env.JWT_SECRET,
        { expiresIn: env.REFRESH_TOKEN_EXPIRE }
      );

      // Store refresh token
      await this.refreshTokenRepository.create({
        user: user._id,
        token: refreshToken,
        userAgent: metadata.userAgent || null,
        ipAddress: metadata.ipAddress || null,
      });

      this.log("info", `User logged in: ${user.email}`);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return new AuthResponseDTO({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      }).transform();
    }, "login");
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>}
   */
  async refreshToken(refreshToken) {
    return this.execute(async () => {
      this.validateRequired({ refreshToken }, ["refreshToken"]);

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, env.JWT_SECRET);
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          const err = new Error("Refresh token has expired");
          err.status = 401;
          throw err;
        } else if (error.name === "JsonWebTokenError") {
          const err = new Error("Invalid refresh token");
          err.status = 401;
          throw err;
        }
        throw error;
      }

      if (decoded.type !== "refresh") {
        const error = new Error("Invalid refresh token");
        error.status = 401;
        throw error;
      }

      // Check if refresh token exists in database
      const storedToken = await this.refreshTokenRepository.findByToken(
        refreshToken
      );
      if (!storedToken) {
        const error = new Error("Refresh token not found");
        error.status = 401;
        throw error;
      }

      // Find user
      const user = await this.repository.findById(decoded.userId);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      if (!user.isVerified) {
        const error = new Error("Email not verified");
        error.status = 403;
        throw error;
      }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRE }
      );

      const newRefreshToken = jwt.sign(
        { userId: user._id, type: "refresh" },
        env.JWT_SECRET,
        { expiresIn: env.REFRESH_TOKEN_EXPIRE }
      );

      this.log("info", `Token refreshed for user: ${user.email}`);

      return {
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    }, "refreshToken");
  }

  /**
   * Logout user
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>}
   */
  async logout(refreshToken) {
    return this.execute(async () => {
      this.validateRequired({ refreshToken }, ["refreshToken"]);

      await this.refreshTokenRepository.deleteByToken(refreshToken);

      this.log("info", "User logged out");

      return { message: "Logout successful" };
    }, "logout");
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>}
   */
  async forgotPassword(email) {
    return this.execute(
      async () => {
        this.validateRequired({ email }, ["email"]);

        // Always return success to prevent email enumeration
        const successResponse = {
          message:
            "If an account with that email exists and is verified, a password reset link has been sent.",
        };

        try {
          const user = await this.repository.findOne({
            email: email.toLowerCase().trim(),
          });

          // Only send email if user exists and is verified
          if (user && user.isVerified) {
            const resetToken = jwt.sign(
              { userId: user._id, type: "password_reset" },
              env.JWT_SECRET,
              { expiresIn: "15m" }
            );

            await emailService.sendPasswordResetEmail(user.email, resetToken);
            this.log("info", `Password reset email sent to: ${user.email}`);
          }

          return successResponse;
        } catch (error) {
          // Even if there's an error, return success to prevent information disclosure
          this.log("error", `Forgot password error: ${error.message}`);
          return successResponse;
        }
      },
      "forgotPassword",
      false
    ); // Don't throw on error
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async resetPassword(token, newPassword) {
    return this.execute(async () => {
      this.validateRequired({ token, newPassword }, ["token", "newPassword"]);

      if (newPassword.length < 6) {
        const error = new Error("Password must be at least 6 characters long");
        error.status = 400;
        throw error;
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          const err = new Error("Reset token has expired");
          err.status = 400;
          throw err;
        } else if (error.name === "JsonWebTokenError") {
          const err = new Error("Invalid reset token");
          err.status = 400;
          throw err;
        }
        throw error;
      }

      if (decoded.type !== "password_reset") {
        const error = new Error("Invalid reset token");
        error.status = 400;
        throw error;
      }

      // Find user
      const user = await this.repository.findById(decoded.userId);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      if (!user.isVerified) {
        const error = new Error("Email not verified");
        error.status = 403;
        throw error;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.repository.updateById(user._id, {
        password: hashedPassword,
        updatedAt: new Date(),
      });

      // Invalidate all refresh tokens for this user (force re-login)
      await this.refreshTokenRepository.deleteByUser(user._id);

      this.log("info", `Password reset for user: ${user.email}`);

      return {
        message:
          "Password reset successfully. Please log in with your new password.",
      };
    }, "resetPassword");
  }

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise<Object>}
   */
  async resendVerification(email) {
    return this.execute(async () => {
      this.validateRequired({ email }, ["email"]);

      const user = await this.repository.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      if (user.isVerified) {
        const error = new Error("Email already verified");
        error.status = 400;
        throw error;
      }

      // Rate limiting check
      const lastSent = user.lastVerificationSent
        ? new Date(user.lastVerificationSent)
        : null;
      if (lastSent) {
        const diffMs = Date.now() - lastSent.getTime();
        if (diffMs < 60 * 1000) {
          // Rate limit: less than 1 minute since last send
          const error = new Error(
            "Verification email sent too recently. Please wait 1 minute."
          );
          error.status = 429;
          throw error;
        }
      }

      // Generate new token and send
      const verificationToken = jwt.sign(
        { userId: user._id, type: "verification" },
        env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      await emailService.sendVerificationEmail(user.email, verificationToken);
      await this.repository.updateById(user._id, {
        lastVerificationSent: new Date(),
      });

      this.log("info", `Verification email resent to: ${user.email}`);

      return { message: "Verification email resent" };
    }, "resendVerification");
  }
}

export default AuthService;
