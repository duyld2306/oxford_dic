/**
 * Flashcard Entity Schema
 * Defines the structure for Flashcard documents
 */

export const FlashcardStatus = {
  NEW: "new",
  LEARNING: "learning",
  MASTERED: "mastered",
};

export class FlashcardEntity {
  constructor(data = {}) {
    this._id = data._id || null;
    this.flashcard_group_id = data.flashcard_group_id || null;
    this.word_id = data.word_id || null;
    this.status = data.status || FlashcardStatus.NEW;
    this.progress = data.progress || {
      times_shown: 0,
      times_correct: 0,
      last_reviewed_at: null,
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toDocument() {
    const doc = {
      flashcard_group_id: this.flashcard_group_id,
      word_id: this.word_id,
      status: this.status,
      progress: this.progress,
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

    if (!this.flashcard_group_id) {
      errors.push("Flashcard group ID is required");
    }

    if (!this.word_id || typeof this.word_id !== "string") {
      errors.push("Word ID is required and must be a string");
    }

    if (
      this.status &&
      !Object.values(FlashcardStatus).includes(this.status)
    ) {
      errors.push(
        `Status must be one of: ${Object.values(FlashcardStatus).join(", ")}`
      );
    }

    if (!this.progress || typeof this.progress !== "object") {
      errors.push("Progress must be an object");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

