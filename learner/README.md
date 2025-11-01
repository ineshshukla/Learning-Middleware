# Learner Service

FastAPI-based microservice handling learner authentication, course enrollment, progress tracking, and content caching.

## 🎯 Purpose

The Learner Service manages all learner-related operations:
- **Authentication**: Signup, login, JWT tokens
- **Course Management**: Browse courses, enroll, view modules
- **Progress Tracking**: Module completion, quiz scores
- **Content Caching**: Store personalized module content and quizzes per learner

## 🏗️ Architecture

```
learner/
├── main.py              # FastAPI app entry point
├── routes.py            # API endpoints
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic schemas (request/response)
├── crud.py              # Database operations
├── auth.py              # JWT authentication
├── database.py          # Database connection
├── config.py            # Configuration settings
└── requirements.txt     # Python dependencies
```

## 🚀 Quick Start

### Standalone Development
```bash
cd learner
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

### With Docker
```bash
# From project root
docker compose up learner -d
```

Access API docs: http://localhost:5001/docs

## 🗄️ Database Models

### Core Models

#### 1. **Learner**
```python
- learnerid (PK)
- email (unique)
- password_hash
- first_name, last_name
- created_at, updated_at
```

#### 2. **Course**
```python
- courseid (PK)
- instructorid (FK)
- course_name
- coursedescription
- is_published
```

#### 3. **Module**
```python
- moduleid (PK)
- courseid (FK)
- title, description
- order_index
- learning_objectives (used by SME)
```

#### 4. **EnrolledCourses**
```python
- learnerid (FK)
- courseid (FK)
- enrollment_date
- status (active/completed/dropped)
```

#### 5. **CourseContent**
```python
- learnerid (FK)
- courseid (FK)
- currentmodule (current module being studied)
- status (ongoing/completed/paused)
```

#### 6. **LearnerModuleProgress**
```python
- learnerid (FK)
- moduleid (FK)
- status (not_started/in_progress/completed)
- progress_percentage (0-100)
- started_at, completed_at
```

### Content Caching Models

#### 7. **GeneratedModuleContent**
Stores AI-generated module content per learner.
```python
- moduleid (FK)
- learnerid (FK)
- courseid (FK)
- content (TEXT) # Markdown content
- generated_at, updated_at
UNIQUE(moduleid, learnerid)  # One content per module per learner
```

**Why?** Each learner gets personalized content based on their preferences. This table caches it so we don't regenerate on every visit.

#### 8. **GeneratedQuiz**
Stores AI-generated quizzes per learner.
```python
- moduleid (FK)
- learnerid (FK)
- courseid (FK)
- quiz_data (JSONB) # Full quiz JSON structure
- generated_at, updated_at
UNIQUE(moduleid, learnerid)  # One quiz per module per learner
```

**Why?** Quizzes are personalized and should be consistent on revisits. Generating quizzes is expensive (LLM + RAG), so we cache them.

## 📡 API Endpoints

### Authentication

**POST /api/learner/signup**
```json
Request:
{
  "email": "learner@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}

Response:
{
  "learnerid": "uuid",
  "email": "learner@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

**POST /api/learner/login**
```json
Request:
{
  "email": "learner@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "jwt.token.here",
  "token_type": "bearer",
  "learner": { learner object }
}
```

**GET /api/learner/me**
Requires: `Authorization: Bearer <token>`
Returns: Current learner info

### Courses

**GET /api/learner/courses**
List all published courses with modules.

**GET /api/learner/courses/{course_id}**
Get specific course details.

**GET /api/learner/courses/{course_id}/modules**
Get all modules for a course (ordered by index).

### Enrollment

**POST /api/learner/enroll**
```json
Request:
{
  "course_id": "COURSE_123"
}

Response:
{
  "message": "Enrolled successfully",
  "enrollment": { enrollment object }
}
```

**GET /api/learner/enrollments**
Get all courses the learner is enrolled in.

### Progress

**GET /api/learner/courses/{course_id}/progress**
Get learner's progress in a specific course.

**PUT /api/learner/modules/{module_id}/progress**
```json
Request:
{
  "status": "in_progress",  // or "completed"
  "progress_percentage": 50
}
```

**GET /api/learner/dashboard**
Get comprehensive dashboard data (enrollments, progress, etc.).

### Module Content Caching

**GET /api/learner/module/{module_id}/content**
Check if content exists in cache and return it.
```json
Response:
{
  "exists": true,
  "content": "# Module Title\n\n## Content..." // or null
}
```

**POST /api/learner/module/{module_id}/content**
Save generated content to cache.
```json
Request:
{
  "module_id": "MODULE_123",
  "course_id": "COURSE_123",
  "content": "# Module Title\n\n## Content..."
}
```

### Quiz Caching

**GET /api/learner/module/{module_id}/quiz**
Check if quiz exists in cache and return it.
```json
Response:
{
  "exists": true,
  "quiz_data": {
    "questions": [...],
    "metadata": {...}
  } // or null
}
```

**POST /api/learner/module/{module_id}/quiz**
Save generated quiz to cache.
```json
Request:
{
  "module_id": "MODULE_123",
  "course_id": "COURSE_123",
  "quiz_data": {
    "questions": [...],
    "total_questions": 10
  }
}
```

## 🔐 Authentication

### JWT Token Flow
```
1. Learner POSTs credentials to /login
2. Server validates, generates JWT token
3. Token includes: learner_id, email, expiration
4. Client stores token (localStorage)
5. Client sends token in Authorization header for protected routes
6. Server validates token and extracts learner_id
```

### Implementation
```python
# auth.py
from jose import JWTError, jwt
from passlib.context import CryptContext

# Hash passwords with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create JWT token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify token
def verify_token(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload
```

### Protected Routes
```python
# routes.py
def get_current_learner(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    token_data = verify_token(token)
    learner = LearnerCRUD.get_learner_by_id(db, token_data.learner_id)
    return learner

# Use in endpoints
@router.get("/me")
def get_me(current_learner = Depends(get_current_learner)):
    return current_learner
```

## 💾 CRUD Operations

CRUD classes organize database operations:

### LearnerCRUD
- `create_learner(db, learner_data)`
- `get_learner_by_id(db, learner_id)`
- `get_learner_by_email(db, email)`
- `authenticate_learner(db, email, password)`

### CourseCRUD
- `get_all_courses(db)` - Only published courses
- `get_course_by_id(db, course_id)`
- `get_course_modules(db, course_id)` - Ordered by index

### EnrollmentCRUD
- `enroll_learner(db, learner_id, course_id)`
  - Creates enrollment record
  - Creates CourseContent progress record
  - Initializes module progress for all modules
- `get_learner_enrollments(db, learner_id)`
- `unenroll_learner(db, learner_id, course_id)`

### ProgressCRUD
- `get_learner_course_progress(db, learner_id, course_id)`
- `get_learner_module_progress(db, learner_id, module_id)`
- `update_module_progress(db, learner_id, module_id, status, percentage)`
- `get_all_module_progress_for_course(db, learner_id, course_id)`

### ModuleContentCRUD
- `get_content(db, module_id, learner_id)` - Retrieve cached content
- `save_content(db, module_id, learner_id, course_id, content)` - Save/update
- `content_exists(db, module_id, learner_id)` - Check existence

### QuizCRUD
- `get_quiz(db, module_id, learner_id)` - Retrieve cached quiz
- `save_quiz(db, module_id, learner_id, course_id, quiz_data)` - Save/update
- `quiz_exists(db, module_id, learner_id)` - Check existence

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learning_middleware

# JWT
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# API
API_PREFIX=/api/learner
```

### config.py
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## 🐛 Debugging

### Enable Debug Logging
```python
# main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Logs
```bash
# Docker logs
docker compose logs -f learner

# Look for:
# - [DEBUG] messages (added in routes)
# - SQL queries (SQLAlchemy)
# - HTTP requests/responses
```

### Common Issues

**Database connection failed:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check connection string
echo $DATABASE_URL
```

**JWT token errors:**
```bash
# Check token expiration
# Verify SECRET_KEY matches across services
# Check Authorization header format: "Bearer <token>"
```

**Content not caching:**
```bash
# Check if POST /module/{id}/content is being called
# Check database: SELECT * FROM generatedmodulecontent;
# Verify unique constraint isn't blocking updates
```

## 🧪 Testing

### Manual Testing with curl
```bash
# Signup
curl -X POST http://localhost:5001/api/learner/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","first_name":"Test","last_name":"User"}'

# Login
curl -X POST http://localhost:5001/api/learner/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get courses (with token)
curl -X GET http://localhost:5001/api/learner/courses \
  -H "Authorization: Bearer <token>"
```

### Using API Docs
1. Open http://localhost:5001/docs
2. Click "Authorize" button
3. Enter token: `Bearer <your-jwt-token>`
4. Try endpoints interactively

## 📦 Dependencies

```txt
fastapi>=0.104.0        # Web framework
uvicorn>=0.24.0         # ASGI server
sqlalchemy>=2.0.0       # ORM
psycopg2-binary>=2.9.0  # PostgreSQL driver
pydantic>=2.0.0         # Data validation
pydantic-settings>=2.0.0 # Settings management
python-jose[cryptography] # JWT
passlib[bcrypt]         # Password hashing
python-multipart        # Form data
```

## 🚢 Deployment

### Docker
Already configured in main docker-compose.yml:
```yaml
learner:
  build: ./learner
  ports:
    - "5001:5001"
  environment:
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learning_middleware
  depends_on:
    - postgres
```

### Standalone
```bash
# Install dependencies
pip install -r requirements.txt

# Run with gunicorn (production)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:5001
```

## 🔄 Data Flow Examples

### Module Content Caching Flow
```
1. UI calls GET /module/{id}/content
2. ModuleContentCRUD.get_content() queries database
3. If found: Return cached content
4. If not found: Return {"exists": false}
5. UI generates content via Orchestrator → SME
6. UI calls POST /module/{id}/content with generated content
7. ModuleContentCRUD.save_content() stores in database
8. Next visit: Step 3 returns cached content ✅
```

### Enrollment Flow
```
1. UI calls POST /enroll with course_id
2. EnrollmentCRUD.enroll_learner()
   - Creates EnrolledCourse record
   - Creates CourseContent record (tracks current module)
   - Creates LearnerModuleProgress for each module
3. Returns enrollment confirmation
4. UI redirects to course page
```

## 📞 Support

For learner service issues:
- Check FastAPI docs at /docs
- Check database with: `docker exec -it lmw_postgres psql -U postgres -d learning_middleware`
- Check logs: `docker compose logs -f learner`
- Verify database schema: `\dt` in psql