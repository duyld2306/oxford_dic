import { BaseDTO } from "./BaseDTO.js";

/**
 * WordListDTO
 * Transform word list with category_ids for API responses
 */
export class WordListDTO extends BaseDTO {
  constructor(data, categoryIds = []) {
    super(data);
    this.categoryIds = categoryIds;
  }

  transform() {
    return this.removeEmpty({
      _id: this.data._id,
      data: this.data.data || [],
      variants: this.data.variants || [],
      symbol: this.data.symbol || "",
      parts_of_speech: this.data.parts_of_speech || [],
      category_ids: this.categoryIds,
      createdAt: this.formatDate(this.data.createdAt),
      updatedAt: this.formatDate(this.data.updatedAt),
    });
  }
}

/**
 * WordSearchResultDTO
 * Transform word search results
 */
export class WordSearchResultDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      _id: this.data._id,
      word: this.data.word,
      isIdiom: this.data.isIdiom || false,
      pos: this.data.pos,
      documentId: this.data.documentId,
    });
  }
}

/**
 * WordLookupDTO
 * Transform word lookup results with source information
 */
export class WordLookupDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      word: this.data.word,
      quantity: this.data.quantity || 0,
      data: this.data.data || [],
      variants: this.data.variants || [],
      symbol: this.data.symbol || "",
      parts_of_speech: this.data.parts_of_speech || [],
      source: this.data.source || "database",
    });
  }
}

/**
 * PartsOfSpeechDTO
 * Transform parts of speech list
 */
export class PartsOfSpeechDTO extends BaseDTO {
  transform() {
    return {
      label: this.data.label || "",
      value: this.data.value || "",
    };
  }
}

export default {
  WordListDTO,
  WordSearchResultDTO,
  WordLookupDTO,
  PartsOfSpeechDTO,
};
