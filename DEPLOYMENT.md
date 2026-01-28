# Card Safari Deployment Guide

Deploy your Card Safari inventory system using **Vercel** (frontend) + **Railway** (backend + PostgreSQL).

## Prerequisites

- GitHub account with your repo pushed
- Vercel account (free): https://vercel.com
- Railway account (free tier available): https://railway.app

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `card-safari` repository
5. Select the `inventory-system` folder as the root directory

### 1.2 Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create and connect the database
4. The `DATABASE_URL` environment variable is set automatically

### 1.3 Configure Environment Variables

In Railway, go to your service → **Variables** tab and add:

```
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app  (update after Vercel deploy)
```

### 1.4 Run Database Migrations

Option A: Use Railway's shell
1. Go to your service → **Settings** → **Run Command**
2. Temporarily change to: `node src/migrate.js && npm start`
3. Deploy once, then change back to: `npm start`

Option B: Connect locally
1. Get your DATABASE_URL from Railway
2. Run migrations locally: `DATABASE_URL=<your-url> npm run migrate`

### 1.5 Get Your Backend URL

After deployment, Railway provides a URL like:
```
https://card-safari-production.up.railway.app
```

Save this URL - you'll need it for the frontend.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your `card-safari` repository
4. Set the **Root Directory** to `web`

### 2.2 Configure Build Settings

Vercel should auto-detect these, but verify:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2.3 Add Environment Variables

In Vercel project settings → **Environment Variables**:

```
VITE_API_URL=https://your-railway-app.up.railway.app/api
```

Replace with your actual Railway URL from Step 1.5.

### 2.4 Deploy

Click **"Deploy"** and wait for the build to complete.

Your frontend URL will be:
```
https://card-safari.vercel.app
```

---

## Step 3: Update CORS (Important!)

Go back to Railway and update the `FRONTEND_URL` environment variable:

```
FRONTEND_URL=https://card-safari.vercel.app
```

This allows your backend to accept requests from your frontend.

---

## Step 4: Verify Deployment

1. Visit your Vercel URL
2. Check if the inventory loads
3. Try adding/editing items
4. Verify all features work

---

## Troubleshooting

### API Errors (CORS)
- Ensure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check Railway logs for errors

### Database Connection Issues
- Verify `DATABASE_URL` is set in Railway
- Check if PostgreSQL service is running

### Build Failures
- Check Vercel/Railway build logs
- Ensure all dependencies are in package.json

---

## Cost Summary

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/month | $20/month |
| Railway | $5 credit/month | Pay as you go |
| **Total** | **~$0-5/month** | Scales with usage |

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### Railway
1. Go to Service Settings → Domains
2. Add custom domain
3. Update DNS records

Remember to update `FRONTEND_URL` if you use a custom domain!

---

## Updating Your App

### Automatic Deployments
Both Vercel and Railway auto-deploy when you push to your main branch.

### Manual Deployments
- **Vercel**: Project → Deployments → Redeploy
- **Railway**: Service → Deployments → Redeploy

---

## Environment Variables Reference

### Backend (Railway)
```
DATABASE_URL=<auto-provided by Railway>
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-vercel-url.vercel.app
STRIPE_SECRET_KEY=<optional>
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-railway-url.up.railway.app/api
```
