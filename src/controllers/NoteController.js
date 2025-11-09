import { BaseController } from "./BaseController.js";
import NoteService from "../services/NoteService.js";

class NoteController extends BaseController {
  constructor(noteService = null) {
    super();
    this.noteService = noteService || new NoteService();
  }

  // GET /api/notes
  list = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { page = 1, per_page = 100, q = "" } = this.getQuery(req);

    const result = await this.noteService.getAllByUser(userId, {
      page,
      per_page,
      q,
    });

    return this.sendSuccess(res, result.data, {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
    });
  });

  // GET /api/notes/:id
  get = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const note = await this.noteService.getById(userId, id);
    return this.sendSuccess(res, note);
  });

  // POST /api/notes
  create = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const body = this.getBody(req);
    const created = await this.noteService.createNote(userId, body);
    return this.sendCreated(res, created);
  });

  // PUT /api/notes/:id
  update = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    const body = this.getBody(req);
    const updated = await this.noteService.updateNote(userId, id, body);
    return this.sendSuccess(res, updated);
  });

  // DELETE /api/notes/:id
  remove = this.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { id } = this.getParams(req);
    await this.noteService.deleteNote(userId, id);
    return this.sendNoContent(res);
  });
}

export default NoteController;
