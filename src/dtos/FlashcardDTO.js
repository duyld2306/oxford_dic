/**
 * Flashcard Data Transfer Objects
 * Transform flashcard entities for API responses
 */

import { BaseDTO } from "./BaseDTO.js";

/**
 * Flashcard DTO
 */
export class FlashcardDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      flashcard_group_id: this.toStringId(data.flashcard_group_id),
      word_id: data.word_id,
      status: data.status,
      progress: data.progress
        ? {
            times_shown: data.progress.times_shown || 0,
            times_correct: data.progress.times_correct || 0,
            last_reviewed_at: this.formatDate(data.progress.last_reviewed_at),
          }
        : null,
      created_at: this.formatDate(data.createdAt),
      updated_at: this.formatDate(data.updatedAt),
    });
  }
}

/**
 * Flashcard Group DTO
 */
export class FlashcardGroupDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      user_id: this.toStringId(data.user_id),
      name: data.name,
      description: data.description,
      source_type: data.source_type,
      source_id: this.toStringId(data.source_id),
      flashcard_count: data.flashcards?.length || 0,
      created_at: this.formatDate(data.createdAt),
      updated_at: this.formatDate(data.updatedAt),
    });
  }
}

/**
 * Flashcard Group Detail DTO - Includes flashcards
 */
export class FlashcardGroupDetailDTO extends BaseDTO {
  transform() {
    const { data } = this;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      user_id: this.toStringId(data.user_id),
      name: data.name,
      description: data.description,
      source_type: data.source_type,
      source_id: this.toStringId(data.source_id),
      flashcards: data.flashcards
        ? BaseDTO.transformMany(data.flashcards, FlashcardDTO)
        : [],
      stats: data.stats || null,
      created_at: this.formatDate(data.createdAt),
      updated_at: this.formatDate(data.updatedAt),
    });
  }
}

export default {
  FlashcardDTO,
  FlashcardGroupDTO,
  FlashcardGroupDetailDTO,
};
