# Deploy to Replit

This backend is ready to deploy to Replit!

## Quick Deploy Steps:

1. Go to https://replit.com
2. Click "Create Repl"
3. Choose "Import from GitHub"
4. Enter repository URL: `https://github.com/repeatableai/financial-consolidation-platform`
5. Select the `backend` folder as the root
6. Replit will auto-detect the configuration from `.replit`

## Set Environment Variables (Secrets):

After creating the Repl, add these secrets in the Replit Secrets tab:

- `DATABASE_URL` - Use Replit's built-in PostgreSQL or external DB
- `SECRET_KEY` - Any secure random string (32+ characters)
- `OPENAI_API_KEY` - Your OpenAI API key
- `CORS_ORIGINS` - Your Vercel frontend URL

## Your Stable URL:

Once deployed, Replit will give you a permanent URL like:
`https://constellation-backend.yourusername.repl.co`

This URL never changes!
