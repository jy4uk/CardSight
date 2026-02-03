# Authentication Integration Guide

## Quick Start

This guide shows how to integrate the new authentication system into your existing CardPilot application.

## Step 1: Update Main App Entry Point

Replace the old `AuthContext` import with the new one in your `main.jsx` or `App.jsx`:

```jsx
// OLD - Remove this
// import { AuthProvider } from './context/AuthContext';

// NEW - Use this instead
import { AuthProvider } from './context/AuthContextNew';
import LoginModalNew from './components/LoginModalNew';
import SignupModalNew from './components/SignupModalNew';

function App() {
  return (
    <AuthProvider>
      {/* Your existing app components */}
      <YourMainApp />
      
      {/* Add these modals at the root level */}
      <LoginModalNew />
      <SignupModalNew />
    </AuthProvider>
  );
}
```

## Step 2: Update API Calls

### Option A: Migrate to Axios (Recommended)

Replace fetch calls with the new apiClient:

```jsx
// OLD
const response = await fetch(`${API_BASE}/inventory`);
const data = await response.json();

// NEW
import apiClient from './utils/apiClient';
const response = await apiClient.get('/inventory');
const data = response.data;
```

### Option B: Keep Fetch with Manual Token Management

If you prefer to keep using fetch:

```jsx
import { getAccessToken } from './utils/apiClient';

async function fetchWithAuth(url, options = {}) {
  const token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  
  if (response.status === 401) {
    // Trigger refresh via custom event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
  
  return response;
}
```

## Step 3: Add User Menu to Header

```jsx
import { useAuth } from './context/AuthContextNew';
import { LogOut, User, Lock } from 'lucide-react';

function Header() {
  const { 
    user, 
    isAuthenticated, 
    isAdminMode,
    logout, 
    openLoginModal,
    toggleAdminMode,
    disableAdminMode 
  } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between p-4">
        <h1>CardPilot</h1>
        
        <div className="flex items-center gap-4">
          {/* Admin Mode Toggle (Legacy Feature) */}
          {isAuthenticated && (
            <button
              onClick={() => {
                if (isAdminMode) {
                  disableAdminMode();
                } else {
                  const password = prompt('Enter admin password:');
                  if (password) toggleAdminMode(password);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1 rounded ${
                isAdminMode ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}
            >
              <Lock size={16} />
              {isAdminMode ? 'Admin Mode ON' : 'Admin Mode'}
            </button>
          )}
          
          {/* User Menu */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span className="text-sm font-medium">
                  {user.firstName || user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

## Step 4: Protect Routes/Components

### Method 1: Conditional Rendering

```jsx
function InventoryPage() {
  const { isAuthenticated, openLoginModal } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="text-center p-8">
        <h2>Please log in to view inventory</h2>
        <button onClick={openLoginModal} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Login
        </button>
      </div>
    );
  }
  
  return <YourInventoryComponent />;
}
```

### Method 2: useEffect Redirect

```jsx
function ProtectedPage() {
  const { isAuthenticated, openLoginModal } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      openLoginModal();
    }
  }, [isAuthenticated, openLoginModal]);
  
  if (!isAuthenticated) return null;
  
  return <ProtectedContent />;
}
```

### Method 3: Higher-Order Component

```jsx
function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, openLoginModal } = useAuth();
    
    useEffect(() => {
      if (!isAuthenticated) {
        openLoginModal();
      }
    }, [isAuthenticated, openLoginModal]);
    
    if (!isAuthenticated) return null;
    
    return <Component {...props} />;
  };
}

// Usage
const ProtectedInventory = withAuth(InventoryPage);
```

## Step 5: Feature-Based Access Control

The new system preserves the legacy admin mode while adding user authentication:

```jsx
function FeatureComponent() {
  const { hasFeature, isAuthenticated, isAdminMode } = useAuth();
  
  // Check if user has access to a feature
  const canManageInventory = hasFeature('manage_inventory');
  const canViewInsights = hasFeature('view_insights');
  
  return (
    <div>
      {/* Show different UI based on auth state */}
      {isAuthenticated && <p>Logged in as user</p>}
      {isAdminMode && <p>Admin mode active</p>}
      
      {/* Feature-gated content */}
      {canManageInventory && <InventoryManager />}
      {canViewInsights && <InsightsPanel />}
    </div>
  );
}
```

## Step 6: Handle Password Reset Flow

Add a route for the reset password page:

```jsx
// In your router configuration
import ResetPasswordPage from './components/ResetPasswordPage';

// Add route
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

Or if not using a router, handle it in App.jsx:

```jsx
function App() {
  const isResetPasswordPage = window.location.pathname === '/reset-password';
  
  if (isResetPasswordPage) {
    return <ResetPasswordPage />;
  }
  
  return <YourMainApp />;
}
```

## Step 7: Update Environment Variables

### Backend (.env)

```bash
# Add these to your .env file
ACCESS_TOKEN_SECRET=generate-a-random-secret-key-here
REFRESH_TOKEN_SECRET=generate-another-random-secret-key-here
ADMIN_PASSWORD=your-admin-password
FRONTEND_URL=http://localhost:5173
```

Generate secure secrets:
```bash
# In Node.js REPL
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000/api
```

## Step 8: Run Database Migration

```bash
cd inventory-system
npm run migrate
```

This creates the users table and adds user_id columns to existing tables.

## Step 9: Test the System

1. **Start Backend:**
   ```bash
   cd inventory-system
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd web
   npm run dev
   ```

3. **Test Flow:**
   - Click "Sign Up" to create an account
   - Verify you can log in
   - Test logout
   - Test "Forgot Password" flow
   - Test admin mode toggle (legacy feature)

## Migration Checklist

- [ ] Install dependencies (`jsonwebtoken`, `cookie-parser`, `axios`)
- [ ] Update environment variables
- [ ] Run database migration
- [ ] Replace AuthContext import
- [ ] Add Login/Signup modals to app root
- [ ] Update API calls to use apiClient
- [ ] Add user menu to header
- [ ] Protect sensitive routes/components
- [ ] Test all authentication flows
- [ ] Test admin mode still works
- [ ] Deploy and test in production

## Backward Compatibility

The new system is designed to work alongside the existing admin mode:

- **Admin Mode** (Legacy): Password-based toggle, no user account needed
- **User Auth** (New): Full user accounts with signup/login

Both can be active simultaneously:
- A user can be logged in AND have admin mode enabled
- Admin mode can be toggled independently of user auth
- All existing admin mode functionality is preserved

## Common Issues

### Cookies not being set

**Problem:** Refresh token cookie not appearing in browser

**Solution:**
- Check CORS configuration allows credentials
- Verify `withCredentials: true` in axios config
- Ensure FRONTEND_URL matches your actual frontend URL

### 401 errors on every request

**Problem:** Access token not being sent

**Solution:**
- Check that `setAccessToken()` is called after login
- Verify axios interceptor is properly configured
- Check browser console for errors

### Admin mode not working

**Problem:** Admin mode toggle fails

**Solution:**
- Verify ADMIN_PASSWORD is set in .env
- Check that `/api/auth/admin/login` endpoint is accessible
- Ensure you're using the correct password

## Next Steps

After integration:
1. Customize the login/signup UI to match your brand
2. Implement email sending for password resets
3. Add user profile management
4. Consider adding OAuth providers
5. Implement role-based access control (RBAC)
