import { BaseDTO } from "./BaseDTO.js";

/**
 * CategoryDTO
 * Transform category data for API responses
 */
export class CategoryDTO extends BaseDTO {
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
 * CategoryListDTO
 * Transform category list (without words array for performance)
 */
export class CategoryListDTO extends BaseDTO {
  transform() {
    return this.removeEmpty({
      _id: this.toStringId(this.data._id),
      name: this.data.name,
    });
  }
}

export default {
  CategoryDTO,
  CategoryListDTO,
};
