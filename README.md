# Learning Middleware (LMW) - iREL

An AI-powered adaptive learning platform that personalizes educational content for each learner using LLM-based content generation.

## 🎯 Overview

The Learning Middleware is a microservices-based platform that:
- **Personalizes content** per learner based on their preferences (detail level, explanation style, language)
- **Generates modules** dynamically using AI/LLM tailored to individual learning styles
- **Creates quizzes** automatically from module content using RAG (Retrieval-Augmented Generation)
- **Caches content** in database to avoid regenerating the same content
- **Provides chat support** with course materials via RAG

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
┌──────▼────────────────────────────────────────┐
│           UI (Next.js Frontend)                │
│  - Learner Portal  - Instructor Portal         │
└──────┬────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│          Microservices Layer                 │
├──────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Learner    │  │  Learner Orchestrator│ │
│  │   Service    │  │  (Business Logic)    │ │
│  └──────┬───────┘  └──────┬───────────────┘ │
│         │                 │                  │
│  ┌──────▼─────────────────▼───────────────┐ │
│  │         SME Service (AI Engine)        │ │
│  │  - Module Generation  - Quiz Gen       │ │
│  │  - Chat (RAG)         - LO Generation  │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│           Data Layer                         │
│  ┌────────────┐  ┌──────────────┐           │
│  │ PostgreSQL │  │   MongoDB    │           │
│  │ (Relational)│  │ (Preferences)│           │
│  └────────────┘  └──────────────┘           │
└──────────────────────────────────────────────┘
```

## 📦 Services

| Service | Port | Purpose | Tech Stack |
|---------|------|---------|------------|
| **UI** | 3000 | Web interface for learners & instructors | Next.js 15, React, TypeScript, Tailwind |
| **Learner Service** | 5001 | Auth, enrollment, progress tracking | FastAPI, SQLAlchemy, PostgreSQL |
| **Instructor Service** | 5002 | Course/module management | FastAPI, SQLAlchemy, PostgreSQL |
| **Learner Orchestrator** | 8001 | Business logic, coordinates services | FastAPI, MongoDB (prefs), PostgreSQL |
| **SME Service** | 8000 | AI content generation (LLM) | FastAPI, LangChain, FAISS, vLLM |
| **PostgreSQL** | 5432 | Primary database | PostgreSQL 15 |
| **MongoDB** | 27017 | Learning preferences storage | MongoDB 7 |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for UI development)
- Python 3.10+ (for backend development)
- 16GB+ RAM (for LLM operations)

### 1. Clone Repository
```bash
git clone <repository-url>
cd Learning-Middleware-iREL
```

### 2. Start All Services
```bash
# Start all services with Docker Compose
docker compose up -d

# Check status
docker compose ps
```

### 3. Initialize Database
```bash
# Database schema is auto-created on first run
# Check PostgreSQL logs
docker compose logs postgres

# Check MongoDB logs
docker compose logs mongodb
```

### 4. Access Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| **Learner UI** | http://localhost:3000 | Sign up required |
| **Instructor UI** | http://localhost:3000/instructor | Sign up required |
| **Learner API Docs** | http://localhost:5001/docs | - |
| **Instructor API Docs** | http://localhost:5002/docs | - |
| **Orchestrator API Docs** | http://localhost:8001/docs | - |
| **SME API Docs** | http://localhost:8000/docs | - |

## 📚 Core Workflows

### Learner Flow
```
1. Sign Up / Login → Create account
2. Browse Courses → View available courses
3. Enroll → Join a course
4. Set Preferences → First time opening a module
   - Detail Level: detailed/moderate/brief
   - Explanation Style: examples-heavy/conceptual/practical/visual
   - Language: simple/technical/balanced
5. View Module → AI generates personalized content
   - Content cached in DB for future visits
6. Take Quiz → AI generates quiz from content
   - Quiz cached in DB for consistency
7. Complete Module → Progress tracked
8. Repeat for next modules
```

### Instructor Flow
```
1. Sign Up / Login → Create account
2. Create Course → Define course details
3. Add Modules → Specify:
   - Module title & description
   - Learning objectives
4. Upload Course Materials → PDFs for RAG
5. Publish Course → Make available to learners
```

## 🔧 Development

### UI (Frontend)
```bash
cd ui
pnpm install
pnpm run dev
# Access at http://localhost:3000
```

### Backend Services
```bash
# Learner Service
cd learner
pip install -r requirements.txt
uvicorn main:app --reload --port 5001

# Instructor Service
cd instructor
pip install -r requirements.txt
uvicorn main:app --reload --port 5002

# Orchestrator
cd learner-orchestrator
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# SME Service
cd sme
pip install -r requirements.txt
uvicorn apiserver:app --reload --port 8000
```

## 🐛 Debugging & Logs

### View Logs for Specific Service
```bash
# Real-time logs
docker compose logs -f <service-name>

# Last 100 lines
docker compose logs --tail 100 <service-name>

# Service names: ui, learner, instructor, learner-orchestrator, sme, postgres, mongodb
```

### Common Issues

**Port already in use:**
```bash
docker compose down
# Change port in docker-compose.yml
docker compose up -d
```

**Database connection errors:**
```bash
# Restart databases
docker compose restart postgres mongodb
# Check if they're healthy
docker compose ps
```

**Module content not generating:**
```bash
# Check SME service logs
docker compose logs -f sme
# Check orchestrator logs
docker compose logs -f learner-orchestrator
```

**UI not connecting to backend:**
```bash
# Check .env.local in ui/ folder
# Verify NEXT_PUBLIC_LEARNER_API_BASE_URL and NEXT_PUBLIC_ORCHESTRATOR_API_BASE
```

## 📖 Service Documentation

Each service has detailed documentation:
- [UI Documentation](./ui/README.md) - Frontend architecture and components
- [Learner Service](./learner/README.md) - Authentication, enrollment, progress
- [Instructor Service](./instructor/README.md) - Course management
- [Learner Orchestrator](./learner-orchestrator/README.md) - Business logic coordination
- [SME Service](./sme/README.md) - AI content generation

## 🗄️ Database Schema

- [Database Schema Documentation](./database/schema.md) - Complete PostgreSQL schema
- [Database Initialization](./database/init.sql) - SQL setup script

### Key Tables
- **Learner/Instructor** - User accounts
- **Course** - Course catalog
- **Module** - Course modules with learning objectives
- **GeneratedModuleContent** - Personalized content per learner
- **GeneratedQuiz** - Personalized quizzes per learner
- **EnrolledCourses** - Enrollment tracking
- **CourseContent** - Progress tracking

### MongoDB Collections
- **CourseContent_Pref** - Learning preferences (3 fields per learner per course)

## 🔑 Key Features

### 1. Content Personalization
- Each learner gets unique content based on their preferences
- Content generated once and cached in database
- Preferences: DetailLevel, ExplanationStyle, Language

### 2. Quiz Generation
- Quizzes auto-generated from module content
- Uses RAG to pull relevant context from course materials
- Cached per learner for consistency
- Multiple choice format

### 3. Chat Support
- RAG-based chat with course materials
- Uses FAISS vector store for similarity search
- Answers questions based on uploaded PDFs

### 4. Progress Tracking
- Module completion status
- Quiz scores
- Course progress percentage

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS enabled for frontend
- Environment variables for secrets

## 🧪 Testing

```bash
# Check all services are running
docker compose ps

# Test learner signup
curl -X POST http://localhost:5001/api/learner/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","first_name":"Test","last_name":"User"}'

# Test course listing
curl http://localhost:5001/api/learner/courses
```

## 📝 Environment Variables

Create `.env` files in each service directory:

**UI (.env.local):**
```
NEXT_PUBLIC_LEARNER_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_INSTRUCTOR_API_BASE_URL=http://localhost:5002
NEXT_PUBLIC_ORCHESTRATOR_API_BASE=http://localhost:8001
```

**Backend Services (.env):**
```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learning_middleware
MONGODB_URL=mongodb://mongodb:27017/
SECRET_KEY=your-secret-key-here
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📧 Support

For questions or issues, contact the iREL team.

## 📄 License

[Add license information]