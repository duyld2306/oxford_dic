import WordService from "../services/WordService.js";

class WordController {
  constructor() {
    this.wordService = new WordService();
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
    const { page = 1, per_page = 100 } = req.query || {};
    const result = await this.wordService.getAll(page, per_page);
    // result: { total, page, per_page, data }
    return res.apiSuccess(
      {
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          per_page: result.per_page,
        },
      },
      200
    );
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
