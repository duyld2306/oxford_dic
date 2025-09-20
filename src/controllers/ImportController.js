import ImportService from "../services/ImportService.js";

class ImportController {
  constructor() {
    this.importService = new ImportService();
  }

  // POST /api/import/json - Import single JSON file
  async importJson(req, res) {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: "filePath is required",
        });
      }

      const result = await this.importService.importJsonData(filePath);
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("ImportController.importJson error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/import/multiple - Import multiple JSON files from directory
  async importMultiple(req, res) {
    try {
      const { directoryPath = "./src/mock" } = req.body;

      const result = await this.importService.importMultipleJsonFiles(
        directoryPath
      );
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("ImportController.importMultiple error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/import/status - Get import status and available files
  async getStatus(req, res) {
    try {
      const { directoryPath = "./src/mock" } = req.query;
      const result = await this.importService.getImportStatus(directoryPath);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("ImportController.getStatus error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default ImportController;
