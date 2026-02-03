# TypeScript Migration Guide

## Installation Steps

Run these commands in the `/inventory-system` directory:

```bash
# Install TypeScript and related dependencies
npm install --save-dev typescript ts-node nodemon @types/node @types/express @types/pg @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/cors

# Install tsx for running TypeScript directly (alternative to ts-node)
npm install --save-dev tsx
```

## Migration Strategy

This migration follows a **gradual approach** where TypeScript files coexist with JavaScript files:

1. **Phase 1**: Foundation (types, utilities, middleware) - COMPLETED
2. **Phase 2**: Service layer (business logic extraction) - IN PROGRESS
3. **Phase 3**: Routes conversion (one at a time)
4. **Phase 4**: Remove old .js files after verification

## File Conversion Order

### Completed
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `src/types/express/index.d.ts` - Express type extensions
- ✅ `src/types/db.ts` - Database schema interfaces
- ✅ `src/utils/AppError.ts` - Centralized error class
- ✅ `src/middleware/errorHandler.ts` - Global error handler
- ✅ `src/utils/apiResponse.ts` - Response standardization
- ✅ `src/services/db.ts` - Typed database service

### Next Steps
1. Create service layer classes (InventoryService, TradeService, etc.)
2. Convert middleware/auth.js to auth.ts
3. Convert routes one by one, using services
4. Update server.js to server.ts
5. Update package.json scripts

## Running the Application

### Development (with TypeScript)
```bash
npm run dev:ts
```

### Production Build
```bash
npm run build
npm start
```

## Package.json Scripts to Add

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "dev:ts": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit"
  }
}
```

## Architectural Improvements

### Before (JavaScript)
```javascript
// Route handler with mixed concerns
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      'SELECT * FROM inventory WHERE user_id = $1',
      [userId]
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

### After (TypeScript with Service Layer)
```typescript
// Clean route handler
router.get('/inventory', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;
  const inventory = await inventoryService.getInventoryByUserId(userId);
  sendSuccess(res, inventory);
}));

// Business logic in service
class InventoryService {
  async getInventoryByUserId(userId: number): Promise<InventoryItem[]> {
    return query<InventoryItem>(
      'SELECT * FROM inventory WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );
  }
}
```

## Benefits

1. **Type Safety**: Catch errors at compile time
2. **Better IDE Support**: Autocomplete, refactoring, navigation
3. **Separation of Concerns**: Routes → Services → Database
4. **Consistent Error Handling**: AppError + global middleware
5. **Standardized Responses**: apiResponse utilities
6. **Maintainability**: Clear structure, easier to test
7. **Documentation**: Types serve as inline documentation

## Notes

- The `next` parameter warning in errorHandler.ts is expected - Express requires it in error middleware signatures
- We're using `moduleResolution: "bundler"` to avoid deprecation warnings
- Strict mode is enabled for maximum type safety
- The service layer uses dependency injection patterns for testability
