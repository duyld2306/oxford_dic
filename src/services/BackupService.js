import fs from "fs";
import path from "path";
import zlib from "zlib";
import { MongoClient, ObjectId } from "mongodb";
import googleDriveService from "./GoogleDriveService.js";

const DEFAULT_COLLECTION = "words";

// Recursively convert BSON types (ObjectId, Date) to JSON-friendly values
function normalizeValue(value) {
  if (value === null || value === undefined) return value;

  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v));
  if (typeof value === "object") return normalizeDoc(value);
  return value;
}

function normalizeDoc(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = normalizeValue(v);
  }
  return out;
}

class BackupService {
  constructor(logger = console) {
    this.logger = logger;
  }

  // Stream collection to pretty JSON file (streaming to avoid large memory use)
  async dumpCollectionToJsonFile(
    mongoUri,
    dbName,
    collectionName,
    jsonFilePath
  ) {
    const client = new MongoClient(mongoUri, {
      // keep defaults but ensure modern topology
    });

    await client.connect();
    try {
      const db = dbName ? client.db(dbName) : client.db();
      const col = db.collection(collectionName || DEFAULT_COLLECTION);

      // Create write stream
      const ws = fs.createWriteStream(jsonFilePath, { encoding: "utf8" });

      // Write opening bracket for JSON array
      await new Promise((resolve, reject) => {
        ws.write("[\n", (err) => (err ? reject(err) : resolve()));
      });

      const cursor = col.find({}, { batchSize: 100 });
      let first = true;

      while (await cursor.hasNext()) {
        const raw = await cursor.next();
        const doc = normalizeDoc(raw);

        const json = JSON.stringify(doc);

        const chunk = (first ? "  " : ",\n  ") + json.replace(/\n/g, "\n  ");
        first = false;

        // respect backpressure
        if (!ws.write(chunk)) {
          await new Promise((res) => ws.once("drain", res));
        }
      }

      // Write closing bracket
      await new Promise((resolve, reject) => {
        ws.write("\n]\n", (err) => (err ? reject(err) : resolve()));
      });

      await ws.end();
    } finally {
      await client.close();
    }
  }

  // Gzip a file (input -> output). Returns output path.
  async gzipFile(inputPath, outputPath) {
    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(inputPath);
      const ws = fs.createWriteStream(outputPath);
      const gz = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });

      rs.pipe(gz).pipe(ws);

      ws.on("finish", resolve);
      ws.on("error", reject);
      rs.on("error", reject);
      gz.on("error", reject);
    });
    return outputPath;
  }

  // Perform backup: dump collection to JSON, gzip it, upload, cleanup files
  async backupWords() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is not configured");

    // optional DB name from env (DB_NAME) or from Mongo URI default
    const dbName = process.env.DB_NAME || null;

    const backupsDir = path.resolve(process.cwd(), "backups");
    await fs.promises.mkdir(backupsDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonFileName = `words-backup-${ts}.json`;
    const gzFileName = `${jsonFileName}.gz`;
    const jsonFilePath = path.join(backupsDir, jsonFileName);
    const gzFilePath = path.join(backupsDir, gzFileName);

    this.logger.info(`Dumping collection 'words' to ${jsonFilePath}`);
    await this.dumpCollectionToJsonFile(
      mongoUri,
      dbName,
      DEFAULT_COLLECTION,
      jsonFilePath
    );

    this.logger.info(`Compressing ${jsonFilePath} -> ${gzFilePath}`);
    await this.gzipFile(jsonFilePath, gzFilePath);

    // remove the JSON file to save disk before upload
    try {
      await fs.promises.unlink(jsonFilePath);
    } catch (e) {
      this.logger.warn("Failed to remove temporary JSON file:", e.message || e);
    }

    // upload
    const uploaded = await googleDriveService.upload(gzFilePath, gzFileName);

    // cleanup gz after successful upload
    try {
      await fs.promises.unlink(gzFilePath);
    } catch (e) {
      this.logger.warn(
        "Failed to remove gz file after upload:",
        e.message || e
      );
    }

    return uploaded;
  }
}

export default new BackupService();
