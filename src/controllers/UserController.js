import { ObjectId } from "mongodb";
import UserModel from "../models/User.js";
import WordModel from "../models/Word.js";
import asyncHandler from "../middleware/asyncHandler.js";
import RefreshTokenModel from "../models/RefreshToken.js";
import { respond } from "../utils/respond.js";

const userModel = new UserModel();
const wordModel = new WordModel();
const refreshTokenModel = new RefreshTokenModel();

class UserController {
  // GET /api/users/favorites
  getFavorites = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.apiError("Invalid pagination parameters", 400);
    }

    const { favorites, total } = await userModel.getFavorites(
      userId,
      page,
      limit
    );

    // Get word details for favorites
    const wordDetails = [];
    if (favorites.length > 0) {
      await wordModel.init();

      // Convert string IDs to ObjectIds for MongoDB query
      const wordIds = favorites
        .map((id) => {
          try {
            return typeof id === "string" ? new ObjectId(id) : id;
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);

      if (wordIds.length > 0) {
        const words = await wordModel.collection
          .find(
            { _id: { $in: wordIds } },
            {
              projection: {
                _id: 1,
                data: 1,
                variants: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            }
          )
          .toArray();

        wordDetails.push(...words);
      }
    }

    res.apiSuccess({
      favorites: wordDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // POST /api/users/favorites
  addMultipleFavorites = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { wordIds } = req.body;

    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return res.apiError("wordIds must be a non-empty array", 400);
    }

    if (wordIds.length > 50) {
      return res.apiError("Cannot add more than 50 favorites at once", 400);
    }

    // Validate ObjectIds
    const validWordIds = [];
    for (const id of wordIds) {
      try {
        const objectId = typeof id === "string" ? new ObjectId(id) : id;
        validWordIds.push(objectId);
      } catch (error) {
        return res.apiError(`Invalid word ID: ${id}`, 400);
      }
    }

    // Check if words exist
    await wordModel.init();
    const existingWords = await wordModel.collection
      .find({ _id: { $in: validWordIds } }, { projection: { _id: 1 } })
      .toArray();

    if (existingWords.length !== validWordIds.length) {
      return res.apiError("Some word IDs do not exist", 400);
    }

    const result = await userModel.addToFavorites(userId, validWordIds);

    res.apiSuccess({
      message: `Added ${validWordIds.length} words to favorites`,
      addedCount: validWordIds.length,
    });
  });

  // DELETE /api/users/favorites
  removeMultipleFavorites = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { wordIds } = req.body;

    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return res.apiError("wordIds must be a non-empty array", 400);
    }

    // Validate ObjectIds
    const validWordIds = [];
    for (const id of wordIds) {
      try {
        const objectId = typeof id === "string" ? new ObjectId(id) : id;
        validWordIds.push(objectId);
      } catch (error) {
        return res.apiError(`Invalid word ID: ${id}`, 400);
      }
    }

    const result = await userModel.removeFromFavorites(userId, validWordIds);

    res.apiSuccess({
      message: `Removed ${validWordIds.length} words from favorites`,
      removedCount: validWordIds.length,
    });
  });

  // POST /api/users/favorites/:wordId
  addSingleFavorite = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { wordId } = req.params;

    if (!wordId) {
      return res.apiError("Word ID is required", 400);
    }

    let objectId;
    try {
      objectId = typeof wordId === "string" ? new ObjectId(wordId) : wordId;
    } catch (error) {
      return res.apiError("Invalid word ID format", 400);
    }

    // Check if word exists
    await wordModel.init();
    const word = await wordModel.collection.findOne(
      { _id: objectId },
      { projection: { _id: 1 } }
    );

    if (!word) {
      return res.apiError("Word not found", 404);
    }

    const result = await userModel.addToFavorites(userId, [objectId]);

    res.apiSuccess({
      message: "Word added to favorites",
      wordId: objectId,
    });
  });

  // DELETE /api/users/favorites/:wordId
  removeSingleFavorite = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { wordId } = req.params;

    if (!wordId) {
      return res.apiError("Word ID is required", 400);
    }

    let objectId;
    try {
      objectId = typeof wordId === "string" ? new ObjectId(wordId) : wordId;
    } catch (error) {
      return res.apiError("Invalid word ID format", 400);
    }

    const result = await userModel.removeFromFavorites(userId, [objectId]);

    res.apiSuccess({
      message: "Word removed from favorites",
      wordId: objectId,
    });
  });

  // GET /api/users/profile
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const user = await userModel.findByIdSafe(userId);
    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    res.apiSuccess({ data: user });
  });

  // PUT /api/users/profile
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { fullname, gender, phone_number } = req.body;
    // Validate gender if provided
    if (gender !== undefined && gender !== null) {
      if (!UserModel.ALLOWED_GENDERS.includes(gender)) {
        return res.apiError(
          `Invalid gender value. Allowed values: ${UserModel.ALLOWED_GENDERS.join(
            ", "
          )}`,
          400
        );
      }
    }

    const updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (gender !== undefined) updateData.gender = gender;
    if (phone_number !== undefined) updateData.phone_number = phone_number;

    if (Object.keys(updateData).length === 0) {
      return res.apiError("No valid fields to update", 400);
    }

    const result = await userModel.updateById(userId, updateData);

    if (result.matchedCount === 0) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    const updatedUser = await userModel.findByIdSafe(userId);

    return respond.success(res, "USER.PROFILE_UPDATED", updatedUser);
  });

  // POST /api/users/change-password
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.apiError(
        "currentPassword, newPassword and confirmPassword are required",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return res.apiError(
        "New password and confirm password do not match",
        400
      );
    }

    if (newPassword.length < 6) {
      return res.apiError("Password must be at least 6 characters long", 400);
    }

    // Get user including password
    const user = await userModel.findById(userId);
    if (!user) {
      return respond.error(res, "USER.USER_NOT_FOUND");
    }

    const isMatch = await userModel.comparePassword(
      currentPassword,
      user.password
    );
    if (!isMatch) {
      return res.apiError("Current password is incorrect", 401);
    }

    // Update password
    await userModel.updatePassword(userId, newPassword);

    // Revoke all refresh tokens for this user (force re-login)
    await refreshTokenModel.revokeAllForUser(userId);

    res.apiSuccess({ message: "Change password successfully" });
  });
}

export default UserController;
