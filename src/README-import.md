# JSON Import API Documentation

## Tổng quan

API này cho phép import dữ liệu từ các file JSON (a.json, b.json, etc.) vào database MongoDB với khả năng gom các từ có word giống nhau.

## Tính năng chính

- **Gom từ tương tự**: Tự động gom các từ như `-ability`, `ability-`, `ability` thành một nhóm
- **Import đơn file**: Import một file JSON cụ thể
- **Import nhiều file**: Import tất cả file JSON trong thư mục
- **Tự động tạo ObjectId**: Tự động tạo ObjectId cho mỗi entry nếu chưa có

## API Endpoints

### 1. Import single JSON file

```http
POST /api/import/json
Content-Type: application/json

{
  "filePath": "./src/mock/a.json"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalWords": 458,
    "groupedWords": 354,
    "imported": 354,
    "errors": []
  }
}
```

### 2. Import multiple JSON files

```http
POST /api/import/multiple
Content-Type: application/json

{
  "directoryPath": "./src/mock"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "successfulFiles": 1,
    "failedFiles": [],
    "totalWords": 458,
    "totalGroupedWords": 354,
    "totalImported": 354,
    "allErrors": []
  }
}
```

### 3. Get import status

```http
GET /api/import/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "availableFiles": ["a.json"],
    "totalFiles": 1
  }
}
```

## Cấu trúc dữ liệu trong Database

Mỗi từ được lưu trong database với cấu trúc:

```json
{
  "_id": "ability",  // Từ đã được normalize
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "data": [
    {
      "_id": "ObjectId(...)",
      "word": "ability",
      "pos": "noun",
      "symbol": "a1",
      "phonetic": "...",
      "phonetic_text": "...",
      "senses": [...],
      "idioms": [...],
      "phrasal_verbs": [...]
    },
    {
      "_id": "ObjectId(...)",
      "word": "-ability",
      "pos": "suffix",
      "symbol": "a1",
      "phonetic": "...",
      "phonetic_text": "...",
      "senses": [...],
      "idioms": [...],
      "phrasal_verbs": [...]
    }
  ]
}
```

## Cách sử dụng

### 1. Chạy server

```bash
npm start
```

### 2. Import file a.json

```bash
curl -X POST http://localhost:3000/api/import/json \
  -H "Content-Type: application/json" \
  -d '{"filePath": "./src/mock/a.json"}'
```

### 3. Import tất cả file JSON

```bash
curl -X POST http://localhost:3000/api/import/multiple \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "./src/mock"}'
```

### 4. Chạy test script

```bash
node src/test-import.js
```

## Lưu ý

- File JSON phải chứa một array các object từ
- Mỗi object từ phải có trường `word`
- Các từ có dấu gạch ngang đầu/cuối sẽ được normalize (bỏ dấu gạch ngang)
- Tất cả từ sẽ được chuyển thành lowercase để so sánh
