import { API_RESPONSES } from "../constants/index.js";

/**
 * Helper to send unified API responses.
 * Usage:
 *   return respond.success(res, 'USER.PROFILE_UPDATED', { name: 'Duy' });
 *   return respond.error(res, 'AUTH.TOKEN_EXPIRED');
 */
function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

export const respond = {
  success(res, key, data = null) {
    const item = getByPath(API_RESPONSES.SUCCESS, key);
    if (!item) {
      console.warn(`⚠️ Unknown success key: ${key}`);
      return res.apiSuccess({ message: "Success", data });
    }
    const { message, status_code } = item;
    return res.apiSuccess({ message, data }, status_code);
  },

  error(res, key, extraMessage = null) {
    const item = getByPath(API_RESPONSES.ERROR, key);
    if (!item) {
      console.error(`❌ Unknown error key: ${key}`);
      return res.apiError("Internal server error", 500, "UNKNOWN_ERROR");
    }
    const { message, status_code, error_code } = item;
    const finalMsg = extraMessage ? `${message}: ${extraMessage}` : message;
    return res.apiError(finalMsg, status_code, error_code);
  },
};
