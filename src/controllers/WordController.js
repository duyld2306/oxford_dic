import WordService from "../services/WordService.js";
import CategoryModel from "../models/Category.js";

class WordController {
  constructor() {
    this.wordService = new WordService();
    this.categoryModel = new CategoryModel();
  }

  // GET /api/lookup?word=hang
  async lookup(req, res) {
    const { word } = req.query;
    if (!word) {
      const err = new Error("Word parameter is required");
      err.status = 400;
      throw err;
    }

    const validatedWord = this.wordService.validateWord(word);
    if (!validatedWord) {
      const err = new Error("Invalid word format");
      err.status = 400;
      throw err;
    }

    const result = await this.wordService.getWord(validatedWord);
    // result: { word, quantity, data, source, variants? }
    return res.apiSuccess({ data: result }, 200);
  }

  // POST /api/examples/vi
  async getExamplesVi(req, res) {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error("ids array is required");
      err.status = 400;
      throw err;
    }
    const data = await this.wordService.getExampleViByIds(ids);
    return res.apiSuccess({ data }, 200);
  }

  // POST /api/examples/vi/update
  async updateExamplesVi(req, res) {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0) {
      const err = new Error("updates array is required");
      err.status = 400;
      throw err;
    }
    const result = await this.wordService.updateExampleViIfMissing(updates);
    // result contains { updated, skipped }
    return res.apiSuccess({ data: null, meta: result }, 200);
  }

  // GET /api/search?q=hang&type=prefix
  async search(req, res) {
    const { q: query, current = 1, limit = 20 } = req.query;
    if (!query) {
      const err = new Error("Query parameter 'q' is required");
      err.status = 400;
      throw err;
    }

    const validatedQuery = this.wordService.validateWord(query);
    if (!validatedQuery) {
      const err = new Error("Invalid query format");
      err.status = 400;
      throw err;
    }

    const result = await this.wordService.searchByPrefix(
      validatedQuery,
      parseInt(current),
      parseInt(limit)
    );
    // result: { prefix, count, words }
    return res.apiSuccess(
      {
        data: result.words,
        meta: {
          prefix: result.prefix,
          total: result.total,
          current,
          limit,
        },
      },
      200
    );
  }

  // GET /api/all?page=&per_page=
  async listAll(req, res) {
    let {
      page = 1,
      per_page = 100,
      q = "",
      symbol = "",
      parts_of_speech = "",
    } = req.query || {};
    if (String(q).trim() !== "") q = String(q).trim();
    if (symbol && !["a1", "a2", "b1", "b2", "c1", "other"].includes(symbol)) {
      const err = new Error("sym phải thuộc [a1, a2, b1, b2, c1, other]");
      err.status = 400;
      throw err;
    }

    // parts_of_speech expected as JSON.stringify(sortedArray)
    const result = await this.wordService.getAll({
      page,
      per_page,
      q,
      symbol,
      parts_of_speech,
    });
    // result: { total, page, per_page, data }
    // Attach category_ids for each word similar to favorites endpoint
    const docs = result.data || [];
    let wordsWithCategories = docs;

    // If request is authenticated, attach category_ids for that user
    if (req.userId) {
      const wordIdsInPage = docs.map((w) => w._id);
      const wordCategoryMap = await this.categoryModel.getCategoriesByWordIds(
        wordIdsInPage,
        req.userId
      );

      wordsWithCategories = docs.map((word) => ({
        ...word,
        category_ids: wordCategoryMap[word._id] || [],
      }));
    }

    return res.apiSuccess(
      {
        data: wordsWithCategories,
        meta: {
          total: result.total,
          page: result.page,
          per_page: result.per_page,
        },
      },
      200
    );
  }

  // GET /api/list-words-for-search?q=&page=&per_page=
  async listWordsForSearch(req, res) {
    let { page = 1, per_page = 100, q = "" } = req.query || {};
    if (String(q).trim() !== "") q = String(q).trim();

    const result = await this.wordService.getAllForSearch({
      page,
      per_page,
      q,
    });

    const ids = result.data ?? [];

    return res.apiSuccess(
      {
        data: ids,
        meta: {
          total: result.total,
          page: result.page,
          per_page: result.per_page,
        },
      },
      200
    );
  }

  // GET /api/get-parts-of-speech
  async getPartsOfSpeech(req, res) {
    const list = await this.wordService.getDistinctPartsOfSpeech();
    return res.apiSuccess({ data: list }, 200);
  }

  // POST /api/senses/definition
  async updateSenseDefinitions(req, res) {
    const payload = req.body;
    if (!payload) {
      const err = new Error("Request body is required");
      err.status = 400;
      throw err;
    }

    const updates = Array.isArray(payload) ? payload : [payload];
    if (updates.length === 0) {
      const err = new Error("No updates provided");
      err.status = 400;
      throw err;
    }

    const result = await this.wordService.updateSenseDefinitions(updates);
    return res.apiSuccess({ data: null, meta: result }, 200);
  }

  // POST /api/senses/definition/short
  async getSenseDefinitionShort(req, res) {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error("ids array is required");
      err.status = 400;
      throw err;
    }

    const data = await this.wordService.getSenseDefinitionShortByIds(ids);
    return res.apiSuccess({ data }, 200);
  }
}

export default WordController;
