/**
 * GroupWord Entity Schema
 * Defines the structure for GroupWord documents
 */

export class GroupWordEntity {
  constructor(data = {}) {
    this._id = data._id || null;
    this.name = data.name || null;
    this.user_id = data.user_id || null;
    this.words = data.words || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toDocument() {
    const doc = {
      name: this.name,
      user_id: this.user_id,
      words: this.words,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (this._id) {
      doc._id = this._id;
    }

    return doc;
  }

  validate() {
    const errors = [];

    if (!this.name || typeof this.name !== "string") {
      errors.push("Name is required and must be a string");
    }

    if (!this.user_id) {
      errors.push("User ID is required");
    }

    if (!Array.isArray(this.words)) {
      errors.push("Words must be an array");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

