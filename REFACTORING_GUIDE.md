# 🏗️ Enterprise-Level Refactoring Guide

## 📋 Overview

Dự án đã được refactor theo **Clean Architecture** và **Repository Pattern** để đạt chuẩn enterprise-level.

---

## 🎯 Vấn đề đã giải quyết

### ❌ Trước khi refactor:

1. **Duplicate Code**: Tất cả models có code giống nhau (init, createIndexes, ObjectId conversion)
2. **Không có Base Class**: Thiếu abstract class/base class
3. **Không có Entity Definition**: Không có type definition rõ ràng
4. **Validation rải rác**: Validation logic nằm khắp nơi
5. **Magic Strings/Numbers**: Constants nằm rải rác
6. **Error Handling không consistent**: Mỗi nơi throw error khác nhau
7. **Models làm quá nhiều việc**: Vừa validation, vừa business logic, vừa database

### ✅ Sau khi refactor:

1. **Base Repository**: Tất cả common operations được centralize
2. **Entity Schemas**: Rõ ràng structure của từng entity
3. **Constants**: Tất cả constants ở một chỗ
4. **Custom Errors**: Error handling chuẩn và consistent
5. **Separation of Concerns**: Mỗi layer làm đúng nhiệm vụ của nó

---

## 📁 Kiến trúc mới

```
src/
├── entities/              # Entity Schemas (Data Models)
│   ├── User.entity.js
│   ├── GroupWord.entity.js
│   ├── Category.entity.js
│   ├── FlashcardGroup.entity.js
│   └── Flashcard.entity.js
│
├── repositories/          # Data Access Layer
│   ├── BaseRepository.js
│   ├── UserRepository.js
│   ├── GroupWordRepository.js (TODO)
│   ├── CategoryRepository.js (TODO)
│   ├── FlashcardGroupRepository.js (TODO)
│   └── FlashcardRepository.js (TODO)
│
├── constants/             # Application Constants
│   └── index.js
│
├── errors/                # Custom Error Classes
│   └── AppError.js
│
├── controllers/           # Request Handlers
├── services/              # Business Logic (TODO: create if needed)
├── middleware/            # Express Middleware
├── routes/                # API Routes
├── config/                # Configuration
└── utils/                 # Utilities
```

---

## 🔧 Các thành phần đã tạo

### 1. **Entity Schemas** (`src/entities/`)

Định nghĩa structure và validation cho từng entity.

**Ví dụ: UserEntity**
```javascript
import { UserEntity, UserRoles, UserGenders } from "../entities/User.entity.js";

const user = new UserEntity({
  email: "test@test.com",
  password: "123456",
  role: UserRoles.USER,
  gender: UserGenders.MALE
});

// Validate
const validation = user.validate();
if (!validation.isValid) {
  console.log(validation.errors);
}

// Convert to document for DB
const doc = user.toDocument();

// Get safe object (without password)
const safeUser = user.toSafeObject();
```

**Entities đã tạo:**
- ✅ `User.entity.js` - User entity với roles và genders
- ✅ `GroupWord.entity.js` - GroupWord entity
- ✅ `Category.entity.js` - Category entity
- ✅ `FlashcardGroup.entity.js` - FlashcardGroup entity với source types
- ✅ `Flashcard.entity.js` - Flashcard entity với status

---

### 2. **Constants** (`src/constants/index.js`)

Centralize tất cả constants.

**Sử dụng:**
```javascript
import {
  USER_ROLES,
  FLASHCARD_STATUS,
  LIMITS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COLLECTIONS
} from "../constants/index.js";

// Thay vì:
if (role !== "superadmin") { ... }

// Dùng:
if (role !== USER_ROLES.SUPERADMIN) { ... }

// Thay vì:
const saltRounds = 12;

// Dùng:
const saltRounds = LIMITS.BCRYPT_SALT_ROUNDS;
```

**Constants đã định nghĩa:**
- ✅ `USER_ROLES` - User roles
- ✅ `USER_GENDERS` - User genders
- ✅ `FLASHCARD_STATUS` - Flashcard statuses
- ✅ `FLASHCARD_GROUP_SOURCE_TYPES` - Source types
- ✅ `WORD_SYMBOLS` - CEFR levels
- ✅ `LIMITS` - Application limits
- ✅ `HTTP_STATUS` - HTTP status codes
- ✅ `ERROR_MESSAGES` - Error messages
- ✅ `SUCCESS_MESSAGES` - Success messages
- ✅ `COLLECTIONS` - Collection names

---

### 3. **Custom Errors** (`src/errors/AppError.js`)

Structured error handling.

**Sử dụng:**
```javascript
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError
} from "../errors/AppError.js";

// Thay vì:
const error = new Error("User not found");
error.status = 404;
throw error;

// Dùng:
throw new NotFoundError("User");

// Validation error với multiple errors
throw new ValidationError("Validation failed", [
  "Email is required",
  "Password must be at least 6 characters"
]);

// Conflict error
throw new ConflictError("User already exists");
```

**Error classes:**
- ✅ `AppError` - Base error class
- ✅ `ValidationError` (400) - Validation errors
- ✅ `AuthenticationError` (401) - Authentication errors
- ✅ `AuthorizationError` (403) - Authorization errors
- ✅ `NotFoundError` (404) - Resource not found
- ✅ `ConflictError` (409) - Resource conflicts
- ✅ `BusinessLogicError` (422) - Business logic errors
- ✅ `DatabaseError` (500) - Database errors

---

### 4. **Base Repository** (`src/repositories/BaseRepository.js`)

Abstract base class cho tất cả repositories.

**Features:**
- ✅ Auto-initialize database connection
- ✅ ObjectId conversion utilities
- ✅ Common CRUD operations
- ✅ Pagination support
- ✅ Aggregation support
- ✅ Auto-update `updatedAt` field
- ✅ Error handling

**Common methods:**
```javascript
// Find operations
await repo.findById(id, projection);
await repo.findOne(query, projection);
await repo.find(query, options);
await repo.count(query);
await repo.exists(query);

// Insert operations
await repo.insertOne(document);
await repo.insertMany(documents);

// Update operations
await repo.updateOne(query, update, options);
await repo.updateMany(query, update, options);
await repo.updateById(id, update, options);

// Delete operations
await repo.deleteOne(query);
await repo.deleteMany(query);
await repo.deleteById(id);

// Advanced operations
await repo.aggregate(pipeline, options);
await repo.paginate(query, page, perPage, options);

// Utilities
repo.toObjectId(value);
repo.toObjectIds(values);
```

---

### 5. **UserRepository** (`src/repositories/UserRepository.js`)

Ví dụ repository đã refactor hoàn chỉnh.

**Features:**
- ✅ Extends BaseRepository
- ✅ Uses UserEntity for validation
- ✅ Uses constants for roles, genders, limits
- ✅ Throws custom errors
- ✅ Clean, readable code
- ✅ No duplicate code

**Sử dụng:**
```javascript
import UserRepository from "../repositories/UserRepository.js";

const userRepo = new UserRepository();

// Create user (auto-validate, auto-hash password)
const user = await userRepo.create({
  email: "test@test.com",
  password: "123456",
  role: "user"
});

// Find user
const user = await userRepo.findByEmail("test@test.com");
const user = await userRepo.findById(userId);
const user = await userRepo.findByIdSafe(userId); // without password

// Update user
await userRepo.updateUser(userId, { fullname: "John Doe" });
await userRepo.updatePassword(userId, "newpassword");
await userRepo.updateRole(userId, "admin");

// Verify user
await userRepo.verifyUser(userId);

// Compare password
const isMatch = await userRepo.comparePassword("123456", user.password);
```

---

## 📝 TODO: Refactor các models còn lại

### Cần refactor:

1. **GroupWordModel** → **GroupWordRepository**
2. **CategoryModel** → **CategoryRepository**
3. **FlashcardGroupModel** → **FlashcardGroupRepository**
4. **FlashcardModel** → **FlashcardRepository**
5. **WordModel** → **WordRepository**
6. **RefreshTokenModel** → **RefreshTokenRepository**

### Template để refactor:

```javascript
/**
 * [Entity]Repository.js
 */

import { BaseRepository } from "./BaseRepository.js";
import { [Entity]Entity } from "../entities/[Entity].entity.js";
import { COLLECTIONS, ERROR_MESSAGES } from "../constants/index.js";
import { ValidationError, NotFoundError } from "../errors/AppError.js";

export class [Entity]Repository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.[COLLECTION_NAME]);
  }

  async createIndexes() {
    try {
      // Create indexes
      await this.collection.createIndex({ ... });
      console.log("✅ [Entity] indexes created successfully");
    } catch (error) {
      console.error("⚠️ [Entity] index creation failed:", error.message);
    }
  }

  // Specific methods for this entity
  async customMethod() {
    await this.init();
    // Implementation
  }
}

export default [Entity]Repository;
```

---

## 🔄 Migration Strategy

### Phase 1: ✅ DONE
- ✅ Create entities
- ✅ Create constants
- ✅ Create custom errors
- ✅ Create BaseRepository
- ✅ Create UserRepository (example)

### Phase 2: TODO
- [ ] Create GroupWordRepository
- [ ] Create CategoryRepository
- [ ] Create FlashcardGroupRepository
- [ ] Create FlashcardRepository
- [ ] Create WordRepository
- [ ] Create RefreshTokenRepository

### Phase 3: TODO
- [ ] Update controllers to use repositories instead of models
- [ ] Update services to use repositories
- [ ] Remove old models
- [ ] Update tests

### Phase 4: TODO (Optional)
- [ ] Create Service Layer for complex business logic
- [ ] Add DTOs (Data Transfer Objects)
- [ ] Add Request/Response validators
- [ ] Add unit tests for repositories

---

## 💡 Best Practices

### 1. **Always use constants**
```javascript
// ❌ Bad
if (status === "new") { ... }

// ✅ Good
import { FLASHCARD_STATUS } from "../constants/index.js";
if (status === FLASHCARD_STATUS.NEW) { ... }
```

### 2. **Always use custom errors**
```javascript
// ❌ Bad
throw new Error("Not found");

// ✅ Good
throw new NotFoundError("User");
```

### 3. **Always validate with entities**
```javascript
// ❌ Bad
if (!data.name) throw new Error("Name required");

// ✅ Good
const entity = new UserEntity(data);
const validation = entity.validate();
if (!validation.isValid) {
  throw new ValidationError("Validation failed", validation.errors);
}
```

### 4. **Use repository methods**
```javascript
// ❌ Bad
const objectId = new ObjectId(id);
const user = await collection.findOne({ _id: objectId });

// ✅ Good
const user = await userRepo.findById(id);
```

### 5. **Separation of Concerns**
- **Entities**: Data structure + validation
- **Repositories**: Database operations
- **Services**: Business logic (if complex)
- **Controllers**: Request/response handling
- **Middleware**: Cross-cutting concerns

---

## 🎯 Benefits

1. **Maintainability**: Code dễ maintain hơn
2. **Testability**: Dễ test hơn với clear separation
3. **Scalability**: Dễ scale và extend
4. **Consistency**: Code consistent across codebase
5. **Type Safety**: Clear entity definitions
6. **Error Handling**: Structured error handling
7. **Reusability**: Base repository được reuse
8. **Documentation**: Self-documenting code

---

## 📚 Next Steps

1. **Refactor remaining models** theo template trên
2. **Update controllers** để sử dụng repositories
3. **Add Service Layer** nếu business logic phức tạp
4. **Write tests** cho repositories
5. **Update documentation** cho APIs

---

## ✅ Checklist

- [x] Create entity schemas
- [x] Create constants
- [x] Create custom errors
- [x] Create BaseRepository
- [x] Create UserRepository (example)
- [ ] Create remaining repositories
- [ ] Update controllers
- [ ] Remove old models
- [ ] Add tests
- [ ] Update API documentation

---

**Tác giả**: Senior Developer
**Ngày**: 2025-10-13
**Version**: 1.0.0
