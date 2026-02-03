# Account Settings Feature Documentation

## Overview

A comprehensive Account Settings system that allows users to manage their profiles, bulk upload inventory via CSV, and delete their accounts. The feature includes proper authentication, validation, and user-friendly notifications.

---

## Backend Implementation

### 1. **Settings Routes** (`/inventory-system/src/routes/settings.js`)

#### PATCH `/api/user/settings` - Update User Profile

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe123",
  "email": "john@example.com"
}
```

**Features:**
- Updates first name, last name, username, and/or email
- Validates username format (3-50 chars, alphanumeric, underscores, hyphens)
- Checks username uniqueness (case-insensitive)
- Validates email format
- Checks email uniqueness
- Returns updated user object

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 5,
    "email": "john@example.com",
    "username": "johndoe123",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input (missing fields, invalid format)
- `409` - Username or email already taken
- `404` - User not found
- `500` - Server error

---

#### DELETE `/api/user/account` - Delete User Account

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "password": "user_password"
}
```

**Features:**
- Requires password verification for security
- Deletes all user data in correct order:
  1. Trade items
  2. Trades
  3. Saved deals
  4. Transactions
  5. Card shows
  6. Inventory
  7. Marks beta code as unused
  8. User record
- Clears refresh token cookie
- Invalidates session immediately

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**
- `400` - Password not provided
- `401` - Invalid password
- `404` - User not found
- `500` - Server error

---

### 2. **Bulk Inventory Upload** (`/inventory-system/src/routes/inventory.js`)

#### POST `/api/inventory/bulk` - Bulk Add Inventory

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "items": [
    {
      "card_name": "Charizard",
      "set_name": "Base Set",
      "card_number": "4",
      "game": "pokemon",
      "card_type": "raw",
      "purchase_price": 50.00,
      "front_label_price": 100.00,
      "condition": "NM",
      "quantity": 1,
      "barcode_id": "12345",
      "cert_number": "",
      "grade": "",
      "purchase_date": "2024-01-01"
    }
  ]
}
```

**Features:**
- Accepts up to 1000 items per request
- Auto-assigns `user_id` to each item
- Validates barcode uniqueness per user
- Auto-fetches card images for raw cards
- Returns detailed success/failure results
- Continues processing even if some items fail

**Response:**
```json
{
  "success": true,
  "message": "Added 48 of 50 items",
  "results": {
    "success": [
      {
        "index": 0,
        "item": { /* full item object */ }
      }
    ],
    "failed": [
      {
        "index": 1,
        "item": { /* original item data */ },
        "error": "Barcode already in use"
      }
    ],
    "total": 50
  }
}
```

---

## Frontend Implementation

### 1. **AccountSettings Component** (`/web/src/components/AccountSettings.jsx`)

A comprehensive modal with three tabs:

#### **Profile Tab**
- Edit first name, last name, username, and email
- Real-time validation
- Shows username in public profile URL preview
- Toast notifications for success/errors
- Updates AuthContext immediately on success

#### **Bulk Upload Tab**
- CSV file upload interface
- Download template button (generates sample CSV)
- Parses CSV with PapaParse library
- Maps CSV columns to inventory fields
- Shows detailed results (success count, failed items with errors)
- Supports flexible column naming:
  - `card_name` or `Card Name` or `name`
  - `set_name` or `Set Name` or `set`
  - etc.

**CSV Template:**
```csv
card_name,set_name,card_number,game,card_type,purchase_price,front_label_price,condition,quantity,barcode_id,cert_number,grade,purchase_date
Charizard,Base Set,4,pokemon,raw,50.00,100.00,NM,1,,,,"2024-01-01"
Pikachu,Base Set,58,pokemon,psa,25.00,75.00,PSA 10,1,,12345678,10,"2024-01-01"
```

#### **Danger Zone Tab**
- Delete account button
- Confirmation modal requiring password
- Clear warnings about permanent deletion
- Logs user out immediately after deletion

---

### 2. **Toast Notifications** (react-hot-toast)

**Installed:** `react-hot-toast` and `papaparse`

**Integration:**
- Added `<Toaster />` component to App.jsx
- Configured for light/dark theme support
- Position: top-right
- Duration: 4 seconds
- Custom styling for success (green) and error (red)

**Usage:**
```javascript
import toast from 'react-hot-toast';

toast.success('Profile updated successfully!');
toast.error('Failed to update profile');
toast.loading('Uploading...');
```

---

### 3. **Header Integration**

**Desktop Header:**
- Added Settings icon button next to Logout button
- Only visible when user is authenticated
- Opens AccountSettings modal on click

**Mobile Menu:**
- Added Settings button above Logout button
- Same functionality as desktop
- Closes mobile menu when clicked

---

## Security Features

### ✅ Implemented Security Measures

1. **JWT Authentication**
   - All endpoints require valid JWT token
   - Token verified via `authenticateToken` middleware
   - User ID extracted from token, not request body

2. **Password Verification**
   - Account deletion requires password confirmation
   - Uses bcrypt to verify password hash
   - Prevents accidental or unauthorized deletions

3. **Data Isolation**
   - All operations scoped to authenticated user
   - Cannot modify other users' data
   - Bulk upload auto-assigns user_id

4. **Input Validation**
   - Username format validation (regex)
   - Email format validation (regex)
   - Uniqueness checks for username/email
   - CSV parsing with error handling

5. **Session Management**
   - Refresh token cookie cleared on account deletion
   - User logged out immediately after deletion
   - AuthContext updated on profile changes

---

## User Experience Features

### Profile Management
- ✅ Update first name, last name, username, email
- ✅ Real-time validation feedback
- ✅ Username uniqueness check
- ✅ Email uniqueness check
- ✅ Public profile URL preview
- ✅ Immediate UI updates via AuthContext

### Bulk Inventory Upload
- ✅ CSV file upload with drag-and-drop support
- ✅ Downloadable CSV template
- ✅ Flexible column name mapping
- ✅ Auto-fetch card images for raw cards
- ✅ Detailed success/failure reporting
- ✅ Continues processing if some items fail
- ✅ Maximum 1000 items per upload

### Account Deletion
- ✅ Password confirmation required
- ✅ Clear warning messages
- ✅ Cascading deletion of all user data
- ✅ Beta code marked as unused
- ✅ Immediate logout after deletion
- ✅ Cannot be undone (permanent)

### Notifications
- ✅ Toast notifications for all actions
- ✅ Success messages (green)
- ✅ Error messages (red)
- ✅ Loading states with spinners
- ✅ Dark mode support

---

## Data Deletion Order

When a user deletes their account, data is deleted in this order to respect foreign key constraints:

1. **Trade Items** - Items in trades
2. **Trades** - All user's trades
3. **Saved Deals** - All saved deals
4. **Transactions** - All sales transactions
5. **Card Shows** - All card show records
6. **Inventory** - All inventory items
7. **Beta Code** - Mark as unused (if applicable)
8. **User** - Finally delete user record

---

## Testing Checklist

### Profile Update
- [ ] Update first name only
- [ ] Update last name only
- [ ] Update username only
- [ ] Update email only
- [ ] Update all fields at once
- [ ] Try duplicate username (should fail)
- [ ] Try duplicate email (should fail)
- [ ] Try invalid username format (should fail)
- [ ] Try invalid email format (should fail)
- [ ] Verify AuthContext updates immediately
- [ ] Verify toast notifications appear

### Bulk Upload
- [ ] Download CSV template
- [ ] Upload valid CSV with 10 items
- [ ] Upload CSV with duplicate barcodes (should show failures)
- [ ] Upload CSV with missing required fields (should show failures)
- [ ] Upload CSV with 1000 items (max limit)
- [ ] Try uploading 1001 items (should fail)
- [ ] Verify success/failure counts are accurate
- [ ] Verify failed items show error messages
- [ ] Verify inventory list updates after upload
- [ ] Test with different CSV column names

### Account Deletion
- [ ] Click Delete Account button
- [ ] Verify confirmation modal appears
- [ ] Try deleting without password (should fail)
- [ ] Try deleting with wrong password (should fail)
- [ ] Delete with correct password
- [ ] Verify user is logged out immediately
- [ ] Verify all user data is deleted
- [ ] Verify beta code is marked as unused
- [ ] Try logging in again (should fail - account gone)

### UI/UX
- [ ] Settings button appears in desktop header when logged in
- [ ] Settings button appears in mobile menu when logged in
- [ ] Settings button hidden when not logged in
- [ ] Modal opens/closes correctly
- [ ] Tab switching works smoothly
- [ ] All forms are responsive on mobile
- [ ] Toast notifications appear in correct position
- [ ] Dark mode styling works correctly
- [ ] Loading states show during async operations

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/api/user/settings` | ✅ | Update user profile |
| DELETE | `/api/user/account` | ✅ | Delete user account |
| POST | `/api/inventory/bulk` | ✅ | Bulk add inventory items |

---

## Files Modified/Created

### Backend
- ✅ `/inventory-system/src/routes/settings.js` (new)
- ✅ `/inventory-system/src/routes/inventory.js` (modified - added bulk endpoint)
- ✅ `/inventory-system/src/routes/index.js` (modified - registered settings routes)

### Frontend
- ✅ `/web/src/components/AccountSettings.jsx` (new)
- ✅ `/web/src/App.jsx` (modified - added Settings button, Toaster, modal)
- ✅ `/web/package.json` (modified - added react-hot-toast, papaparse)

### Documentation
- ✅ `/docs/ACCOUNT_SETTINGS_FEATURE.md` (this file)

---

## Dependencies Added

```json
{
  "react-hot-toast": "^2.4.1",
  "papaparse": "^5.4.1"
}
```

---

## Future Enhancements

### Potential Improvements
- [ ] Email verification for email changes
- [ ] Two-factor authentication
- [ ] Export user data before deletion (GDPR compliance)
- [ ] Soft delete with recovery period (30 days)
- [ ] Password change functionality
- [ ] Profile picture upload
- [ ] Bulk edit existing inventory
- [ ] Import from other formats (Excel, JSON)
- [ ] Scheduled bulk uploads
- [ ] Bulk upload history/logs

---

## Troubleshooting

### Common Issues

**Issue:** "Username already taken" error
- **Solution:** Try a different username. Usernames are case-insensitive and must be unique.

**Issue:** Bulk upload shows all items failed
- **Solution:** Check CSV format matches template. Ensure required fields (card_name, front_label_price) are present.

**Issue:** Account deletion fails
- **Solution:** Verify you're entering the correct password. Password is case-sensitive.

**Issue:** Toast notifications not appearing
- **Solution:** Check browser console for errors. Ensure react-hot-toast is installed.

**Issue:** Settings button not visible
- **Solution:** Ensure you're logged in. Settings only appears for authenticated users.

---

## Summary

The Account Settings feature provides users with complete control over their profile, inventory, and account lifecycle. It combines security best practices with an intuitive user interface, making it easy for users to manage their data while maintaining data integrity and isolation.

**Key Achievements:**
- ✅ Secure profile management with validation
- ✅ Efficient bulk inventory upload (up to 1000 items)
- ✅ Safe account deletion with password verification
- ✅ User-friendly toast notifications
- ✅ Responsive design for mobile and desktop
- ✅ Dark mode support
- ✅ Comprehensive error handling
- ✅ Immediate UI updates via AuthContext
