import { BaseController } from "./BaseController.js";
import ImportService from "../services/ImportService.js";

class ImportController extends BaseController {
  constructor(importService = null) {
    super();
    this.importService = importService || new ImportService();
  }

  // POST /api/import/json - Import single JSON file
  importJson = this.asyncHandler(async (req, res) => {
    const { filePath } = this.getBody(req);
    const result = await this.importService.importJsonData(filePath);
    return this.sendCreated(res, null, result);
  });

  // POST /api/import/multiple - Import multiple JSON files from directory
  importMultiple = this.asyncHandler(async (req, res) => {
    const { directoryPath = "./src/mock" } = this.getBody(req);
    const result = await this.importService.importMultipleJsonFiles(
      directoryPath
    );
    return this.sendCreated(res, null, result);
  });
}

export default ImportController;
