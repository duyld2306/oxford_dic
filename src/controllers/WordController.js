import { BaseController } from "./BaseController.js";
import WordService from "../services/WordService.js";
import CategoryRepository from "../repositories/CategoryRepository.js";

class WordController extends BaseController {
  constructor(wordService = null, categoryRepository = null) {
    super();
    this.wordService = wordService || new WordService();
    this.categoryRepository = categoryRepository || new CategoryRepository();
  }

  // GET /api/lookup?word=hang
  lookup = this.asyncHandler(async (req, res) => {
    const { word } = this.getQuery(req);
    const result = await this.wordService.getWord(word);
    return this.sendSuccess(res, result);
  });

  // GET /api/search?q=hang&type=prefix
  search = this.asyncHandler(async (req, res) => {
    const { q, page = 1, per_page = 100, type = "word" } = this.getQuery(req);

    const result = await this.wordService.searchByPrefix(
      q,
      parseInt(page),
      parseInt(per_page),
      type
    );

    // Format the response as required
    let formattedData;
    if (type === "idiom") {
      formattedData = result.words.map((item) => ({
        _id: item.documentId,
        word: item.word,
        pos: item.pos,
        isIdiom: item.isIdiom,
      }));
    } else {
      formattedData = result.words;
    }

    return this.sendSuccess(res, formattedData, {
      prefix: result.prefix,
      total: result.total,
      page: parseInt(page),
      per_page: parseInt(per_page),
    });
  });

  // GET /api/all?page=&per_page=
  listAll = this.asyncHandler(async (req, res) => {
    const {
      page = 1,
      per_page = 100,
      q = "",
      symbol = "",
      parts_of_speech = "",
    } = this.getQuery(req);

    const result = await this.wordService.getAll({
      page,
      per_page,
      q,
      symbol,
      parts_of_speech,
    });

    const docs = result.data || [];
    let wordsWithCategories = docs;

    // If request is authenticated, attach category_ids for that user using repository
    if (req.userId) {
      const wordIdsInPage = docs.map((w) => w._id);

      // Use repository method to get all category mappings in one query
      const wordCategoryMap =
        await this.categoryRepository.getCategoriesByWordIds(
          wordIdsInPage,
          req.userId
        );

      wordsWithCategories = docs.map((word) => ({
        ...word,
        category_ids: wordCategoryMap[word._id] || [],
      }));
    }

    return this.sendSuccess(res, wordsWithCategories, {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
    });
  });

  // GET /api/list-words-for-search?q=&page=&per_page=
  listWordsForSearch = this.asyncHandler(async (req, res) => {
    const { page = 1, per_page = 100, q = "" } = this.getQuery(req);

    const result = await this.wordService.getAllForSearch({
      page,
      per_page,
      q,
    });

    const ids = result.data ?? [];

    return this.sendSuccess(res, ids, {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
    });
  });

  // GET /api/get-parts-of-speech
  getPartsOfSpeech = this.asyncHandler(async (_req, res) => {
    const list = await this.wordService.getDistinctPartsOfSpeech();
    return this.sendSuccess(res, list);
  });

  // POST /api/words/assign-root
  assignRoot = this.asyncHandler(async (req, res) => {
    const { word_id, root_id } = req.validatedBody || req.body;

    const result = await this.wordService.assignRoot(word_id, root_id);

    return this.sendSuccess(res, { modifiedCount: result.modifiedCount });
  });

  // GET /api/words?root=<word_id>
  // Return all words whose root equals given word id
  getWordsByRoot = this.asyncHandler(async (req, res) => {
    const { root = "" } = this.getQuery(req);
    const docs = await this.wordService.getByRoot(root);
    return this.sendSuccess(res, docs);
  });
}

export default WordController;
