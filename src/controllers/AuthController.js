import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import emailService from "../utils/sendEmail.js";
import asyncHandler from "../middleware/asyncHandler.js";
import env from "../config/env.js";
import API_RESPONSES from "../../constants/apiResponses.js";
import { respond } from "../utils/respond.js";

const userModel = new UserModel();
const refreshTokenModel = new RefreshTokenModel();

class AuthController {
  // POST /api/auth/register
  register = asyncHandler(async (req, res) => {
    const { email, password, fullname, gender, phone_number } = req.body;

    if (!email || !password) {
      return res.apiError("Email and password are required", 400);
    }

    if (password.length < 6) {
      return res.apiError("Password must be at least 6 characters long", 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.apiError("Invalid email format", 400);
    }

    try {
      const user = await userModel.create({
        email: email.toLowerCase().trim(),
        password,
        fullname,
        gender,
        phone_number,
      });

      // Generate verification token
      const jwtSecret = env.JWT_SECRET;
      const verificationToken = jwt.sign(
        { userId: user._id, type: "verification" },
        jwtSecret,
        { expiresIn: "24h" }
      );

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      // Record lastVerificationSent timestamp
      await userModel.setLastVerificationSent(user._id, new Date());

      return respond.success(res, "AUTH.REGISTER_SUCCESS", {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        isVerified: user.isVerified,
      });
    } catch (error) {
      if (error.status === 400) {
        return res.apiError(error.message, 400);
      }
      throw error;
    }
  });

  // GET /api/auth/verify/:token
  verify = asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
      return respond.error(res, "VALIDATION.REQUIRE_VERIFICATION_TOKEN");
    }

    try {
      const jwtSecret = env.JWT_SECRET;
      const decoded = jwt.verify(token, jwtSecret);

      if (decoded.type !== "verification") {
        return res.apiError("Invalid verification token", 400);
      }

      const user = await userModel.findById(decoded.userId);
      if (!user) {
        return respond.error(res, "USER.USER_NOT_FOUND");
      }

      if (user.isVerified) {
        return respond.error(res, "AUTH.EMAIL_ALREADY_VERIFIED");
      }

      await userModel.verifyUser(decoded.userId);
      // Clear lastVerificationSent after successful verification
      await userModel.clearLastVerificationSent(decoded.userId);

      res.apiSuccess({
        message: "Email verified successfully. You can now log in.",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.apiError("Verification token has expired", 400);
      } else if (error.name === "JsonWebTokenError") {
        return res.apiError("Invalid verification token", 400);
      }
      throw error;
    }
  });

  // POST /api/auth/login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.apiError("Email and password are required", 400);
    }

    const user = await userModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return respond.error(res, "AUTH.INVALID_CREDENTIALS");
    }

    if (!user.isVerified) {
      return respond.error(res, "AUTH.EMAIL_NOT_VERIFIED");
    }

    const isPasswordValid = await userModel.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      return respond.error(res, "AUTH.INVALID_CREDENTIALS");
    }

    // Generate tokens
    const jwtSecret = env.JWT_SECRET;
    const jwtRefreshSecret = env.JWT_SECRET;
    const accessTokenExpire = env.ACCESS_TOKEN_EXPIRE;
    const refreshTokenExpire = env.REFRESH_TOKEN_EXPIRE;

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: accessTokenExpire }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: "refresh" },
      jwtRefreshSecret,
      { expiresIn: refreshTokenExpire }
    );

    // Extract user agent and IP address
    const userAgent = req.headers["user-agent"] || null;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    // Store refresh token in database
    await refreshTokenModel.create({
      user: user._id,
      token: refreshToken,
      userAgent,
      ipAddress,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return respond.success(res, "AUTH.LOGIN_SUCCESS", {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  });

  // POST /api/auth/refresh
  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return respond.error(res, "VALIDATION.REQUIRE_REFRESH_TOKEN");
    }

    try {
      const jwtRefreshSecret = env.JWT_SECRET;
      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);

      if (decoded.type !== "refresh") {
        return res.apiError("Invalid refresh token", 401);
      }

      // Check if refresh token exists in database
      const storedToken = await refreshTokenModel.findByToken(refreshToken);
      if (!storedToken) {
        return res.apiError("Refresh token not found", 401);
      }

      const user = await userModel.findByIdSafe(decoded.userId);
      if (!user) {
        return respond.error(res, "USER.USER_NOT_FOUND");
      }

      if (!user.isVerified) {
        return respond.error(res, "AUTH.EMAIL_NOT_VERIFIED");
      }

      // Generate new access token
      const jwtSecret = env.JWT_SECRET;
      const accessTokenExpire = env.ACCESS_TOKEN_EXPIRE;
      const refreshTokenExpire = env.REFRESH_TOKEN_EXPIRE;

      const newAccessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: accessTokenExpire }
      );
      const newRefreshToken = jwt.sign(
        { userId: user._id, type: "refresh" },
        jwtRefreshSecret,
        { expiresIn: refreshTokenExpire }
      );

      res.apiSuccess({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.apiError("Refresh token has expired", 401);
      } else if (error.name === "JsonWebTokenError") {
        return res.apiError("Invalid refresh token", 401);
      }
      throw error;
    }
  });

  // POST /api/auth/logout
  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return respond.error(res, "VALIDATION.REQUIRE_REFRESH_TOKEN");
    }

    await refreshTokenModel.deleteByToken(refreshToken);

    res.apiSuccess({
      message: "Logout successful",
    });
  });

  // POST /api/auth/forgot-password
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return respond.error(res, "VALIDATION.REQUIRE_EMAIL");
    }

    // Always return success to prevent email enumeration
    const successResponse = {
      message:
        "If an account with that email exists and is verified, a password reset link has been sent.",
    };

    try {
      const user = await userModel.findByEmail(email.toLowerCase().trim());

      // Only send email if user exists and is verified
      if (user && user.isVerified) {
        const jwtSecret = env.JWT_SECRET;
        const resetToken = jwt.sign(
          { userId: user._id, type: "password_reset" },
          jwtSecret,
          { expiresIn: "15m" }
        );

        await emailService.sendPasswordResetEmail(user.email, resetToken);
      }

      res.apiSuccess(successResponse);
    } catch (error) {
      // Even if there's an error, return success to prevent information disclosure
      console.error("Forgot password error:", error);
      res.apiSuccess(successResponse);
    }
  });

  // POST /api/auth/reset-password/:token
  resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return respond.error(res, "VALIDATION.REQUIRE_RESET_TOKEN");
    }

    if (!password) {
      return respond.error(res, "VALIDATION.REQUIRE_PASSWORD");
    }

    if (password.length < 6) {
      return res.apiError("Password must be at least 6 characters long", 400);
    }

    try {
      const jwtSecret = env.JWT_SECRET;
      const decoded = jwt.verify(token, jwtSecret);

      if (decoded.type !== "password_reset") {
        return res.apiError("Invalid reset token", 400);
      }

      const user = await userModel.findById(decoded.userId);
      if (!user) {
        return respond.error(res, "USER.USER_NOT_FOUND");
      }

      if (!user.isVerified) {
        return respond.error(res, "AUTH.EMAIL_NOT_VERIFIED");
      }

      // Update password
      await userModel.updatePassword(decoded.userId, password);

      // Invalidate all refresh tokens for this user (force re-login)
      await refreshTokenModel.deleteByUser(decoded.userId);

      res.apiSuccess({
        message:
          "Password reset successfully. Please log in with your new password.",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.apiError("Reset token has expired", 400);
      } else if (error.name === "JsonWebTokenError") {
        return res.apiError("Invalid reset token", 400);
      }
      throw error;
    }
  });

  // POST /api/auth/resend-verification
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return respond.error(res, "VALIDATION.REQUIRE_EMAIL");
    }

    const user = await userModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    if (user.isVerified) {
      return respond.error(res, "AUTH.EMAIL_ALREADY_VERIFIED");
    }

    const lastSent = user.lastVerificationSent
      ? new Date(user.lastVerificationSent)
      : null;
    if (lastSent) {
      const diffMs = Date.now() - lastSent.getTime();
      if (diffMs < 60 * 1000) {
        // Rate limit: less than 1 minute since last send
        return res.apiError(
          "Verification email sent too recently",
          API_RESPONSES.ERROR.SYSTEM.TOO_MANY_REQUESTS.status_code,
          API_RESPONSES.ERROR.SYSTEM.TOO_MANY_REQUESTS.error_code
        );
      }
    }

    // Generate new token and send
    const verifySecret = env.JWT_SECRET;
    const verificationToken = jwt.sign(
      { userId: user._id, type: "verification" },
      verifySecret,
      { expiresIn: "24h" }
    );

    await emailService.sendVerificationEmail(user.email, verificationToken);
    await userModel.setLastVerificationSent(user._id, new Date());

    res.apiSuccess({ message: "Verification email resent" });
  });
}

export default AuthController;
