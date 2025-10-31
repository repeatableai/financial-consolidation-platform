# Constellation Consolidator

**AI-Powered Financial Consolidation Platform**

A modern, enterprise-grade financial consolidation system with AI-powered account mapping and automated intercompany eliminations.

## Features

- 🔐 **Secure Authentication** - JWT-based user authentication
- 🏢 **Multi-Entity Management** - Manage multiple companies and legal entities
- 📊 **Master Chart of Accounts** - Unified accounting structure
- 🤖 **AI-Powered Account Mapping** - Intelligent account mapping using OpenAI
- 💰 **Transaction Management** - Import and manage financial transactions
- 🔄 **Automated Consolidation** - One-click financial consolidation
- 🔗 **Intercompany Eliminations** - Automatic detection and elimination
- 📈 **Financial Reports** - Consolidated financial statements

## Quick Start

### Prerequisites

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
- **OpenAI API Key** (optional, for AI features) - [Get one here](https://platform.openai.com/api-keys)

### Installation

1. **Extract the archive:**
   ```bash
   tar -xzf constellation-consolidator.tar.gz
   cd constellation-consolidator
   ```

2. **(Optional) Configure OpenAI API Key:**

   Edit the `.env` file and add your OpenAI API key:
   ```bash
   OPENAI_API_KEY=sk-your-api-key-here
   ```

3. **Start the application:**
   ```bash
   ./start.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## First Steps

1. **Register** - Create your user account at http://localhost:3000/register
2. **Create Organization** - Set up your organization details
3. **Add Companies** - Add the companies you want to consolidate
4. **Master Chart of Accounts** - Define your consolidated chart of accounts
5. **Map Accounts** - Use AI to map company accounts to master accounts
6. **Import Transactions** - Load transaction data for each company
7. **Run Consolidation** - Execute automated consolidation with eliminations
8. **Generate Reports** - View consolidated financial statements

## Managing the Application

### Start Services
```bash
./start.sh
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Check Service Status
```bash
docker-compose ps
```

## Architecture

### Technology Stack

**Backend:**
- Python 3.11
- FastAPI - Modern, fast web framework
- PostgreSQL - Relational database
- SQLAlchemy - ORM
- OpenAI API - AI-powered features
- JWT Authentication

**Frontend:**
- React 18
- React Router - Navigation
- Axios - HTTP client
- Modern CSS

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 15

### Services

The application consists of 3 Docker containers:

1. **PostgreSQL Database** (port 5432)
   - Stores all application data
   - 9 database tables

2. **Backend API** (port 8000)
   - RESTful API
   - Authentication & authorization
   - Business logic
   - AI integration

3. **Frontend App** (port 3000)
   - React single-page application
   - User interface

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Schema

The platform uses 9 main tables:

- **users** - User accounts and authentication
- **organizations** - Top-level organizational entities
- **companies** - Individual companies within organizations
- **master_accounts** - Consolidated chart of accounts
- **company_accounts** - Company-specific accounts
- **account_mappings** - Mappings between company and master accounts
- **transactions** - Financial transactions
- **consolidation_runs** - Consolidation execution records
- **intercompany_eliminations** - Detected intercompany transactions

## Configuration

### Environment Variables

Edit the `.env` file to configure:

```env
# OpenAI API Key (for AI features)
OPENAI_API_KEY=sk-your-api-key-here
```

### Database Configuration

Database settings are configured in `docker-compose.yml`:
- Host: localhost
- Port: 5432
- Database: consolidator
- Username: postgres
- Password: postgres

## Troubleshooting

### Docker Not Running
```
Error: Cannot connect to Docker daemon
```
**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use
```
Error: Port 3000/8000/5432 is already allocated
```
**Solution**: Stop the conflicting service or change the port in `docker-compose.yml`.

### Database Connection Error
```
Error: Could not connect to database
```
**Solution**:
1. Check PostgreSQL is running: `docker-compose ps`
2. Restart services: `docker-compose restart`
3. Check logs: `docker-compose logs postgres`

### Frontend Not Loading
**Solution**:
1. Check frontend logs: `docker-compose logs frontend`
2. Restart frontend: `docker-compose restart frontend`
3. Clear browser cache

## Development

### Project Structure
```
constellation-consolidator/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Database models
│   │   └── services/     # Business logic
│   ├── main.py           # FastAPI application
│   ├── init_db.py        # Database initialization
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # React context
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   ├── package.json      # Node dependencies
│   └── Dockerfile
├── docker-compose.yml    # Docker orchestration
├── start.sh              # Startup script
└── README.md             # This file
```

### Making Changes

1. Edit files in `backend/` or `frontend/` directories
2. Rebuild containers:
   ```bash
   docker-compose up -d --build
   ```

## Support & Documentation

- **Interactive API Docs**: http://localhost:8000/docs
- **GitHub Issues**: Report bugs and request features
- **API Reference**: Available in Swagger UI

## License

Enterprise Software License

## Version

Version 1.0.0 - Initial Release

---

Built with ❤️ using FastAPI, React, and OpenAI
