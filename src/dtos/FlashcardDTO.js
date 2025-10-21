/**
 * Flashcard Data Transfer Objects
 * Transform flashcard entities for API responses
 */

import { BaseDTO } from "./BaseDTO.js";

function getStat(flashcards) {
  const total = flashcards.length || 0;
  let newly = 0;
  let learning = 0;
  let mastered = 0;

  for (const fc of flashcards) {
    const status = fc.status || (fc.progress ? "learning" : "new");
    // Normalize possible status values
    if (status === "new") newly += 1;
    else if (status === "mastered" || status === "learned") mastered += 1;
    else learning += 1;
  }

  return { total, new: newly, learning, mastered };
}

/**
 * Flashcard DTO
 */
export class FlashcardDTO extends BaseDTO {
  transform() {
    const { data } = this;

    // Calculate is_due_for_review
    const isDueForReview = data.progress?.next_review_at
      ? new Date(data.progress.next_review_at) <= new Date()
      : false;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      flashcard_group_id: this.toStringId(data.flashcard_group_id),
      word_id: data.word_id,
      status: data.status,
      progress: data.progress
        ? {
            times_shown: data.progress.times_shown || 0,
            times_correct: data.progress.times_correct || 0,
            accuracy: data.progress.accuracy || 0,
            last_reviewed_at: this.formatDate(data.progress.last_reviewed_at),
            next_review_at: this.formatDate(data.progress.next_review_at),
          }
        : null,
      is_due_for_review: isDueForReview,
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

    // Calculate is_due_for_review - true if any flashcard is due
    const isDueForReview = data.flashcards_data
      ? data.flashcards_data.some((flashcard) => {
          return (
            flashcard.progress?.next_review_at &&
            new Date(flashcard.progress.next_review_at) <= new Date()
          );
        })
      : false;

    return this.removeEmpty({
      _id: this.toStringId(data._id),
      user_id: this.toStringId(data.user_id),
      name: data.name,
      description: data.description,
      source_type: data.source_type,
      source_id: this.toStringId(data.source_id),
      is_due_for_review: isDueForReview,
      stat: getStat(data.flashcards_data || data.flashcards || []),
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
      stat: getStat(data.flashcards_data || data.flashcards || []),
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
