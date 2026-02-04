# Cookie Session Persistence Fix - Production Cross-Origin Issue

**Date:** February 3, 2026  
**Issue:** Users logged out on page refresh in production (https://card-pilot.vercel.app)  
**Status:** ✅ FIXED

---

## Problem Summary

Users were being logged out immediately upon page refresh in production, even with "Remember Me" checked. This issue **only occurred in production**, not on localhost.

### Root Cause

The `refreshToken` HttpOnly cookie was being blocked by browsers in production due to **missing `trust proxy` configuration** in Express. Without this setting, Express cannot detect that the connection is HTTPS when behind a reverse proxy (Vercel/Railway), which prevents the `Secure` flag from being set correctly.

**Cross-origin cookie requirements:**
- Frontend: `https://card-pilot.vercel.app` (Vercel)
- Backend: Separate domain (Railway/etc)
- Cookies sent cross-origin **MUST** have `Secure` and `SameSite=None` attributes
- `Secure` flag **requires HTTPS** to be properly detected by Express

---

## The Fix

### 1. Trust Proxy Configuration (CRITICAL)

**File:** `/inventory-system/src/server.js`

```javascript
const app = express();

// Trust proxy - CRITICAL for production (Vercel/Railway/etc behind reverse proxy)
// This allows Express to correctly detect HTTPS and set Secure cookies
app.set('trust proxy', 1);
```

**Why this is critical:**
- Cloud platforms (Vercel, Railway, Heroku, etc.) use reverse proxies
- Without `trust proxy`, Express sees HTTP even though the connection is HTTPS
- This prevents the `Secure` flag from being set on cookies
- Browsers **block** cookies with `SameSite=None` that don't have `Secure` flag

### 2. Cookie Configuration

**File:** `/inventory-system/src/auth/jwt-utils.js`

```javascript
const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,                          // Prevent XSS attacks
  secure: isProduction,                    // MUST be true in production
  sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin
  maxAge: 30 * 24 * 60 * 60 * 1000,       // 30 days
  path: '/api/auth'                        // Restrict to auth routes
};
```

**Cookie attributes explained:**

| Attribute | Development | Production | Purpose |
|-----------|-------------|------------|---------|
| `httpOnly` | `true` | `true` | Prevents JavaScript access (XSS protection) |
| `secure` | `false` | `true` | Requires HTTPS (needed for SameSite=None) |
| `sameSite` | `lax` | `none` | Allows cross-origin cookies |
| `path` | `/api/auth` | `/api/auth` | Restricts cookie to auth routes only |
| `maxAge` | 30 days | 30 days | Cookie expiration time |

### 3. Clear Cookie Path Consistency

**File:** `/inventory-system/src/routes/auth-new.js`

Updated all `clearCookie` calls to include the path option:

```javascript
res.clearCookie('refreshToken', { path: '/api/auth' });
```

**Why this matters:**
- Cookies can only be deleted if the path matches exactly
- Without matching path, the cookie won't be cleared properly

### 4. CORS Configuration (Already Correct)

**File:** `/inventory-system/src/server.js`

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://card-pilot.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true  // CRITICAL: Allows cookies to be sent
};
```

---

## Testing

### Automated Tests

Created comprehensive test suite: `/inventory-system/tests/auth/cookie-security.test.js`

**Test coverage:**
- ✅ Secure and SameSite=None cookies in production
- ✅ SameSite=Lax cookies in development
- ✅ HttpOnly flag always set
- ✅ Cookie path restriction to `/api/auth`
- ✅ 30-day expiration with rememberMe
- ✅ CORS credentials allowed
- ✅ Trust proxy requirement demonstration

**Run tests:**
```bash
cd inventory-system
npm test tests/auth/cookie-security.test.js
```

### Manual Testing Checklist

#### Production Testing
1. ✅ Deploy backend with `trust proxy` enabled
2. ✅ Login from https://card-pilot.vercel.app
3. ✅ Check browser DevTools → Application → Cookies
4. ✅ Verify `refreshToken` cookie has:
   - `Secure` flag
   - `SameSite=None`
   - `HttpOnly` flag
   - `Path=/api/auth`
5. ✅ Refresh page - should stay logged in
6. ✅ Close browser and reopen - should stay logged in (if rememberMe was checked)

#### Development Testing
1. ✅ Login from http://localhost:5173
2. ✅ Verify cookie has:
   - `SameSite=Lax` (not None)
   - No `Secure` flag
   - `HttpOnly` flag
3. ✅ Refresh page - should stay logged in

---

## Browser Cookie Requirements

### Chrome/Edge/Brave
- Cross-origin cookies **MUST** have `Secure` and `SameSite=None`
- Blocks cookies without these attributes (console warning shown)

### Firefox
- Similar requirements to Chrome
- May show security warnings for cross-origin cookies

### Safari
- Strictest cookie policies
- May block third-party cookies entirely (user setting)
- Requires `Secure` and `SameSite=None` for cross-origin

---

## Deployment Checklist

### Backend Deployment
- [x] Set `NODE_ENV=production` environment variable
- [x] Ensure `trust proxy` is enabled in server.js
- [x] Verify HTTPS is enabled on hosting platform
- [x] Add production frontend URL to CORS allowed origins
- [x] Deploy and test cookie behavior

### Frontend Deployment
- [x] Ensure frontend uses HTTPS (Vercel does this automatically)
- [x] Configure API base URL to point to production backend
- [x] Test login flow from production frontend
- [x] Verify cookies are being sent with requests

---

## Common Issues & Solutions

### Issue: Cookies still not persisting in production

**Check:**
1. Is `trust proxy` set **before** any middleware?
2. Is `NODE_ENV=production` set in environment?
3. Is backend using HTTPS?
4. Are CORS credentials enabled?
5. Is frontend URL in allowed origins list?

**Debug:**
```javascript
// Add to server.js temporarily
app.use((req, res, next) => {
  console.log('Protocol:', req.protocol);
  console.log('Secure:', req.secure);
  console.log('X-Forwarded-Proto:', req.get('x-forwarded-proto'));
  next();
});
```

### Issue: Cookies work in development but not production

**Likely cause:** Missing `trust proxy` configuration

**Solution:** Add `app.set('trust proxy', 1);` before middleware

### Issue: Browser console shows "Cookie blocked" warning

**Likely cause:** `Secure` flag missing or `SameSite=None` without `Secure`

**Solution:** Verify `trust proxy` is set and `NODE_ENV=production`

### Issue: Logout doesn't clear cookie

**Likely cause:** `clearCookie` path doesn't match cookie path

**Solution:** Use `res.clearCookie('refreshToken', { path: '/api/auth' });`

---

## Security Considerations

### Why HttpOnly?
- Prevents JavaScript from accessing the cookie
- Protects against XSS attacks
- Refresh token cannot be stolen via malicious scripts

### Why Secure in Production?
- Ensures cookie only sent over HTTPS
- Prevents man-in-the-middle attacks
- Required for `SameSite=None` to work

### Why SameSite=None in Production?
- Allows cookies to be sent cross-origin
- Required when frontend and backend are on different domains
- Must be combined with `Secure` flag

### Why Path Restriction?
- Limits cookie scope to `/api/auth` routes only
- Reduces attack surface
- Cookie won't be sent to other API endpoints

---

## Performance Impact

**Minimal to none:**
- `trust proxy` is a simple Express setting (no overhead)
- Cookie configuration is static (no runtime cost)
- Path restriction may slightly reduce cookie transmission

---

## Monitoring & Logging

### Production Monitoring

Add logging to track cookie issues:

```javascript
// In auth routes
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    console.error('❌ Refresh failed: No cookie found', {
      cookies: Object.keys(req.cookies),
      headers: req.headers.cookie
    });
  }
  // ... rest of handler
});
```

### Metrics to Track
- Login success rate
- Token refresh success rate
- Cookie-related errors
- Session persistence rate

---

## References

### Documentation
- [Express Trust Proxy](https://expressjs.com/en/guide/behind-proxies.html)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Chrome SameSite Cookie Changes](https://www.chromium.org/updates/same-site)

### Related Files
- `/inventory-system/src/server.js` - Trust proxy configuration
- `/inventory-system/src/auth/jwt-utils.js` - Cookie options
- `/inventory-system/src/routes/auth-new.js` - Auth routes
- `/inventory-system/tests/auth/cookie-security.test.js` - Tests

---

## Summary

The session persistence bug was caused by **missing `trust proxy` configuration** in Express. Without this setting, Express cannot detect HTTPS behind a reverse proxy, which prevents the `Secure` flag from being set on cookies. Browsers require `Secure` flag for cross-origin cookies with `SameSite=None`, so the cookies were being blocked.

**The fix:**
1. ✅ Added `app.set('trust proxy', 1);` to server.js
2. ✅ Verified cookie configuration has `secure: true` in production
3. ✅ Updated all `clearCookie` calls to include path option
4. ✅ Created comprehensive tests to verify the fix

**Result:** Users can now stay logged in across page refreshes in production, and the "Remember Me" feature works correctly.
