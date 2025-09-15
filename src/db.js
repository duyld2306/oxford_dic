import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const DB_FILENAME = path.resolve(process.cwd(), "words.sqlite");

function ensureDatabaseFileExists() {
  const dir = path.dirname(DB_FILENAME);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILENAME)) {
    fs.writeFileSync(DB_FILENAME, "");
  }
}

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;
  ensureDatabaseFileExists();
  sqlite3.verbose();
  dbInstance = new sqlite3.Database(DB_FILENAME);
  return dbInstance;
}

export function initDb() {
  const db = getDb();
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS words (word TEXT PRIMARY KEY, json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    db.run("CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)");
  });
}

export function getWord(word) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT word, json FROM words WHERE word = ?",
      [word.toLowerCase()],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

export function upsertWord(word, jsonData) {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const jsonString =
    typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData);
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO words(word, json, created_at, updated_at) VALUES(?, ?, ?, ?) ON CONFLICT(word) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
      [word.toLowerCase(), jsonString, nowIso, nowIso],
      function (err) {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

export function closeDb() {
  if (!dbInstance) return;
  dbInstance.close();
  dbInstance = null;
}
