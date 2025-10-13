# 🏗️ Architecture Diagram

## Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │  │  Middleware  │  │ Controllers  │          │
│  │              │  │              │  │              │          │
│  │ - Auth       │  │ - Auth       │  │ - Auth       │          │
│  │ - User       │  │ - Error      │  │ - User       │          │
│  │ - Flashcard  │  │ - Response   │  │ - Flashcard  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Services   │  │  Validators  │  │   Entities   │          │
│  │              │  │              │  │              │          │
│  │ - Word       │  │ - Entity     │  │ - User       │          │
│  │ - Import     │  │   Validation │  │ - GroupWord  │          │
│  │ - Init       │  │              │  │ - Flashcard  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │              BaseRepository (Abstract)            │           │
│  │  - init()                                         │           │
│  │  - findById(), findOne(), find()                 │           │
│  │  - insertOne(), insertMany()                     │           │
│  │  - updateOne(), updateMany(), updateById()       │           │
│  │  - deleteOne(), deleteMany(), deleteById()       │           │
│  │  - aggregate(), paginate()                       │           │
│  │  - toObjectId(), toObjectIds()                   │           │
│  └──────────────────────────────────────────────────┘           │
│                              ↓                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   User   │ │GroupWord │ │ Category │ │Flashcard │          │
│  │Repository│ │Repository│ │Repository│ │Repository│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│  ┌──────────────────────────────────────────────────┐           │
│  │                MongoDB Database                   │           │
│  │  - users                                          │           │
│  │  - words                                          │           │
│  │  - group_words                                    │           │
│  │  - categories                                     │           │
│  │  - flashcard_groups                               │           │
│  │  - flashcards                                     │           │
│  │  - refresh_tokens                                 │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      CROSS-CUTTING CONCERNS                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Constants  │  │    Errors    │  │    Utils     │          │
│  │              │  │              │  │              │          │
│  │ - Roles      │  │ - AppError   │  │ - Respond    │          │
│  │ - Status     │  │ - Validation │  │ - Email      │          │
│  │ - Limits     │  │ - NotFound   │  │ - Crawl      │          │
│  │ - Messages   │  │ - Conflict   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ HTTP Request
     ↓
┌─────────────────┐
│     Routes      │ ← Define endpoints
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│   Middleware    │ ← Auth, Validation, Error Handling
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│   Controller    │ ← Extract request data, call repository
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│   Repository    │ ← Data access, business rules
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│    Entity       │ ← Validate data
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│    Database     │ ← Store/retrieve data
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│   Response      │ ← Format response
└────┬────────────┘
     │
     ↓
┌─────────┐
│ Client  │
└─────────┘
```

---

## Repository Pattern

```
┌──────────────────────────────────────────────────────────┐
│                    BaseRepository                         │
│  ┌────────────────────────────────────────────────┐      │
│  │  Common Operations:                             │      │
│  │  - Database connection management               │      │
│  │  - ObjectId conversion                          │      │
│  │  - CRUD operations                              │      │
│  │  - Pagination                                   │      │
│  │  - Aggregation                                  │      │
│  │  - Error handling                               │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                         ↑
                         │ extends
         ┌───────────────┼───────────────┐
         │               │               │
┌────────┴────────┐ ┌───┴────────┐ ┌───┴────────┐
│ UserRepository  │ │  GroupWord │ │  Category  │
│                 │ │ Repository │ │ Repository │
│ - create()      │ │            │ │            │
│ - findByEmail() │ │ - create() │ │ - create() │
│ - updateRole()  │ │ - addWord()│ │ - addWord()│
│ - verifyUser()  │ │            │ │            │
└─────────────────┘ └────────────┘ └────────────┘
```

---

## Entity Pattern

```
┌──────────────────────────────────────────────────────────┐
│                      Entity                               │
│  ┌────────────────────────────────────────────────┐      │
│  │  Properties:                                    │      │
│  │  - _id, createdAt, updatedAt                   │      │
│  │  - Domain-specific fields                      │      │
│  │                                                 │      │
│  │  Methods:                                       │      │
│  │  - validate()      → { isValid, errors }       │      │
│  │  - toDocument()    → Plain object for DB       │      │
│  │  - toSafeObject()  → Object without sensitive  │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                         ↑
                         │ implements
         ┌───────────────┼───────────────┐
         │               │               │
┌────────┴────────┐ ┌───┴────────┐ ┌───┴────────┐
│  UserEntity     │ │ GroupWord  │ │ Flashcard  │
│                 │ │   Entity   │ │   Entity   │
│ - email         │ │            │ │            │
│ - password      │ │ - name     │ │ - word_id  │
│ - role          │ │ - user_id  │ │ - status   │
│ - gender        │ │ - words[]  │ │ - progress │
└─────────────────┘ └────────────┘ └────────────┘
```

---

## Error Handling Flow

```
┌─────────────┐
│ Controller  │
└──────┬──────┘
       │ throw CustomError
       ↓
┌─────────────────────────────────────────────────┐
│              Error Middleware                    │
│  ┌───────────────────────────────────────┐     │
│  │ if (error instanceof AppError)        │     │
│  │   → Return structured error response  │     │
│  │                                        │     │
│  │ else                                   │     │
│  │   → Return generic 500 error          │     │
│  └───────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│            Structured Response                    │
│  {                                                │
│    success: false,                                │
│    status_code: 404,                              │
│    message: "User not found",                     │
│    error_code: "NOT_FOUND",                       │
│    data: null                                     │
│  }                                                │
└──────────────────────────────────────────────────┘
```

---

## Data Flow Example: Create User

```
1. Client Request
   POST /api/auth/register
   { email: "test@test.com", password: "123456" }
   
2. Route
   authRoutes.js → AuthController.register()
   
3. Controller
   - Extract email, password from req.body
   - Call userRepo.create({ email, password })
   
4. Repository (UserRepository)
   - Create UserEntity
   - Validate entity
   - Check if user exists (findByEmail)
   - Hash password
   - Insert to database
   
5. Entity (UserEntity)
   - Validate email format
   - Validate password length
   - Validate role, gender
   - Return validation result
   
6. Database
   - Insert document to users collection
   - Return inserted document with _id
   
7. Repository
   - Return user without password
   
8. Controller
   - Return success response
   
9. Client Response
   {
     success: true,
     status_code: 200,
     data: { _id: "...", email: "test@test.com", ... },
     message: "User created successfully"
   }
```

---

## Dependency Injection

```
┌──────────────────────────────────────────────────────────┐
│                    Controller                             │
│  ┌────────────────────────────────────────────────┐      │
│  │  const userRepo = new UserRepository();        │      │
│  │  const user = await userRepo.create(data);     │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                   Repository                              │
│  ┌────────────────────────────────────────────────┐      │
│  │  const entity = new UserEntity(data);          │      │
│  │  const validation = entity.validate();         │      │
│  │  await this.insertOne(entity.toDocument());    │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                     Entity                                │
│  ┌────────────────────────────────────────────────┐      │
│  │  validate() {                                   │      │
│  │    if (!this.email) errors.push("...");        │      │
│  │    return { isValid, errors };                 │      │
│  │  }                                              │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
src/
├── entities/                    # ✅ Domain Models
│   ├── User.entity.js
│   ├── GroupWord.entity.js
│   ├── Category.entity.js
│   ├── FlashcardGroup.entity.js
│   └── Flashcard.entity.js
│
├── repositories/                # ✅ Data Access
│   ├── BaseRepository.js
│   ├── UserRepository.js
│   ├── GroupWordRepository.js
│   ├── CategoryRepository.js
│   ├── FlashcardGroupRepository.js
│   └── FlashcardRepository.js
│
├── constants/                   # ✅ Configuration
│   └── index.js
│
├── errors/                      # ✅ Error Handling
│   └── AppError.js
│
├── controllers/                 # Request Handlers
│   ├── AuthController.js
│   ├── UserController.js
│   ├── FlashcardController.js
│   ├── WordController.js
│   ├── ImportController.js
│   └── TranslateController.js
│
├── services/                    # Business Logic
│   ├── WordService.js
│   ├── ImportService.js
│   └── InitService.js
│
├── middleware/                  # Express Middleware
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── responseHandler.js
│   └── asyncHandler.js
│
├── routes/                      # API Routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── flashcardRoutes.js
│   ├── wordRoutes.js
│   ├── importRoutes.js
│   └── translateRoutes.js
│
├── config/                      # Configuration
│   ├── database.js
│   └── env.js
│
├── utils/                       # Utilities
│   ├── respond.js
│   ├── sendEmail.js
│   ├── crawl.js
│   └── variants.js
│
├── models/                      # ⚠️ OLD - To be deprecated
│
├── app.js                       # Express App
└── index.js                     # Entry Point
```

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Each layer has a single responsibility
- Easy to understand and maintain

### 2. **Testability**
- Each component can be tested independently
- Easy to mock dependencies

### 3. **Scalability**
- Easy to add new features
- Easy to extend existing features

### 4. **Maintainability**
- Clear structure
- Consistent patterns
- Self-documenting code

### 5. **Reusability**
- BaseRepository can be reused
- Entities can be reused
- Constants can be reused

### 6. **Type Safety**
- Entity schemas provide structure
- Validation at entity level
- Constants prevent typos

---

**This architecture follows industry best practices and is suitable for enterprise-level applications!** 🚀
