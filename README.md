# Oxford Dictionary API v2.0.0

## 🏗️ Cấu trúc dự án (Senior Level)

```
src/
├── config/           # Database configuration
│   └── database.js
├── models/           # Data models
│   └── Word.js
├── services/         # Business logic
│   ├── WordService.js
│   └── ImportService.js
├── controllers/      # Request handlers
│   ├── WordController.js
│   └── ImportController.js
├── routes/           # API routes
│   ├── wordRoutes.js
│   └── importRoutes.js
├── middleware/       # Custom middleware
├── utils/           # Utility functions
├── app.js           # Express app configuration
├── server.js        # Server entry point
└── simple-search.js # Simple search implementation
```

## 🚀 Cách chạy

### Cấu trúc mới (Recommended)

```bash
npm start          # Chạy server mới
npm run dev        # Development mode
npm run legacy     # Chạy server cũ
```

### Simple Search (Test)

```bash
node src/simple-search.js
```

## 📚 API Endpoints

### 1. Word Lookup

```http
GET /api/lookup?word=hang
```

**Response:**

```json
{
  "success": true,
  "data": {
    "word": "hang",
    "quantity": 2,
    "data": [...]
  }
}
```

### 2. Word Search (NEW)

```http
GET /api/search?q=pres&limit=10
```

**Parameters:**

- `q`: Search query (required)
- `limit`: Number of results (default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "query": "pres",
    "count": 10,
    "words": [
      {
        "_id": "prescribe",
        "word": "prescribe",
        "pos": ["verb"],
        "symbol": "c1",
        "phonetic_text": "/prɪˈskraɪb/",
        "count": 1
      }
    ]
  }
}
```

### 3. Import APIs

```http
POST /api/import/multiple
GET /api/import/status
```

## 🔍 Tính năng Search

### Prefix Search

- Tìm kiếm từ bắt đầu bằng chuỗi
- Không phân biệt hoa thường
- Hỗ trợ tìm kiếm cụm từ: "the pres"

### Performance

- **Lookup API**: ~173ms
- **Search API**: ~189ms
- **Database Indexing**: Tối ưu với multiple indexes

## 🗄️ Database Optimization

### Indexes được tạo:

1. **Text Index**: `data.word` với weight 10
2. **Prefix Index**: `data.word` case-insensitive
3. **POS Index**: `data.pos`
4. **Compound Index**: `data.word + data.pos`

### Query Optimization:

- Aggregation pipeline tối ưu
- Projection chỉ lấy field cần thiết
- Grouping và sorting hiệu quả

## 🏛️ Architecture Benefits

### 1. **Separation of Concerns**

- **Models**: Data access layer
- **Services**: Business logic
- **Controllers**: Request handling
- **Routes**: API routing

### 2. **Scalability**

- Dễ dàng thêm features mới
- Code reusable và maintainable
- Database abstraction layer

### 3. **Performance**

- Database indexing
- Response compression
- Efficient aggregation queries

### 4. **Maintainability**

- Clear code structure
- Easy to test
- Easy to debug

## 🔧 Environment Variables

```bash
MONGO_URI=mongodb+srv://...
DB_NAME=oxford-dic
COLLECTION_NAME=words
PORT=3000
```

## 📊 Performance Metrics

| API    | Response Time | Features                |
| ------ | ------------- | ----------------------- |
| Lookup | ~173ms        | Exact word match        |
| Search | ~189ms        | Prefix search, grouping |
| Import | Variable      | Batch processing        |

## 🎯 Usage Examples

### Search for words starting with "pres"

```bash
curl "http://localhost:3002/api/search?q=pres&limit=5"
```

### Lookup exact word

```bash
curl "http://localhost:3002/api/lookup?word=hang"
```

### Search for "the pres" (phrase)

```bash
curl "http://localhost:3002/api/search?q=the%20pres&limit=10"
```

## 🚀 Next Steps

1. **Caching**: Redis cache cho frequent searches
2. **Rate Limiting**: API rate limiting
3. **Authentication**: JWT authentication
4. **Monitoring**: Health checks và metrics
5. **Testing**: Unit tests và integration tests
