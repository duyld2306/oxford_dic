import { BaseController } from "./BaseController.js";
import AuthService from "../services/AuthService.js";
import { respond } from "../utils/respond.js";

class AuthController extends BaseController {
  constructor(authService = null) {
    super();
    this.authService = authService || new AuthService();
  }

  // POST /api/auth/register
  register = this.asyncHandler(async (req, res) => {
    const { email, password, fullname, gender, phone_number } =
      this.getBody(req);

    try {
      const user = await this.authService.register({
        email,
        password,
        fullname,
        gender,
        phone_number,
      });

      return respond.success(res, "AUTH.REGISTER_SUCCESS", user);
    } catch (error) {
      if (error.status === 400 || error.status === 429) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/auth/verify/:token
  verify = this.asyncHandler(async (req, res) => {
    const { token } = this.getParams(req);

    try {
      await this.authService.verifyEmail(token);
      return this.sendSuccess(res, {
        message: "Email verified successfully. You can now log in.",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return this.sendError(res, "Verification token has expired", 400);
      } else if (error.name === "JsonWebTokenError") {
        return this.sendError(res, "Invalid verification token", 400);
      } else if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/auth/login
  login = this.asyncHandler(async (req, res) => {
    const { email, password } = this.getBody(req);

    // Extract user agent and IP address
    const { userAgent, ipAddress } = this.getRequestMetadata(req);

    try {
      const result = await this.authService.login(email, password, {
        userAgent,
        ipAddress,
      });

      return respond.success(res, "AUTH.LOGIN_SUCCESS", result);
    } catch (error) {
      if (error.status === 400 || error.status === 401) {
        return respond.error(res, "AUTH.INVALID_CREDENTIALS");
      } else if (error.status === 403) {
        return respond.error(res, "AUTH.EMAIL_NOT_VERIFIED");
      }
      throw error;
    }
  });

  // POST /api/auth/refresh
  refresh = this.asyncHandler(async (req, res) => {
    const { refreshToken } = this.getBody(req);
    const { userAgent, ipAddress } = this.getRequestMetadata(req);

    try {
      const result = await this.authService.refreshToken(refreshToken, {
        userAgent,
        ipAddress,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return this.sendError(
          res,
          "Refresh token has expired",
          401,
          "REFRESH_TOKEN_EXPIRED"
        );
      } else if (error.name === "JsonWebTokenError") {
        return this.sendError(
          res,
          "Invalid refresh token",
          401,
          "INVALID_TOKEN"
        );
      } else if (error.status) {
        return this.sendError(
          res,
          error.message,
          error.status,
          error.errorCode
        );
      }
      throw error;
    }
  });

  // POST /api/auth/logout
  logout = this.asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    await this.authService.logout(refreshToken);

    return this.sendSuccess(res, {
      message: "Logout successful",
    });
  });

  // POST /api/auth/forgot-password
  forgotPassword = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await this.authService.forgotPassword(email);
    return this.sendSuccess(res, result);
  });

  // POST /api/auth/reset-password/:token
  resetPassword = this.asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
      await this.authService.resetPassword(token, password);
      return this.sendSuccess(res, {
        message:
          "Password reset successfully. Please log in with your new password.",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return this.sendError(res, "Reset token has expired", 400);
      } else if (error.name === "JsonWebTokenError") {
        return this.sendError(res, "Invalid reset token", 400);
      } else if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/auth/resend-verification
  resendVerification = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    try {
      await this.authService.resendVerification(email);
      return this.sendSuccess(res, { message: "Verification email resent" });
    } catch (error) {
      if (error.status === 404) {
        return respond.error(res, "USER.USER_NOT_FOUND");
      } else if (error.status === 400) {
        return respond.error(res, "AUTH.EMAIL_ALREADY_VERIFIED");
      } else if (error.status === 429) {
        return this.sendError(res, error.message, 429);
      }
      throw error;
    }
  });
}

export default AuthController;
