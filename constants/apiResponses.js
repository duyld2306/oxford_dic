const API_RESPONSES = {
  SUCCESS: {
    AUTH: {
      LOGIN_SUCCESS: {
        message: "Login successful",
        status_code: 200,
      },
      REGISTER_SUCCESS: {
        message: "Registration completed successfully",
        status_code: 201,
      },
    },
    USER: {
      PROFILE_UPDATED: {
        message: "User profile updated successfully",
        status_code: 200,
      },
    },
  },
  ERROR: {
    AUTH: {
      TOKEN_EXPIRED: {
        error_code: "TOKEN_EXPIRED",
        message: "Access token expired",
        status_code: 401,
      },
      INVALID_TOKEN: {
        error_code: "INVALID_TOKEN",
        message: "Invalid access token",
        status_code: 401,
      },
      TOKEN_VERIFICATION_FAILED: {
        error_code: "TOKEN_VERIFICATION_FAILED",
        message: "Token verification failed",
        status_code: 401,
      },
      EMAIL_NOT_VERIFIED: {
        error_code: "EMAIL_NOT_VERIFIED",
        message: "Email not verified",
        status_code: 401,
      },
      EMAIL_ALREADY_VERIFIED: {
        error_code: "EMAIL_ALREADY_VERIFIED",
        message: "Email already verified",
        status_code: 400,
      },
      INVALID_CREDENTIALS: {
        error_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        status_code: 401,
      },
      AUTH_MIDDLEWARE_ERROR: {
        error_code: "AUTH_MIDDLEWARE_ERROR",
        message: "Authentication middleware error",
        status_code: 500,
      },
      ADMIN_ACCESS_REQUIRED: {
        error_code: "ADMIN_ACCESS_REQUIRED",
        message: "Admin access required",
        status_code: 403,
      },
    },
    USER: {
      USER_NOT_FOUND: {
        error_code: "USER_NOT_FOUND",
        message: "User not found",
        status_code: 404,
      },
    },
    VALIDATION: {
      MISSING_TOKEN: {
        error_code: "MISSING_TOKEN",
        message: "Access token required",
        status_code: 400,
      },
      REQUIRE_EMAIL: {
        error_code: "REQUIRE_EMAIL",
        message: "Email is required",
        status_code: 400,
      },
      REQUIRE_PASSWORD: {
        error_code: "REQUIRE_PASSWORD",
        message: "Password is required",
        status_code: 400,
      },
      REQUIRE_REFRESH_TOKEN: {
        error_code: "REQUIRE_REFRESH_TOKEN",
        message: "Refresh token is required",
        status_code: 400,
      },
      REQUIRE_RESET_TOKEN: {
        error_code: "REQUIRE_RESET_TOKEN",
        message: "Reset token is required",
        status_code: 400,
      },
      REQUIRE_VERIFICATION_TOKEN: {
        error_code: "REQUIRE_VERIFICATION_TOKEN",
        message: "Verification token is required",
        status_code: 400,
      },
    },
    SYSTEM: {
      TOO_MANY_REQUESTS: {
        error_code: "TOO_MANY_REQUESTS",
        message: "Too many requests",
        status_code: 429,
      },
      SERVER_CONFIG_ERROR: {
        error_code: "SERVER_CONFIG_ERROR",
        message: "Server configuration error",
        status_code: 500,
      },
      UNKNOWN_ERROR: {
        error_code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
        status_code: 500,
      },
    },
  },
};

export default API_RESPONSES;
