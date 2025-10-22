/**
 * User Data Transfer Objects
 * Transform user entities for API responses
 */

import { BaseDTO } from "./BaseDTO.js";

/**
 * User DTO - Public user information
 */
export class UserDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      email: data.email,
      fullname: data.fullname,
      gender: data.gender,
      phone_number: data.phone_number,
      avatar: data.avatar,
      role: data.role,
      isVerified: data.isVerified || false,
      createdAt: this.formatDate(data.createdAt),
      updatedAt: this.formatDate(data.updatedAt),
    });
  }
}

/**
 * User Profile DTO - Detailed user profile
 */
export class UserProfileDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      email: data.email,
      fullname: data.fullname,
      gender: data.gender,
      phone_number: data.phone_number,
      avatar: data.avatar,
      role: data.role,
      isVerified: data.isVerified || false,
      createdAt: this.formatDate(data.createdAt),
      updatedAt: this.formatDate(data.updatedAt),
    });
  }
}

/**
 * User List DTO - Minimal user information for lists
 */
export class UserListDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      email: data.email,
      fullname: data.fullname,
      role: data.role,
      isVerified: data.isVerified || false,
      createdAt: this.formatDate(data.createdAt),
    });
  }
}

/**
 * Auth Response DTO - Authentication response with tokens
 */
export class AuthResponseDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      user: new UserDTO(data.user).transform(),
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      expires_in: data.expiresIn,
    });
  }
}

export default {
  UserDTO,
  UserProfileDTO,
  UserListDTO,
  AuthResponseDTO,
};
