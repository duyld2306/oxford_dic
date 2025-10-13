/**
 * FlashcardGroup Entity Schema
 * Defines the structure for FlashcardGroup documents
 */

export const FlashcardGroupSourceTypes = {
  GROUP_WORD: "group_word",
  MANUAL: "manual",
};

export class FlashcardGroupEntity {
  constructor(data = {}) {
    this._id = data._id || null;
    this.user_id = data.user_id || null;
    this.name = data.name || null;
    this.source_type = data.source_type || FlashcardGroupSourceTypes.MANUAL;
    this.source_id = data.source_id || null;
    this.description = data.description || null;
    this.flashcards = data.flashcards || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toDocument() {
    const doc = {
      user_id: this.user_id,
      name: this.name,
      source_type: this.source_type,
      source_id: this.source_id,
      description: this.description,
      flashcards: this.flashcards,
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

    if (!this.user_id) {
      errors.push("User ID is required");
    }

    if (!this.name || typeof this.name !== "string") {
      errors.push("Name is required and must be a string");
    }

    if (
      this.source_type &&
      !Object.values(FlashcardGroupSourceTypes).includes(this.source_type)
    ) {
      errors.push(
        `Source type must be one of: ${Object.values(FlashcardGroupSourceTypes).join(", ")}`
      );
    }

    if (!Array.isArray(this.flashcards)) {
      errors.push("Flashcards must be an array");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

