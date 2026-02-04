# Authentication System Documentation

## Overview

CardSight uses a secure Access Token + Refresh Token authentication pattern with dual authentication modes:
testpassword
1. **User Authentication** - Full user account system with signup, login, password reset
2. **Admin Mode** - Legacy password-based admin toggle (preserved for backward compatibility)

## Architecture

### Token Strategy

- **Access Token**: Short-lived (15 minutes), stored in React memory/state
- **Refresh Token**: Long-lived (30 days), stored in HttpOnly, Secure, SameSite=Strict cookie
- **Silent Refresh**: Automatic token refresh on app load and 401 errors

### Security Features

- HttpOnly cookies prevent XSS attacks on refresh tokens
- Access tokens in memory prevent CSRF attacks
- Automatic token rotation on 401 responses
- Token versioning for "logout from all devices"
- Password strength validation
- Bcrypt password hashing (10 rounds)

## Backend API Endpoints

### Authentication Endpoints

#### POST `/api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```
*Sets `refreshToken` cookie*

#### POST `/api/auth/refresh`
Get new access token using refresh token cookie.

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST `/api/auth/logout`
Logout and invalidate all refresh tokens.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
*Clears `refreshToken` cookie*

#### POST `/api/auth/forgot-password`
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists, a reset link has been sent"
}
```

#### POST `/api/auth/reset-password`
Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newsecurepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### GET `/api/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Legacy Admin Mode

#### POST `/api/auth/admin/login`
Toggle admin mode with password.

**Request:**
```json
{
  "password": "admin-password"
}
```

**Response:**
```json
{
  "success": true,
  "role": "admin",
  "message": "Login successful"
}
```

## Frontend Usage

### AuthContext

```jsx
import { useAuth } from './context/AuthContextNew';

function MyComponent() {
  const {
    // User state
    user,
    loading,
    isAuthenticated,
    
    // Admin mode (legacy)
    isAdminMode,
    toggleAdminMode,
    disableAdminMode,
    
    // Auth functions
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    
    // Modal controls
    openLoginModal,
    openSignupModal,
    
    // Feature access
    hasFeature,
  } = useAuth();
  
  // Use authentication state
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <LoginPrompt />;
  
  return <div>Welcome {user.firstName}!</div>;
}
```

### Protected Routes

```jsx
function ProtectedComponent() {
  const { isAuthenticated, openLoginModal } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      openLoginModal();
    }
  }, [isAuthenticated, openLoginModal]);
  
  if (!isAuthenticated) return null;
  
  return <div>Protected content</div>;
}
```

### API Calls with Authentication

```jsx
import apiClient from './utils/apiClient';

// Automatically includes access token and handles refresh
async function fetchData() {
  const response = await apiClient.get('/inventory');
  return response.data;
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  refresh_token_version INTEGER DEFAULT 0,
  reset_token_hash VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Environment Variables

### Backend (.env)

```bash
# Required
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key

# Optional
ADMIN_PASSWORD=your-admin-password
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000/api
```

## Security Best Practices

1. **Never log tokens** - Access and refresh tokens should never be logged
2. **Use HTTPS in production** - Cookies require secure flag in production
3. **Rotate secrets regularly** - Change JWT secrets periodically
4. **Monitor failed login attempts** - Implement rate limiting
5. **Use strong passwords** - Enforce minimum 8 characters
6. **Validate email addresses** - Prevent invalid email formats
7. **Implement CSRF protection** - Already handled by SameSite cookies

## Migration Guide

### Running the Migration

```bash
npm run migrate
```

This will:
- Create the `users` table
- Add `user_id` columns to existing tables
- Create necessary indexes
- Set up default admin user

### Testing the System

1. Start the backend: `cd inventory-system && npm run dev`
2. Start the frontend: `cd web && npm run dev`
3. Navigate to http://localhost:5173
4. Click "Sign Up" to create an account
5. Test login/logout functionality
6. Test password reset flow

## Troubleshooting

### "Invalid or expired token" errors

- Check that cookies are enabled in browser
- Verify CORS settings allow credentials
- Ensure FRONTEND_URL matches your frontend URL

### Refresh token not working

- Check cookie settings in browser DevTools
- Verify `withCredentials: true` in axios config
- Ensure backend CORS allows credentials

### Admin mode not working

- Verify ADMIN_PASSWORD in .env
- Check that legacy route `/api/auth/admin/login` is accessible
- Ensure admin mode state is separate from user auth

## Future Enhancements

- [ ] Email verification on signup
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub)
- [ ] Session management dashboard
- [ ] IP-based rate limiting
- [ ] Audit logging for auth events
