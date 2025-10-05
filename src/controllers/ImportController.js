import ImportService from "../services/ImportService.js";

class ImportController {
  constructor() {
    this.importService = new ImportService();
  }

  // POST /api/import/json - Import single JSON file
  async importJson(req, res) {
    const { filePath } = req.body;
    if (!filePath) {
      const err = new Error("filePath is required");
      err.status = 400;
      throw err;
    }

    const result = await this.importService.importJsonData(filePath);
    // Return import summary as meta at top-level
    return res.apiSuccess({ data: null, meta: result }, 201);
  }

  // POST /api/import/multiple - Import multiple JSON files from directory
  async importMultiple(req, res) {
    const { directoryPath = "./src/mock" } = req.body;
    const result = await this.importService.importMultipleJsonFiles(
      directoryPath
    );
    // Return import summary as meta at top-level
    return res.apiSuccess({ data: null, meta: result }, 201);
  }
}

export default ImportController;
