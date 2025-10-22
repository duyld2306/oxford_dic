import { BaseController } from "./BaseController.js";
import UserService from "../services/UserService.js";
import { respond } from "../utils/respond.js";

class UserController extends BaseController {
  constructor(userService = null) {
    super();
    this.userService = userService || new UserService();
  }

  // GET /api/users/profile
  getProfile = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const user = await this.userService.getProfile(userId);
    return this.sendSuccess(res, user);
  });

  // PUT /api/users/profile
  updateProfile = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const userRole = this.getUserRole(req);
    const { fullname, gender, phone_number } = this.getBody(req);

    try {
      const updatedUser = await this.userService.updateProfile(
        userId,
        { fullname, gender, phone_number },
        userRole
      );
      return respond.success(res, "USER.PROFILE_UPDATED", updatedUser);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // POST /api/users/change-password
  changePassword = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { currentPassword, newPassword } = this.getBody(req);

    try {
      const result = await this.userService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // GET /api/users/list (superadmin only - checked by middleware)
  listUsers = this.asyncHandler(async (req, res) => {
    const { name, role, isVerified, page = 1, per_page = 100 } = req.query;

    const filters = {};
    if (name) filters.name = name;
    if (role) filters.role = role;
    if (isVerified !== undefined) filters.isVerified = isVerified === "true";

    const result = await this.userService.listUsers(filters, {
      page,
      per_page,
    });
    return this.sendSuccess(res, result.data, {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
    });
  });

  // PUT /api/users/:id/verified (superadmin only - checked by middleware)
  setVerified = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isVerified } = req.body;

    try {
      const result = await this.userService.setVerified(id, isVerified);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });

  // PUT /api/users/:id/role (superadmin only - checked by middleware)
  assignRole = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
      const result = await this.userService.assignRole(id, role);
      return this.sendSuccess(res, result);
    } catch (error) {
      if (error.status) {
        return this.sendError(res, error.message, error.status);
      }
      throw error;
    }
  });
}

export default UserController;
