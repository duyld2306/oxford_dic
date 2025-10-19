import { BaseDTO } from "./BaseDTO.js";

/**
 * WordDTO
 * Transform word data for API responses
 */
export class WordDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      _id: this.data._id, // String ID for words
      data: this.data.data || [],
      variants: this.data.variants || [],
      symbol: this.data.symbol || "",
      parts_of_speech: this.data.parts_of_speech || [],
      createdAt: this.formatDate(this.data.createdAt),
      updatedAt: this.formatDate(this.data.updatedAt),
    });
  }
}

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
 * ExampleViDTO
 * Transform example vi data
 */
export class ExampleViDTO extends BaseDTO {
  transform() {
    return {
      _id: this.toStringId(this.data._id),
      vi: this.data.vi || "",
    };
  }
}

/**
 * SenseDefinitionDTO
 * Transform sense definition data
 */
export class SenseDefinitionDTO extends BaseDTO {
  transform() {
    return {
      _id: this.toStringId(this.data._id),
      definition_vi: this.data.definition_vi || "",
      definition_vi_short: this.data.definition_vi_short || "",
    };
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
  WordDTO,
  WordListDTO,
  WordSearchResultDTO,
  WordLookupDTO,
  ExampleViDTO,
  SenseDefinitionDTO,
  PartsOfSpeechDTO,
};

