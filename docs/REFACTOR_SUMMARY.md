# Authentication Refactor Summary

## Overview
This document summarizes the refactoring of the authentication system to remove "Admin Mode" and implement username-based URL routing for user profiles.

## Changes Completed

### 1. Database Migration ✅

**File:** `/inventory-system/src/migrations/add_username_column.sql`

- Added `username` column (VARCHAR(50), unique, indexed)
- Made `password_hash` nullable for future OAuth support
- Added case-insensitive unique index on username
- Added check constraint for username format (3-50 chars, alphanumeric, underscore, hyphen)

**Migration Script Updated:** `/inventory-system/src/migrate.js`
- Added username migration to the migration runner

### 2. Backend Changes ✅

#### User Service (`/inventory-system/src/auth/user-service.js`)
- Updated `createUser()` to accept and insert username
- Added `getUserByUsername()` method for username lookups
- Updated `mapRowToUser()` to include username field

#### Auth Routes (`/inventory-system/src/routes/auth-new.js`)
- **Signup endpoint:** Now requires and validates username
  - Validates format: 3-50 chars, alphanumeric, underscore, hyphen
  - Checks for duplicate usernames
  - Returns username in response
- **Login endpoint:** Returns username in user object
- **Refresh endpoint:** Returns username in user object
- **Me endpoint:** Returns username in user object

#### Inventory Routes (`/inventory-system/src/routes/inventory.js`)
- Added **public endpoint** `/inventory/public?username=<username>`
  - No authentication required
  - Fetches inventory for specified username
  - Only shows non-hidden items
  - Returns user info (username, firstName, lastName)
- All other inventory routes remain protected and filter by authenticated user's ID

#### Inventory Service (`/inventory-system/src/services/inventoryService.js`)
- Updated `addInventoryItem()` to accept and insert `user_id`

### 3. Frontend Changes ✅

#### AuthContext (`/web/src/context/AuthContextNew.jsx`)
- **Removed:**
  - `isAdminMode` state
  - `toggleAdminMode()` function
  - `disableAdminMode()` function
  - `hasFeature()` function
  - `FEATURES` constant
- **Added:**
  - `canEdit(profileUsername)` - checks if logged-in user can edit profile
- **Updated:**
  - `signup()` now accepts username parameter
  - User object now includes username field

#### Signup Modal (`/web/src/components/SignupModal.jsx`)
- Added username input field
- Added username validation (3-50 chars, alphanumeric, _, -)
- Updated form submission to include username
- Added helper text explaining username is for public profile URL

### 4. Remaining Frontend Work (TODO)

The following changes still need to be made to complete the refactoring:

#### A. Install react-router-dom
```bash
cd web
npm install react-router-dom
```

#### B. Update main.jsx to use BrowserRouter
```jsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

#### C. Update App.jsx
1. Import `useSearchParams` from react-router-dom
2. Read `?u=username` query parameter
3. If no `?u` param, default to logged-in user's username
4. Fetch inventory using `/inventory/public?username=<username>` for public view
5. Determine edit permissions: `canEdit = loggedInUser.username === queryParamUsername`
6. Pass `canEdit` prop to all components that need it
7. Remove all `isAdminMode` and `hasFeature` references
8. Update header to show username and logout button

#### D. Update Inventory Components
- `InventoryCard.jsx` - Show/hide edit/delete buttons based on `canEdit` prop
- `AddItemModal.jsx` - Only show if `canEdit` is true
- Other modals - Conditionally render based on `canEdit`

#### E. Update Header/Navigation
- Display logged-in user's username
- Remove Admin Mode toggle
- Add "View My Profile" button that sets `?u=<myUsername>`
- Show logout button

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/inventory/public?username=<username>` - Get user's public inventory

### Protected Endpoints (Auth Required)
- `POST /api/auth/signup` - Create account (requires username)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info
- `GET /api/inventory` - Get authenticated user's inventory
- `POST /api/inventory` - Add inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- All other inventory routes

## URL Structure

- `/` - Redirects to logged-in user's profile
- `/?u=username` - View specific user's profile (read-only if not your profile)
- `/?u=<myUsername>` - View your own profile (edit mode enabled)

## Permission Logic

```javascript
// In App.jsx or relevant component
const { user, isAuthenticated, canEdit } = useAuth();
const [searchParams] = useSearchParams();
const profileUsername = searchParams.get('u') || user?.username;

// Determine if user can edit
const hasEditPermission = canEdit(profileUsername);

// Pass to components
<InventoryCard canEdit={hasEditPermission} />
<AddItemButton canEdit={hasEditPermission} />
```

## Testing Checklist

### Database
- [ ] Run migration: `npm run migrate`
- [ ] Verify `username` column exists in `users` table
- [ ] Verify unique index on username
- [ ] Verify password_hash is nullable

### Backend
- [ ] Signup with username works
- [ ] Username validation works (format, uniqueness)
- [ ] Login returns username
- [ ] Public inventory endpoint works
- [ ] Protected inventory routes still work

### Frontend
- [ ] Signup form includes username field
- [ ] Username validation shows errors
- [ ] User object includes username after login
- [ ] URL parameter `?u=username` works
- [ ] Edit mode enabled when viewing own profile
- [ ] Read-only mode when viewing other profiles
- [ ] Admin Mode toggle removed from UI

## Migration Commands

```bash
# 1. Run database migration
npm run migrate

# 2. Install react-router-dom (frontend)
cd web
npm install react-router-dom

# 3. Restart backend server
cd ../inventory-system
npm run dev

# 4. Restart frontend
cd ../web
npm run dev
```

## Breaking Changes

⚠️ **Important:** Existing users in the database will have `NULL` username values. You'll need to either:

1. Manually assign usernames to existing users via SQL:
```sql
UPDATE users SET username = 'user1' WHERE id = 1;
UPDATE users SET username = 'user2' WHERE id = 2;
```

2. Or require existing users to set a username on next login (requires additional UI)

## Next Steps

1. Complete remaining frontend work (items A-E above)
2. Test all functionality thoroughly
3. Update existing users with usernames
4. Deploy changes
