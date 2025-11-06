# Constellation Consolidator - Deployment Guide

This guide will walk you through deploying the Constellation Consolidator application to create a public demo link.

## Overview

We'll deploy using:
- **Frontend**: Vercel (free tier)
- **Backend + Database**: Render (free tier)

## Prerequisites

1. GitHub account
2. Vercel account (sign up at https://vercel.com)
3. Render account (sign up at https://render.com)

## Step 1: Push Code to GitHub

If you haven't already, create a GitHub repository and push your code:

```bash
cd "/Users/steen/ai-voice-agent/Financial consolidation platform/constellation-consolidator"
git init
git add .
git commit -m "Initial commit - Constellation Consolidator"
gh repo create constellation-consolidator --public --source=. --remote=origin --push
```

Or manually:
1. Go to https://github.com/new
2. Create a new public repository named `constellation-consolidator`
3. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/constellation-consolidator.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Render

### 2.1 Create PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Configuration:
   - **Name**: `consolidator-db`
   - **Database**: `consolidator`
   - **User**: `consolidator_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free
4. Click "Create Database"
5. **IMPORTANT**: Copy the "Internal Database URL" - you'll need this

### 2.2 Deploy Backend Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configuration:
   - **Name**: `constellation-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. **Environment Variables** - Click "Advanced" and add:
   ```
   DATABASE_URL = <paste your Internal Database URL from step 2.1>
   SECRET_KEY = <generate a random 32+ character string>
   ENVIRONMENT = production
   DATABASE_ECHO = False
   CORS_ORIGINS = https://your-app.vercel.app
   ```

   To generate SECRET_KEY, run in terminal:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

5. Click "Create Web Service"
6. Wait for deployment to complete (5-10 minutes)
7. **Copy your backend URL** (e.g., `https://constellation-backend.onrender.com`)

### 2.3 Initialize Database

Once backend is deployed:
1. Go to your backend service in Render
2. Click "Shell" tab
3. Run:
   ```bash
   python3 create_second_parent.py
   ```
   This will create demo data with two parent companies.

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Configuration

1. Update `frontend/vercel.json` with your actual backend URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://constellation-backend.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. Commit the change:
   ```bash
   git add frontend/vercel.json
   git commit -m "Update backend URL for deployment"
   git push
   ```

### 3.2 Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow prompts:
   - Link to existing project? No
   - Project name: `constellation-consolidator`
   - Directory: `./`
   - Override build settings? No

5. Deploy to production:
   ```bash
   vercel --prod
   ```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configuration:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Click "Deploy"

### 3.3 Update Backend CORS

After deploying frontend, you'll get a URL like `https://constellation-consolidator.vercel.app`

1. Go back to Render dashboard
2. Select your backend service
3. Go to "Environment"
4. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS = https://constellation-consolidator.vercel.app,http://localhost:3000
   ```
5. Save changes (service will automatically redeploy)

## Step 4: Test Your Deployment

1. Visit your Vercel URL: `https://constellation-consolidator.vercel.app`
2. Register a new account
3. You should be able to:
   - Create parent companies
   - Add member companies
   - Import transactions
   - View consolidations

## Demo Credentials

After running the database initialization script, you'll have two demo parent companies:
- **TechCorp Holdings** (9 member companies, USD, GAAP)
- **GlobalTech International** (1 member company, EUR, IFRS)

Register a new account to access these.

## Troubleshooting

### Frontend can't connect to backend
- Check that CORS_ORIGINS in backend includes your Vercel URL
- Check that vercel.json has the correct backend URL
- Check Render backend logs for errors

### Database connection errors
- Verify DATABASE_URL is correct in Render environment variables
- Check that the database is in the same region as the backend

### Build failures
- Check that all dependencies are in requirements.txt (backend)
- Check that package.json is correct (frontend)
- Review build logs in Render/Vercel dashboard

## Free Tier Limitations

**Render Free Tier**:
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month (enough for 1 service 24/7)

**Vercel Free Tier**:
- 100 GB bandwidth/month
- Unlimited deployments
- Always online (no spin-down)

## Your Public Demo Links

After deployment, you'll have:

**Frontend**: https://constellation-consolidator.vercel.app
**Backend API**: https://constellation-backend.onrender.com
**API Docs**: https://constellation-backend.onrender.com/docs

Share the frontend link for demos!

## Updating Your Deployment

To deploy updates:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```

3. Deployments are automatic:
   - Vercel: Deploys automatically on git push
   - Render: Deploys automatically on git push

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- GitHub Issues: Create an issue in your repository
