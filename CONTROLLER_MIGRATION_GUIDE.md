# 🔄 Controller Migration Guide

## 📋 Overview

Hướng dẫn chi tiết cách migrate controllers từ sử dụng Models sang sử dụng Repositories.

---

## 🎯 Migration Strategy

### Step 1: Import Repositories thay vì Models

**Before:**
```javascript
import UserModel from "../models/User.js";
import GroupWordModel from "../models/GroupWord.js";
import CategoryModel from "../models/Category.js";
```

**After:**
```javascript
import UserRepository from "../repositories/UserRepository.js";
import GroupWordRepository from "../repositories/GroupWordRepository.js";
import CategoryRepository from "../repositories/CategoryRepository.js";
```

---

### Step 2: Initialize Repositories

**Before:**
```javascript
const userModel = new UserModel();
const groupWordModel = new GroupWordModel();
```

**After:**
```javascript
const userRepo = new UserRepository();
const groupWordRepo = new GroupWordRepository();
```

---

### Step 3: Use Custom Errors

**Before:**
```javascript
if (!user) {
  return res.apiError("User not found", 404);
}

const error = new Error("Invalid data");
error.status = 400;
throw error;
```

**After:**
```javascript
import { NotFoundError, ValidationError } from "../errors/AppError.js";

if (!user) {
  throw new NotFoundError("User");
}

throw new ValidationError("Invalid data", errors);
```

---

### Step 4: Use Constants

**Before:**
```javascript
if (role !== "superadmin") { ... }
const saltRounds = 12;
if (count >= 20) { ... }
```

**After:**
```javascript
import { USER_ROLES, LIMITS, ERROR_MESSAGES } from "../constants/index.js";

if (role !== USER_ROLES.SUPERADMIN) { ... }
const saltRounds = LIMITS.BCRYPT_SALT_ROUNDS;
if (count >= LIMITS.MAX_GROUP_WORDS_PER_USER) { ... }
```

---

## 📝 Example Migrations

### Example 1: AuthController - Register

**Before:**
```javascript
async register(req, res) {
  try {
    const { email, password, fullname, gender, phone_number } = req.body;

    if (!email || !password) {
      return res.apiError("Email and password are required", 400);
    }

    const userModel = new UserModel();
    const user = await userModel.create({
      email,
      password,
      fullname,
      gender,
      phone_number,
    });

    return res.apiSuccess(user, "User registered successfully");
  } catch (error) {
    if (error.status === 400) {
      return res.apiError(error.message, 400);
    }
    return res.apiError("Registration failed", 500);
  }
}
```

**After:**
```javascript
import UserRepository from "../repositories/UserRepository.js";
import { ValidationError } from "../errors/AppError.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/index.js";

async register(req, res) {
  try {
    const { email, password, fullname, gender, phone_number } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const userRepo = new UserRepository();
    const user = await userRepo.create({
      email,
      password,
      fullname,
      gender,
      phone_number,
    });

    return res.apiSuccess(user, SUCCESS_MESSAGES.USER_CREATED);
  } catch (error) {
    // Error middleware will handle this
    throw error;
  }
}
```

---

### Example 2: UserController - Create Group Word

**Before:**
```javascript
async createGroupWord(req, res) {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.apiError("Group word name is required", 400);
    }

    const groupWordModel = new GroupWordModel();
    
    // Check limit
    const count = await groupWordModel.countByUserId(userId);
    if (count >= 20) {
      return res.apiError("Maximum 20 group words allowed per user", 400);
    }

    const groupWord = await groupWordModel.create(userId, name);

    return res.apiSuccess(groupWord, "Group word created successfully");
  } catch (error) {
    return res.apiError(error.message, 500);
  }
}
```

**After:**
```javascript
import GroupWordRepository from "../repositories/GroupWordRepository.js";
import { ValidationError } from "../errors/AppError.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/index.js";

async createGroupWord(req, res) {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) {
      throw new ValidationError(ERROR_MESSAGES.GROUP_WORD_NAME_REQUIRED);
    }

    const groupWordRepo = new GroupWordRepository();
    
    // Repository will check limit and throw BusinessLogicError if exceeded
    const groupWord = await groupWordRepo.create(userId, name);

    return res.apiSuccess(groupWord, SUCCESS_MESSAGES.GROUP_WORD_CREATED);
  } catch (error) {
    throw error; // Error middleware will handle
  }
}
```

---

### Example 3: FlashcardController - Update Status

**Before:**
```javascript
async updateFlashcardStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.apiError("Status is required", 400);
    }

    const validStatuses = ["new", "learning", "mastered"];
    if (!validStatuses.includes(status)) {
      return res.apiError("Invalid status", 400);
    }

    const flashcardModel = new FlashcardModel();
    await flashcardModel.updateStatus(id, status);

    return res.apiSuccess(null, "Flashcard status updated successfully");
  } catch (error) {
    return res.apiError(error.message, 500);
  }
}
```

**After:**
```javascript
import FlashcardRepository from "../repositories/FlashcardRepository.js";
import { ValidationError } from "../errors/AppError.js";
import { FLASHCARD_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/index.js";

async updateFlashcardStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ValidationError("Status is required");
    }

    // Repository will validate status
    const flashcardRepo = new FlashcardRepository();
    await flashcardRepo.updateStatus(id, status);

    return res.apiSuccess(null, SUCCESS_MESSAGES.FLASHCARD_STATUS_UPDATED);
  } catch (error) {
    throw error;
  }
}
```

---

## 🔧 Error Handling Migration

### Update Error Middleware

Ensure your error middleware handles custom errors:

```javascript
// src/middleware/errorHandler.js
import { AppError } from "../errors/AppError.js";

export const errorHandler = (err, req, res, next) => {
  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      status_code: err.statusCode,
      data: null,
      meta: null,
      message: err.message,
      error_code: err.errorCode,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Handle validation errors with multiple errors
  if (err.errors && Array.isArray(err.errors)) {
    return res.status(err.statusCode || 400).json({
      success: false,
      status_code: err.statusCode || 400,
      data: null,
      meta: null,
      message: err.message,
      error_code: err.errorCode || "VALIDATION_ERROR",
      errors: err.errors,
    });
  }

  // Handle unknown errors
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    status_code: 500,
    data: null,
    meta: null,
    message: "Internal server error",
    error_code: "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
```

---

## 📋 Migration Checklist

### For each controller:

- [ ] Import repositories instead of models
- [ ] Import custom errors
- [ ] Import constants
- [ ] Replace model instantiation with repository
- [ ] Replace manual validation with entity validation (if applicable)
- [ ] Replace `return res.apiError()` with `throw CustomError()`
- [ ] Replace magic strings with constants
- [ ] Remove try-catch if only re-throwing (let error middleware handle)
- [ ] Update success messages to use constants
- [ ] Test the endpoint

---

## 🎯 Controllers to Migrate

### Priority 1 (High)
- [ ] `AuthController.js` - Uses UserModel
- [ ] `UserController.js` - Uses UserModel, GroupWordModel, CategoryModel

### Priority 2 (Medium)
- [ ] `FlashcardController.js` - Uses FlashcardGroupModel, FlashcardModel

### Priority 3 (Low)
- [ ] `WordController.js` - Uses WordModel (may need WordRepository)
- [ ] `ImportController.js` - Uses WordModel
- [ ] `TranslateController.js` - Uses WordModel

---

## 💡 Tips

### 1. **Let repositories handle validation**
Repositories already validate using entities, so you don't need to duplicate validation in controllers.

### 2. **Let error middleware handle errors**
Don't catch errors just to re-throw them. Let the error middleware handle all errors.

### 3. **Use constants everywhere**
Replace all magic strings and numbers with constants.

### 4. **Keep controllers thin**
Controllers should only:
- Extract data from request
- Call repository methods
- Return response

### 5. **Move complex logic to services**
If business logic is complex, create a service layer.

---

## 🧪 Testing After Migration

### Test each endpoint:

1. **Success case**
   ```bash
   # Should return success
   curl -X POST http://localhost:4000/api/users/group_words \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Group"}'
   ```

2. **Validation error**
   ```bash
   # Should return 400 with validation error
   curl -X POST http://localhost:4000/api/users/group_words \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Not found error**
   ```bash
   # Should return 404
   curl -X GET http://localhost:4000/api/users/group_words/invalid_id \
     -H "Authorization: Bearer $TOKEN"
   ```

4. **Business logic error**
   ```bash
   # Should return 422 when limit exceeded
   # Create 21 group words
   ```

---

## ✅ Success Criteria

After migration, your code should:

- ✅ Use repositories instead of models
- ✅ Use custom errors with proper status codes
- ✅ Use constants instead of magic strings/numbers
- ✅ Have consistent error handling
- ✅ Be more readable and maintainable
- ✅ Pass all existing tests
- ✅ Have no breaking changes in API responses

---

**Next Step**: Start with AuthController and UserController migration!
