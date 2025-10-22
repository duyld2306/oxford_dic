/**
 * Base Repository
 * Abstract base class for all repositories
 * Provides common database operations and utilities
 */

import { ObjectId } from "mongodb";
import database from "../config/database.js";
import { DatabaseError } from "../errors/AppError.js";

export class BaseRepository {
  constructor(collectionName) {
    if (new.target === BaseRepository) {
      throw new Error(
        "BaseRepository is an abstract class and cannot be instantiated directly"
      );
    }

    this.collectionName = collectionName;
    this.collection = null;
  }

  /**
   * Initialize database connection and collection
   */
  async init() {
    if (!this.collection) {
      try {
        await database.connect();
        this.collection = database.db.collection(this.collectionName);
        await this.createIndexes();
      } catch (error) {
        throw new DatabaseError(
          `Failed to initialize ${this.collectionName} collection: ${error.message}`
        );
      }
    }
  }

  /**
   * Create indexes for the collection
   * Should be overridden by child classes
   */
  async createIndexes() {
    // Override in child classes
  }

  /**
   * Convert value to ObjectId if it's not already
   */
  toObjectId(value) {
    if (!value) return null;
    if (value instanceof ObjectId) return value;

    try {
      return new ObjectId(value);
    } catch (error) {
      throw new DatabaseError(`Invalid ObjectId: ${value}`);
    }
  }

  /**
   * Convert array of values to ObjectIds
   */
  toObjectIds(values) {
    if (!Array.isArray(values)) return [];
    return values.map((v) => this.toObjectId(v)).filter(Boolean);
  }

  /**
   * Find document by ID
   */
  async findById(id, projection = {}) {
    await this.init();
    const objectId = this.toObjectId(id);

    try {
      return await this.collection.findOne({ _id: objectId }, { projection });
    } catch (error) {
      throw new DatabaseError(
        `Failed to find document by ID: ${error.message}`
      );
    }
  }

  /**
   * Find one document by query
   */
  async findOne(query, projection = {}) {
    await this.init();

    try {
      return await this.collection.findOne(query, { projection });
    } catch (error) {
      throw new DatabaseError(`Failed to find document: ${error.message}`);
    }
  }

  /**
   * Find multiple documents
   */
  async find(query = {}, options = {}) {
    await this.init();

    try {
      const cursor = this.collection.find(query, options);

      if (options.sort) cursor.sort(options.sort);
      if (options.skip) cursor.skip(options.skip);
      if (options.limit) cursor.limit(options.limit);

      return await cursor.toArray();
    } catch (error) {
      throw new DatabaseError(`Failed to find documents: ${error.message}`);
    }
  }

  /**
   * Count documents
   */
  async count(query = {}) {
    await this.init();

    try {
      return await this.collection.countDocuments(query);
    } catch (error) {
      throw new DatabaseError(`Failed to count documents: ${error.message}`);
    }
  }

  /**
   * Insert one document
   */
  async insertOne(document) {
    await this.init();

    try {
      const result = await this.collection.insertOne(document);
      return { ...document, _id: result.insertedId };
    } catch (error) {
      throw new DatabaseError(`Failed to insert document: ${error.message}`);
    }
  }

  /**
   * Insert multiple documents
   */
  async insertMany(documents) {
    await this.init();

    try {
      const result = await this.collection.insertMany(documents);
      return result;
    } catch (error) {
      throw new DatabaseError(`Failed to insert documents: ${error.message}`);
    }
  }

  /**
   * Update one document
   */
  async updateOne(query, update, options = {}) {
    await this.init();

    try {
      // Ensure update has $set operator
      let updateOp = update;
      if (!update.$set && !update.$inc && !update.$push && !update.$pull) {
        // If no operator provided, wrap in $set
        updateOp = { $set: update };
      }

      // Always update the updatedAt field
      if (updateOp.$set) {
        updateOp.$set.updatedAt = new Date();
      } else {
        updateOp.$set = { updatedAt: new Date() };
      }

      return await this.collection.updateOne(query, updateOp, options);
    } catch (error) {
      throw new DatabaseError(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(query, update, options = {}) {
    await this.init();

    try {
      // Ensure update has $set operator
      let updateOp = update;
      if (!update.$set && !update.$inc && !update.$push && !update.$pull) {
        // If no operator provided, wrap in $set
        updateOp = { $set: update };
      }

      // Always update the updatedAt field
      if (updateOp.$set) {
        updateOp.$set.updatedAt = new Date();
      } else {
        updateOp.$set = { updatedAt: new Date() };
      }

      return await this.collection.updateMany(query, updateOp, options);
    } catch (error) {
      throw new DatabaseError(`Failed to update documents: ${error.message}`);
    }
  }

  /**
   * Update document by ID
   */
  async updateById(id, update, options = {}) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.updateOne({ _id: objectId }, update, options);
  }

  /**
   * Delete one document
   */
  async deleteOne(query) {
    await this.init();

    try {
      return await this.collection.deleteOne(query);
    } catch (error) {
      throw new DatabaseError(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(query) {
    await this.init();

    try {
      return await this.collection.deleteMany(query);
    } catch (error) {
      throw new DatabaseError(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id) {
    await this.init();
    const objectId = this.toObjectId(id);

    return await this.deleteOne({ _id: objectId });
  }

  /**
   * Aggregate pipeline
   */
  async aggregate(pipeline, options = {}) {
    await this.init();

    try {
      const cursor = this.collection.aggregate(pipeline, options);
      return await cursor.toArray();
    } catch (error) {
      throw new DatabaseError(
        `Failed to execute aggregation: ${error.message}`
      );
    }
  }

  /**
   * Check if document exists
   */
  async exists(query) {
    await this.init();

    try {
      const count = await this.collection.countDocuments(query, { limit: 1 });
      return count > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check document existence: ${error.message}`
      );
    }
  }

  /**
   * Paginate results
   */
  async paginate(query = {}, page = 1, perPage = 100, options = {}) {
    await this.init();

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePerPage = Math.max(1, parseInt(perPage, 10) || 100);
    const skip = (safePage - 1) * safePerPage;

    try {
      const [docs, total] = await Promise.all([
        this.find(query, { ...options, skip, limit: safePerPage }),
        this.count(query),
      ]);

      return {
        docs,
        total,
        page: safePage,
        perPage: safePerPage,
        totalPages: Math.ceil(total / safePerPage),
      };
    } catch (error) {
      throw new DatabaseError(`Failed to paginate: ${error.message}`);
    }
  }
}
