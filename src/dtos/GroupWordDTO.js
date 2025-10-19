import { BaseDTO } from "./BaseDTO.js";

/**
 * GroupWordDTO
 * Transform group word data for API responses
 */
export class GroupWordDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      _id: this.toStringId(this.data._id),
      name: this.data.name,
      user_id: this.toStringId(this.data.user_id),
      words: this.data.words || [],
      createdAt: this.formatDate(this.data.createdAt),
      updatedAt: this.formatDate(this.data.updatedAt),
    });
  }
}

/**
 * GroupWordListDTO
 * Transform group word list (without words array for performance)
 */
export class GroupWordListDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      _id: this.toStringId(this.data._id),
      name: this.data.name,
    });
  }
}

export default {
  GroupWordDTO,
  GroupWordListDTO,
};
