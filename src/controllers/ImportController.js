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
    return res.json({ success: true, data: result });
  }

  // POST /api/import/multiple - Import multiple JSON files from directory
  async importMultiple(req, res) {
    const { directoryPath = "./src/mock" } = req.body;
    const result = await this.importService.importMultipleJsonFiles(
      directoryPath
    );
    return res.json({ success: true, data: result });
  }

  // GET /api/import/status - Get import status and available files
  async getStatus(req, res) {
    const { directoryPath = "./src/mock" } = req.query;
    const result = await this.importService.getImportStatus(directoryPath);
    return res.json({ success: true, data: result });
  }
}

export default ImportController;
