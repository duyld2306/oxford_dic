import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import database from "../config/database.js";

class UserModel {
  constructor() {
    this.collection = null;
  }

  // Allowed gender values
  static ALLOWED_GENDERS = ["male", "female", "other"];

  // Allowed role values
  static ALLOWED_ROLES = ["superadmin", "admin", "user"];

  async init() {
    if (!this.collection) {
      await database.connect();
      this.collection = database.db.collection("users");
      await this.createIndexes();
    }
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ email: 1 }, { unique: true });
      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ User indexes created successfully");
    } catch (error) {
      console.error("⚠️ User index creation failed:", error.message);
    }
  }

  async create(userData) {
    await this.init();

    const {
      email,
      password,
      fullname,
      gender,
      phone_number,
      role = "user",
    } = userData;

    // Check if user already exists
    const existingUser = await this.collection.findOne({ email });
    if (existingUser) {
      const error = new Error("User already exists");
      error.status = 400;
      throw error;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Validate gender if provided
    if (gender && !UserModel.ALLOWED_GENDERS.includes(gender)) {
      const error = new Error("Invalid gender value");
      error.status = 400;
      throw error;
    }

    const user = {
      email,
      password: hashedPassword,
      role,
      fullname: fullname || null,
      gender: gender || null,
      phone_number: phone_number || null,
      favorites: [],
      isVerified: false,
      // Track when verification email was last sent
      lastVerificationSent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, _id: result.insertedId };
  }

  async findByEmail(email) {
    await this.init();
    return await this.collection.findOne({ email });
  }

  async findById(id) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    return await this.collection.findOne({ _id: objectId });
  }

  async updateById(id, updateData) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);

    // If gender is being updated, validate it
    if (updateData.gender !== undefined && updateData.gender !== null) {
      if (!UserModel.ALLOWED_GENDERS.includes(updateData.gender)) {
        const error = new Error("Invalid gender value");
        error.status = 400;
        throw error;
      }
    }

    const result = await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );

    return result;
  }

  async verifyUser(id) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          isVerified: true,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Set the lastVerificationSent timestamp for a user
  async setLastVerificationSent(id, date) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    return await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          lastVerificationSent: date || new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Clear lastVerificationSent (e.g., after verification)
  async clearLastVerificationSent(id) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);
    return await this.collection.updateOne(
      { _id: objectId },
      { $unset: { lastVerificationSent: "" }, $set: { updatedAt: new Date() } }
    );
  }

  async comparePassword(plainPassword, hashedPassword) {
    // Ensure DB initialized (not strictly necessary for bcrypt but kept for parity)
    await this.init();
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(id, newPassword) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    return await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Get user without password field
  async findByIdSafe(id) {
    await this.init();
    const objectId = id instanceof ObjectId ? id : new ObjectId(id);

    return await this.collection.findOne(
      { _id: objectId },
      { projection: { password: 0, favorites: 0 } }
    );
  }

  // Get user by email without password field
  async findByEmailSafe(email) {
    await this.init();

    return await this.collection.findOne(
      { email },
      { projection: { password: 0 } }
    );
  }

  // Update user role (only superadmin can do this)
  async updateRole(userId, newRole) {
    await this.init();
    const objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);

    // Validate role
    if (!UserModel.ALLOWED_ROLES.includes(newRole)) {
      const error = new Error("Invalid role value");
      error.status = 400;
      throw error;
    }

    // Prevent changing superadmin role
    const user = await this.findById(objectId);
    if (user && user.role === "superadmin") {
      const error = new Error("Cannot change superadmin role");
      error.status = 403;
      throw error;
    }

    return await this.collection.updateOne(
      { _id: objectId },
      {
        $set: {
          role: newRole,
          updatedAt: new Date(),
        },
      }
    );
  }
}

export default UserModel;
