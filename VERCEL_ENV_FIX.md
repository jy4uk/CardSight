# Fix Session Persistence - Remove VITE_API_URL from Vercel

## Problem

Users are logged out on page refresh because the `refreshToken` cookie is set on the wrong domain:
- Cookie domain: `cardsight-production.up.railway.app` (backend)
- Frontend domain: `cardsight.vercel.app`

Browsers won't send cookies across different domains, so the refresh token can't be read.

## Root Cause

The `VITE_API_URL` environment variable in Vercel is set to point directly to the Railway backend URL (e.g., `https://cardsight-production.up.railway.app/api`).

This overrides the relative path logic in `apiClient.js`:

```javascript
// This line in apiClient.js
const API_BASE = import.meta.env.VITE_API_URL ||  // ❌ This is set in Vercel
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3000/api');
```

When `VITE_API_URL` is set, it bypasses the Vercel rewrites and makes requests directly to Railway.

## Solution

**Remove the `VITE_API_URL` environment variable from Vercel** to allow the relative path `/api` to be used in production, which triggers the Vercel rewrites.

### Step 1: Remove Environment Variable in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (cardsight)
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_URL`
5. **Delete it** (or set it to empty string)
6. Click **Save**

### Step 2: Redeploy

After removing the environment variable:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** button
4. Wait for deployment to complete

### Step 3: Verify

After redeployment:

1. **Clear browser cookies** (important!)
2. Go to https://cardsight.vercel.app
3. Login with "Remember Me" checked
4. Open DevTools → Application → Cookies
5. **Verify cookie domain is `cardsight.vercel.app`** (not Railway)
6. Refresh the page
7. **You should stay logged in** ✅

## How It Works After Fix

### Before (Broken)
```
Browser (cardsight.vercel.app)
    ↓ Request to https://cardsight-production.up.railway.app/api/auth/login
Railway Backend
    ↓ Set-Cookie: refreshToken; Domain=cardsight-production.up.railway.app
Browser ❌ Can't read cookie (different domain)
```

### After (Fixed)
```
Browser (cardsight.vercel.app)
    ↓ Request to /api/auth/login (relative path)
Vercel Proxy (rewrites to Railway)
    ↓ Proxied request
Railway Backend
    ↓ Set-Cookie: refreshToken
Vercel Proxy
    ↓ Cookie set on cardsight.vercel.app
Browser ✅ Can read cookie (same domain)
```

## Alternative: Update Environment Variable

If you need to keep `VITE_API_URL` for some reason, update it to use the **relative path**:

```
VITE_API_URL=/api
```

This will still trigger the Vercel rewrites.

## Verification Checklist

After deploying the fix:

- [ ] `VITE_API_URL` removed from Vercel environment variables
- [ ] Redeployed frontend
- [ ] Cleared browser cookies
- [ ] Logged in at https://cardsight.vercel.app
- [ ] Cookie domain is `cardsight.vercel.app` (check DevTools)
- [ ] Refreshed page - stayed logged in ✅
- [ ] Closed browser and reopened - stayed logged in ✅
- [ ] Tested on iOS Safari - stayed logged in ✅

## Testing on Different Domains

If you're using multiple domains (`cardsight.app`, `www.cardsight.app`), you'll need to:

1. Ensure all domains are added to Vercel project
2. Each domain will get its own cookies
3. Users logging in on `cardsight.app` won't be logged in on `www.cardsight.app` (different domains)
4. Consider redirecting `www.cardsight.app` → `cardsight.app` for consistency

## Troubleshooting

### Still logged out after fix?

1. **Clear all cookies** - old cookies on Railway domain may interfere
2. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check Network tab** - verify requests go to `/api/auth/login` (relative)
4. **Check cookie domain** - should be your Vercel domain, not Railway

### Requests still going to Railway directly?

1. Verify `VITE_API_URL` is actually removed (check Vercel dashboard)
2. Redeploy after removing the variable
3. Check build logs to confirm environment variable is not set

### Cookie not being set at all?

1. Check backend CORS configuration allows your domain
2. Verify `withCredentials: true` in apiClient.js
3. Check backend logs for CORS errors

## Summary

**Action Required:**
1. Remove `VITE_API_URL` from Vercel environment variables
2. Redeploy frontend
3. Clear browser cookies and test

**Expected Result:**
- Cookies set on `cardsight.vercel.app` domain
- Session persists across page refreshes
- "Remember Me" works for 30 days
- Works on iOS Safari and PWA mode

**Time to Fix:** 5 minutes
**Risk:** Low (easy to rollback by re-adding the variable)
