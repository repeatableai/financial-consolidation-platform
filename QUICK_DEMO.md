# 🎉 Your Constellation Consolidator Demo

## ✅ Frontend is LIVE!

**Demo URL**: https://frontend-ha1el97iz-kevin-4013s-projects.vercel.app

## 🚀 Complete Setup (5 minutes)

Your frontend is deployed but needs a backend. Here's the quickest way:

### Option 1: One-Click Deploy to Render (Recommended)

1. **Click this link**: https://dashboard.render.com/select-repo?type=blueprint

2. **Connect your GitHub**:
   - Repository: `repeatableai/financial-consolidation-platform`
   - Branch: `main`

3. **Click "Apply"**
   - Render will automatically create:
     - PostgreSQL database (free tier)
     - Backend API (free tier)
   - All environment variables are pre-configured!

4. **Wait 5-7 minutes** for deployment

5. **Get your backend URL**:
   - Copy it (looks like: `https://constellation-backend-xyz.onrender.com`)

6. **Update frontend**:
   ```bash
   # Edit frontend/vercel.json and replace the backend URL
   # Then redeploy:
   cd frontend
   vercel --prod
   ```

7. **Initialize demo data**:
   - In Render dashboard, click "Shell" on your backend service
   - Run: `python3 create_second_parent.py`

### Option 2: Use Mock Data (No Backend Needed)

If you just want to see the UI without backend:

The frontend will show error messages when trying to connect. To see it working with real data, you need the backend from Option 1.

## 📱 Demo Features

Once backend is connected:

1. **Register** a new account
2. **Create Parent Companies** with different currencies/standards
3. **Add Member Companies** to each parent
4. **Import Transactions** via drag-and-drop Excel/CSV
5. **View Uploaded Files** history
6. **Run Consolidations** across all companies
7. **Export Reports** to Excel (17 sheets!)
8. **Compare Companies** side-by-side

## 🎯 Demo Credentials

After running `create_second_parent.py`, you'll have:

**Parent Companies**:
- TechCorp Holdings (9 members, USD, GAAP)
- GlobalTech International (1 member, EUR, IFRS)

Just register any new account to access these!

## 🔧 Current URLs

- **Frontend**: https://frontend-ha1el97iz-kevin-4013s-projects.vercel.app
- **Backend**: (deploy using Option 1 above)
- **GitHub**: https://github.com/repeatableai/financial-consolidation-platform

## 💡 Quick Tips

- **Free tier limits**: Backend spins down after 15 min (30s to wake up)
- **Cost**: $0/month (using free tiers)
- **Updates**: Just `git push` to auto-deploy
- **Custom domain**: Add in Vercel/Render dashboards

## 🆘 Troubleshooting

**Frontend shows errors?**
- Backend not deployed yet - follow Option 1 above

**Can't login?**
- Make sure backend is deployed and CORS_ORIGINS includes your frontend URL

**Database errors?**
- Run `python3 create_second_parent.py` in Render shell

---

**Total setup time**: 5 minutes for fully working demo!
