# Learner Orchestrator Service

FastAPI-based service that coordinates business logic between the UI, learner service, and SME service.

## 🎯 Purpose

The Orchestrator acts as middleware between frontend and backend services:
- **Coordinates** requests from UI to SME (AI) and Learner services
- **Manages** learning preferences in MongoDB  
- **Orchestrates** module content and quiz generation workflows
- **Simplifies** frontend by providing unified API

## 🏗️ Architecture

```
learner-orchestrator/
├── main.py                    # FastAPI app entry point
├── routes.py                  # API endpoints
├── app/
│   ├── core/
│   │   └── config.py          # Configuration
│   ├── db/
│   │   ├── database.py        # MongoDB & PostgreSQL connections
│   │   ├── models.py          # Database models
│   │   └── schemas.py         # Pydantic schemas
│   └── services/
│       └── sme_client.py      # SME service HTTP client
└── docs/
    └── services/
        ├── learning_service.py    # Learning flow logic
        ├── profiling_service.py   # Preferences management
        └── analytics_service.py   # Performance metrics
```

## 🎯 Key Responsibilities

### 1. **Learning Preferences Management**
Stores learner preferences in MongoDB (NOT PostgreSQL).

**MongoDB Collection**: `CourseContent_Pref`
```json
{
  "_id": {
    "CourseID": "COURSE_123",
    "LearnerID": "learner-uuid"
  },
  "preferences": {
    "DetailLevel": "detailed",  // or "moderate", "brief"
    "ExplanationStyle": "examples-heavy",  // or "conceptual", "practical", "visual"
    "Language": "simple"  // or "technical", "balanced"
  },
  "lastUpdated": "2025-11-01T10:30:00Z"
}
```

### 2. **Module Content Generation**
Orchestrates personalized content generation:

```
UI → Orchestrator → SME Service
           ↓
    Learner Preferences (MongoDB)
           +
    Learning Objectives (PostgreSQL)
           ↓
    Generate personalized markdown content
```

### 3. **Quiz Generation**
Coordinates quiz creation using RAG:

```
UI → Orchestrator → SME Service
           ↓
    Module Content + Course ID
           ↓
    SME uses vector store (course PDFs)
           ↓
    Generate quiz questions
```

## 📡 API Endpoints

### Preferences Management

**POST /api/orchestrator/preferences**
Save or update learner preferences.
```json
{
  "course_id": "COURSE_123",
  "learner_id": "learner-uuid",
  "preferences": {
    "DetailLevel": "detailed",
    "ExplanationStyle": "practical",
    "Language": "balanced"
  }
}
```

**GET /api/orchestrator/preferences/{course_id}/{learner_id}**
Retrieve saved preferences.

### Module Content Generation

**POST /api/orchestrator/sme/generate-module**
Generate personalized module content.
```json
{
  "course_id": "COURSE_123",
  "learner_id": "learner-uuid",
  "module_name": "Concurrency",
  "learning_objectives": [
    "Understand threads vs processes",
    "Implement synchronization mechanisms"
  ]
}
```

Response:
```json
{
  "success": true,
  "module_name": "Concurrency",
  "content": "# Concurrency\n\n## Introduction\n..."
}
```

### Quiz Generation

**POST /api/orchestrator/sme/generate-quiz**
Generate quiz from module content.
```json
{
  "module_content": "# Module content in markdown...",
  "module_name": "Concurrency",
  "course_id": "COURSE_123"
}
```

Response:
```json
{
  "success": true,
  "quiz_data": {
    "questions": [
      {
        "question_no": "1",
        "question": "What is the difference between...",
        "options": {
          "A": "Option A",
          "B": "Option B",
          "C": "Option C",
          "D": "Option D"
        },
        "correct_answer": "B",
        "explanation": "..."
      }
    ],
    "total_questions": 10
  }
}
```

### Quiz Submission

**POST /api/orchestrator/quiz/submit**
Submit quiz answers and get results.
```json
{
  "learner_id": "learner-uuid",
  "module_id": "MODULE_123",
  "quiz_data": { quiz object },
  "answers": {
    "1": "B",
    "2": "A",
    "3": "C"
  }
}
```

### Health Checks

**GET /api/orchestrator/sme/health**
Check if SME service is accessible.

## 🔌 Service Integration

### SME Client (app/services/sme_client.py)

HTTP client for communicating with SME service:

```python
class SMEServiceClient:
    def __init__(self, base_url="http://sme:8000", timeout=3000):
        # 3000 seconds = 50 minutes for LLM operations
        
    def generate_module_content(course_id, user_profile, module_lo):
        # POST /generate-module
        # Returns personalized markdown content
        
    def generate_quiz(module_content, module_name, course_id):
        # POST /generate-quiz  
        # Returns quiz questions using RAG
```

**Key Feature**: 50-minute timeout for long-running LLM operations.

### MongoDB Integration

```python
# app/db/database.py
from pymongo import MongoClient

def get_mongo_db():
    client = MongoClient(MONGODB_URL)
    db = client["learning_middleware"]
    yield db
```

Collections:
- `CourseContent_Pref` - Learning preferences

### PostgreSQL Integration

Connects to same PostgreSQL as learner service for:
- Course and module lookups
- Progress tracking

## 🔄 Workflow Examples

### First-Time Module Access

```
1. Learner opens module for first time
2. UI shows preferences modal
3. Learner submits preferences:
   POST /orchestrator/preferences
   → Save to MongoDB
4. UI calls:
   POST /orchestrator/sme/generate-module
   {
     course_id, learner_id, module_name, learning_objectives
   }
5. Orchestrator:
   - Fetches preferences from MongoDB
   - Calls SME with preferences + LOs
6. SME generates personalized content
7. Returns markdown to UI
8. UI saves to PostgreSQL (cache)
9. Display content
```

### Revisiting Module

```
1. Learner opens module again
2. UI checks PostgreSQL cache:
   GET /learner/module/{id}/content
3. If found: Display immediately ✅
4. If not found: Repeat generation (shouldn't happen)
```

### Quiz Generation

```
1. Learner clicks "Continue to Quiz"
2. UI checks PostgreSQL cache:
   GET /learner/module/{id}/quiz
3. If found: Display immediately ✅
4. If not found:
   - POST /orchestrator/sme/generate-quiz
   - Orchestrator forwards to SME with course_id
   - SME uses vector store (course PDFs)
   - Generates questions with RAG
   - Returns quiz
   - UI saves to PostgreSQL
5. Display quiz
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# MongoDB
MONGODB_URL=mongodb://mongodb:27017/

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learning_middleware

# SME Service
SME_SERVICE_URL=http://sme:8000

# API
PROJECT_NAME=Learner Orchestrator Service
```

### Timeouts

Critical for LLM operations:
```python
# SME Client
timeout = 3000  # 50 minutes

# Why? LLM generation can take several minutes:
# - Content generation: 1-3 minutes
# - Quiz generation with RAG: 2-5 minutes
```

## 🐛 Debugging

### Check Logs
```bash
docker compose logs -f learner-orchestrator
```

### Common Issues

**Module generation timeout:**
```bash
# Check SME service
docker compose logs -f sme

# Verify SME is running
curl http://localhost:8000/

# Check timeout in sme_client.py (should be 3000 seconds)
```

**Preferences not saving:**
```bash
# Check MongoDB
docker exec -it lmw_mongodb mongosh

> use learning_middleware
> db.CourseContent_Pref.find().pretty()
```

**Quiz generation failing:**
```bash
# Verify course has vector store
docker compose exec sme ls /app/data/vector_store/

# Check if course PDFs were uploaded
docker compose logs -f sme | grep upload
```

## 📦 Dependencies

```txt
fastapi>=0.104.0
uvicorn>=0.24.0
pymongo>=4.6.0           # MongoDB client
motor>=3.3.0             # Async MongoDB
requests>=2.31.0         # HTTP client for SME
sqlalchemy>=2.0.0        # PostgreSQL ORM
pydantic>=2.0.0
```

## 🚢 Deployment

Configured in docker-compose.yml:
```yaml
learner-orchestrator:
  build: ./learner-orchestrator
  ports:
    - "8001:8000"
  environment:
    - MONGODB_URL=mongodb://mongodb:27017/
    - DATABASE_URL=postgresql://...
  depends_on:
    - mongodb
    - postgres
    - sme
```

## 🎯 Design Decisions

### Why Separate Orchestrator?

1. **Separation of Concerns**
   - Learner service: Data persistence, auth
   - Orchestrator: Business logic, workflow coordination
   - SME: AI/LLM operations

2. **Flexibility**
   - Can swap SME implementation without changing learner service
   - Can add caching layer in orchestrator
   - Can implement retry logic for LLM failures

3. **MongoDB for Preferences**
   - Only 3 preference fields → Document store is simpler
   - No joins needed
   - Easy to extend with more preference fields

### Why Not Put Everything in Learner Service?

- **Modularity**: Easier to maintain separate services
- **Scalability**: Can scale orchestrator independently
- **Technology Choice**: MongoDB for preferences, PostgreSQL for relational data

## 📞 Support

For orchestrator issues:
- API docs: http://localhost:8001/docs
- Logs: `docker compose logs -f learner-orchestrator`
- MongoDB: `docker exec -it lmw_mongodb mongosh`
- Check SME connectivity: `curl http://localhost:8000/`
