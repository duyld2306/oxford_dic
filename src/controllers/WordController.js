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
    if (!result.success) {
      const err = new Error(result.error || "Word not found");
      err.status = 404;
      throw err;
    }

    return res.json({ success: true, data: result.data });
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
    return res.json({ success: true, data });
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
    return res.json({ success: true, ...result });
  }

  // GET /api/search?q=hang&type=prefix
  async search(req, res) {
    const { q: query, limit = 20 } = req.query;
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
      parseInt(limit)
    );
    if (!result.success) {
      const err = new Error(result.error || "Search failed");
      err.status = 400;
      throw err;
    }

    return res.json({ success: true, data: result.data });
  }

  // POST /api/senses/definition
  async updateSenseDefinitions(req, res) {
    const payload = req.body;
    if (!payload) {
      const err = new Error('Request body is required');
      err.status = 400;
      throw err;
    }

    const updates = Array.isArray(payload) ? payload : [payload];
    if (updates.length === 0) {
      const err = new Error('No updates provided');
      err.status = 400;
      throw err;
    }

    const result = await this.wordService.updateSenseDefinitions(updates);
    return res.json({ success: true, ...result });
  }

  // POST /api/senses/definition/short
  async getSenseDefinitionShort(req, res) {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array is required');
      err.status = 400;
      throw err;
    }

    const data = await this.wordService.getSenseDefinitionShortByIds(ids);
    return res.json({ success: true, data });
  }
}

export default WordController;
