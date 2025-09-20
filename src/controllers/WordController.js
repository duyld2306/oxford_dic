import WordService from "../services/WordService.js";

class WordController {
  constructor() {
    this.wordService = new WordService();
  }

  // GET /api/lookup?word=hang
  async lookup(req, res) {
    try {
      const { word } = req.query;

      if (!word) {
        return res.status(400).json({
          success: false,
          error: "Word parameter is required",
        });
      }

      const validatedWord = this.wordService.validateWord(word);
      if (!validatedWord) {
        return res.status(400).json({
          success: false,
          error: "Invalid word format",
        });
      }

      const result = await this.wordService.getWord(validatedWord);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error,
          data: null,
        });
      }

      return res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("WordController.lookup error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // GET /api/search?q=hang&type=prefix
  async search(req, res) {
    try {
      const { q: query, type = "prefix", limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'q' is required",
        });
      }

      const validatedQuery = this.wordService.validateWord(query);
      if (!validatedQuery) {
        return res.status(400).json({
          success: false,
          error: "Invalid query format",
        });
      }

      let result;
      if (type === "text") {
        result = await this.wordService.searchByText(
          validatedQuery,
          parseInt(limit)
        );
      } else {
        result = await this.wordService.searchByPrefix(
          validatedQuery,
          parseInt(limit)
        );
      }

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          data: [],
        });
      }

      return res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("WordController.search error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // GET /api/stats
  async getStats(req, res) {
    try {
      const result = await this.wordService.getStats();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }

      return res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error("WordController.getStats error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}

export default WordController;
