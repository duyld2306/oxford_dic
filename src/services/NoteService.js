import BaseService from "./BaseService.js";
import { NoteRepository } from "../repositories/NoteRepository.js";
import { WordRepository } from "../repositories/WordRepository.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";

class NoteService extends BaseService {
  constructor(noteRepository = null, dependencies = {}) {
    super(noteRepository || new NoteRepository(), dependencies);
    this.wordRepository = new WordRepository();
  }

  // Recursively validate tiptap content: no image nodes and no remote/data src
  validateContentNoImages(content) {
    if (!content || typeof content !== "object") return true;

    const checkNode = (node) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "image") {
        throw new ValidationError(
          "Content contains image nodes which are not allowed"
        );
      }

      if (node.attrs && node.attrs.src) {
        const src = String(node.attrs.src || "").toLowerCase();
        if (src.startsWith("data:image/") || src.startsWith("http")) {
          throw new ValidationError(
            "Content contains image src which is not allowed"
          );
        }
      }

      if (Array.isArray(node.content)) {
        for (const child of node.content) checkNode(child);
      }
    };

    // Top-level may be an object with content array, or nodes array
    if (Array.isArray(content)) {
      for (const n of content) checkNode(n);
    } else {
      checkNode(content);
    }

    return true;
  }

  // Ensure words array items exist in words collection. Words are stored with string _id.
  async validateWordsExist(words = []) {
    if (!Array.isArray(words)) return [];

    const normalized = words
      .map((w) =>
        String(w || "")
          .toLowerCase()
          .trim()
      )
      .filter(Boolean);
    if (normalized.length === 0) return normalized;

    await this.wordRepository.init();
    const found = await this.wordRepository.collection.countDocuments({
      _id: { $in: normalized },
    });

    if (found !== normalized.length) {
      throw new ValidationError("One or more words are invalid");
    }

    return normalized;
  }

  // Get all notes of a user
  async getAllByUser(userId, { page = 1, per_page = 100, q = "" } = {}) {
    return this.execute(async () => {
      await this.repository.init();
      const uid = this.repository.toObjectId(userId);

      const query = { user_id: uid };

      // filter by word (partial match). words array stores normalized word ids (strings)
      if (q && String(q).trim() !== "") {
        const escapeForRegex = (s) =>
          String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        const pattern = escapeForRegex(String(q).trim());
        const regex = new RegExp(pattern, "i");
        query.words = { $elemMatch: { $regex: regex } };
      }

      // Use repository.paginate for pagination
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const per = Math.max(1, Math.min(1000, parseInt(per_page, 10) || 100));

      const result = await this.repository.paginate(query, pageNum, per, {
        sort: { createdAt: -1 },
      });

      // Normalize response shape to { total, page, per_page, data }
      return {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        data: result.docs,
      };
    }, "getAllByUser");
  }

  // Create a note
  async createNote(userId, payload) {
    return this.execute(async () => {
      const { words = [], content = {} } = payload || {};

      // validate content structure and images
      this.validateContentNoImages(content);

      // validate words existence and normalize
      const normalizedWords = await this.validateWordsExist(words);

      const doc = {
        user_id: this.repository.toObjectId(userId),
        words: normalizedWords,
        content: content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inserted = await this.repository.insertOne(doc);
      return inserted;
    }, "createNote");
  }

  // Update a note
  async updateNote(userId, id, payload) {
    return this.execute(async () => {
      await this.repository.init();
      const existing = await this.repository.findById(id);
      if (!existing) throw new NotFoundError("Note");

      // ownership
      this.checkOwnership(existing, userId);

      const { words = undefined, content = undefined } = payload || {};

      const updateObj = {};

      if (words !== undefined) {
        const normalizedWords = await this.validateWordsExist(words);
        updateObj.words = normalizedWords;
      }

      if (content !== undefined) {
        this.validateContentNoImages(content);
        updateObj.content = content;
      }

      if (Object.keys(updateObj).length === 0) {
        // nothing to update
        return existing;
      }

      await this.repository.updateById(id, { $set: updateObj });
      const updated = await this.repository.findById(id);
      return updated;
    }, "updateNote");
  }

  // Delete a note
  async deleteNote(userId, id) {
    return this.execute(async () => {
      await this.repository.init();
      const existing = await this.repository.findById(id);
      if (!existing) throw new NotFoundError("Note");

      this.checkOwnership(existing, userId);

      await this.repository.deleteById(id);
      return { deleted: 1 };
    }, "deleteNote");
  }
}

export default NoteService;
