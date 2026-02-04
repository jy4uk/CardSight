# CORS Troubleshooting Guide

**Date:** February 3, 2026  
**Issue:** CORS errors in production preventing frontend from accessing backend API

---

## Common CORS Error Messages

### 1. No 'Access-Control-Allow-Origin' header
```
Access to XMLHttpRequest at '...' from origin 'https://cardsight.vercel.app' 
has been blocked by CORS policy: Response to preflight request doesn't pass 
access control check: No 'Access-Control-Allow-Origin' header is present on 
the requested resource.
```

**Cause:** Backend not configured to allow requests from your frontend domain.

**Solution:** Add your frontend domain to `allowedOrigins` in `server.js`.

### 2. Credentials flag mismatch
```
Access to XMLHttpRequest at '...' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Origin' header in the response 
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

**Cause:** Using `credentials: true` with wildcard origin.

**Solution:** Specify exact origins instead of `*`.

### 3. Preflight request failed
```
Access to XMLHttpRequest at '...' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

**Cause:** OPTIONS request not handled properly.

**Solution:** Ensure CORS middleware handles OPTIONS requests.

---

## Current Configuration

### Backend CORS Setup

**File:** `/inventory-system/src/server.js`

```javascript
const allowedOrigins = [
  'http://localhost:5173',           // Local development
  'https://card-pilot.vercel.app',   // Old production domain
  'https://cardsight.vercel.app',    // New production domain
  'https://cardsight-production.up.railway.app', // Backend itself
  process.env.FRONTEND_URL           // Environment variable override
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,                                    // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],                       // Expose cookies to frontend
  maxAge: 86400,                                        // Cache preflight for 24 hours
  preflightContinue: false,                             // Don't pass to next handler
  optionsSuccessStatus: 204                             // Success status for OPTIONS
};

app.use(cors(corsOptions));
```

### Frontend Configuration

**File:** `/web/src/utils/apiClient.js`

```javascript
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,  // CRITICAL: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## Debugging Steps

### 1. Check Backend Logs

Look for "CORS rejected origin" messages:

```bash
# Railway logs
railway logs

# Or check Railway dashboard
```

If you see rejected origins, add them to `allowedOrigins`.

### 2. Verify Frontend Domain

Check what origin the browser is sending:

```javascript
// In browser console
console.log(window.location.origin);
// Should output: https://cardsight.vercel.app
```

### 3. Test Preflight Request

Use curl to test OPTIONS request:

```bash
curl -X OPTIONS https://cardsight-production.up.railway.app/api/auth/login \
  -H "Origin: https://cardsight.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected response headers:**
```
Access-Control-Allow-Origin: https://cardsight.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### 4. Check Network Tab

In browser DevTools → Network tab:

1. Look for OPTIONS request (preflight)
2. Check response headers
3. Verify status code is 204 or 200

### 5. Verify Environment Variables

Check Railway environment variables:

```bash
railway variables
```

Ensure `NODE_ENV=production` is set.

---

## Common Fixes

### Fix 1: Add Missing Origin

If you see "CORS rejected origin: https://your-domain.com":

```javascript
const allowedOrigins = [
  // ... existing origins
  'https://your-domain.com',  // Add this
];
```

### Fix 2: Enable Credentials

If cookies aren't being sent:

```javascript
// Backend
credentials: true

// Frontend
withCredentials: true
```

### Fix 3: Add Missing Headers

If custom headers are blocked:

```javascript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Your-Custom-Header',  // Add custom headers here
],
```

### Fix 4: Handle Preflight

Ensure OPTIONS requests return quickly:

```javascript
optionsSuccessStatus: 204,
preflightContinue: false,
```

---

## Production Deployment Checklist

- [ ] Frontend domain added to `allowedOrigins`
- [ ] `credentials: true` set in CORS options
- [ ] `withCredentials: true` set in axios client
- [ ] Backend deployed with updated CORS config
- [ ] Test login from production frontend
- [ ] Check browser console for CORS errors
- [ ] Verify cookies are being set
- [ ] Test on multiple browsers

---

## Environment-Specific Configuration

### Development (localhost:5173)
```javascript
Origin: http://localhost:5173
CORS: Allowed ✅
Cookies: SameSite=lax
```

### Production (cardsight.vercel.app)
```javascript
Origin: https://cardsight.vercel.app
CORS: Allowed ✅
Cookies: SameSite=lax, Secure=true
```

### Vercel Rewrites (Same-Origin)
```javascript
Origin: https://cardsight.vercel.app
Request: /api/auth/login (relative)
Proxied to: https://cardsight-production.up.railway.app/api/auth/login
CORS: May not send Origin header (allowed)
```

---

## Testing CORS Configuration

### Test Script

Create a test file to verify CORS:

```javascript
// test-cors.js
import axios from 'axios';

const testCORS = async () => {
  try {
    const response = await axios.post(
      'https://cardsight-production.up.railway.app/api/auth/login',
      { email: 'test@example.com', password: 'test123' },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://cardsight.vercel.app'
        }
      }
    );
    console.log('✅ CORS working:', response.status);
  } catch (error) {
    console.error('❌ CORS error:', error.message);
    console.error('Response:', error.response?.data);
  }
};

testCORS();
```

Run:
```bash
node test-cors.js
```

---

## Quick Reference

### CORS Headers Explained

| Header | Purpose | Example |
|--------|---------|---------|
| `Access-Control-Allow-Origin` | Which origins can access | `https://cardsight.vercel.app` |
| `Access-Control-Allow-Credentials` | Allow cookies | `true` |
| `Access-Control-Allow-Methods` | Allowed HTTP methods | `GET, POST, PUT, DELETE` |
| `Access-Control-Allow-Headers` | Allowed request headers | `Content-Type, Authorization` |
| `Access-Control-Expose-Headers` | Headers visible to frontend | `Set-Cookie` |
| `Access-Control-Max-Age` | Preflight cache duration | `86400` (24 hours) |

---

## When to Update CORS Configuration

1. **Adding new frontend domain** → Add to `allowedOrigins`
2. **Using new custom headers** → Add to `allowedHeaders`
3. **New HTTP methods** → Add to `methods`
4. **Exposing new headers** → Add to `exposedHeaders`
5. **Changing cookie behavior** → Update `credentials`

---

## Security Best Practices

✅ **DO:**
- Use specific origins (not `*`)
- Enable credentials only when needed
- Limit allowed methods to what you use
- Set reasonable `maxAge` for preflight caching
- Log rejected origins for debugging

❌ **DON'T:**
- Use wildcard `*` with credentials
- Allow all origins in production
- Expose sensitive headers unnecessarily
- Set very long `maxAge` (makes updates slow)
- Ignore CORS errors (they indicate security issues)

---

## Support

If CORS errors persist after following this guide:

1. Check Railway logs for rejected origins
2. Verify frontend domain matches exactly (no trailing slash)
3. Test with curl to isolate frontend vs backend issues
4. Check if Vercel rewrites are working (should not see CORS errors)
5. Verify `NODE_ENV=production` is set on backend

---

**Remember:** With Vercel rewrites, most API calls should appear as same-origin and not trigger CORS at all. If you're seeing CORS errors, the rewrites may not be working correctly.
