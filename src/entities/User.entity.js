/**
 * User Entity Schema
 * Defines the structure and validation rules for User documents
 */

export const UserRoles = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  USER: "user",
};

export const UserGenders = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
};

export class UserEntity {
  constructor(data = {}) {
    this._id = data._id || null;
    this.email = data.email || null;
    this.password = data.password || null;
    this.role = data.role || UserRoles.USER;
    this.fullname = data.fullname || null;
    this.gender = data.gender || null;
    this.phone_number = data.phone_number || null;
    this.favorites = data.favorites || [];
    this.isVerified = data.isVerified || false;
    this.lastVerificationSent = data.lastVerificationSent || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Convert to plain object for database insertion
   */
  toDocument() {
    const doc = {
      email: this.email,
      password: this.password,
      role: this.role,
      fullname: this.fullname,
      gender: this.gender,
      phone_number: this.phone_number,
      favorites: this.favorites,
      isVerified: this.isVerified,
      lastVerificationSent: this.lastVerificationSent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (this._id) {
      doc._id = this._id;
    }

    return doc;
  }

  /**
   * Get user data without sensitive fields
   */
  toSafeObject() {
    return {
      _id: this._id,
      email: this.email,
      role: this.role,
      fullname: this.fullname,
      gender: this.gender,
      phone_number: this.phone_number,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validate user data
   */
  validate() {
    const errors = [];

    if (!this.email || typeof this.email !== "string") {
      errors.push("Email is required and must be a string");
    }

    if (!this.password || typeof this.password !== "string") {
      errors.push("Password is required and must be a string");
    }

    if (this.role && !Object.values(UserRoles).includes(this.role)) {
      errors.push(
        `Role must be one of: ${Object.values(UserRoles).join(", ")}`
      );
    }

    if (this.gender && !Object.values(UserGenders).includes(this.gender)) {
      errors.push(
        `Gender must be one of: ${Object.values(UserGenders).join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

