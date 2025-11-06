#!/bin/bash

# Constellation Consolidator - Quick Deploy Script
# This script helps you deploy the application to Vercel and Render

set -e

echo "🚀 Constellation Consolidator - Deployment Helper"
echo "=================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Constellation Consolidator"
fi

# Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found. Please install it or create repo manually."
    echo "   Install: https://cli.github.com/"
    echo ""
    echo "   Or create repo manually at: https://github.com/new"
    echo "   Then run: git remote add origin YOUR_REPO_URL"
    echo "   Then run: git push -u origin main"
    exit 1
fi

# Ask for repo creation
echo "📝 Would you like to create a GitHub repository? (y/n)"
read -r create_repo

if [ "$create_repo" = "y" ]; then
    echo "Creating GitHub repository..."
    gh repo create constellation-consolidator --public --source=. --remote=origin --push || true
    echo "✅ Repository created and code pushed!"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Deploy Backend (Render):"
echo "   - Go to: https://dashboard.render.com"
echo "   - Create PostgreSQL database (name: consolidator-db)"
echo "   - Create Web Service from your GitHub repo"
echo "   - Root directory: backend"
echo "   - Build: pip install -r requirements.txt"
echo "   - Start: uvicorn main:app --host 0.0.0.0 --port \$PORT"
echo ""
echo "2️⃣  Deploy Frontend (Vercel):"
echo "   Option A - CLI (recommended):"
echo "   $ cd frontend"
echo "   $ npm install -g vercel"
echo "   $ vercel"
echo ""
echo "   Option B - Dashboard:"
echo "   - Go to: https://vercel.com/new"
echo "   - Import your GitHub repo"
echo "   - Root directory: frontend"
echo ""
echo "3️⃣  Update CORS:"
echo "   - In Render, add environment variable:"
echo "   CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000"
echo ""
echo "4️⃣  Update frontend/vercel.json:"
echo "   - Replace backend URL with your Render URL"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md"
echo ""
echo "✨ Done! Your code is ready for deployment."
