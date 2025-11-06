# Constellation Consolidator 🌟

An AI-powered financial consolidation platform for multi-entity organizations.

## 🚀 Quick Deploy

Get your public demo link in 5 minutes:

```bash
./deploy.sh
```

Or follow the detailed guide in [DEPLOYMENT.md](DEPLOYMENT.md)

## ✨ Key Features

- **Multi-Parent Support**: Manage multiple parent companies with GAAP/IFRS
- **Transaction Import**: Drag-and-drop file uploads with history tracking
- **AI Account Mapping**: Intelligent chart of accounts mapping
- **Auto Consolidation**: Automated intercompany elimination
- **Excel Reports**: 17-sheet board-ready reports
- **Company Analytics**: Real-time dashboards and comparisons

## 📦 What You Need

- GitHub account (free)
- Vercel account (free)  
- Render account (free)

Total cost: $0/month

## 🌐 Deployment Stack

- **Frontend**: Vercel (React app, always online)
- **Backend**: Render (FastAPI)
- **Database**: Render PostgreSQL

## 📖 Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

## 💻 Local Development

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:
```bash
cd frontend  
npm install
npm start
```

Visit http://localhost:3000

---

**Deploy now**: `./deploy.sh`
