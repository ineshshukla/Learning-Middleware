# Instructor Service

FastAPI-based microservice for course and module management by instructors.

## 🎯 Purpose

The Instructor Service handles all instructor-related operations:
- **Authentication**: Instructor signup, login, JWT tokens
- **Course Management**: Create, update, delete, publish courses
- **Module Management**: Add modules with learning objectives
- **Content Upload**: Upload course materials (PDFs) for RAG
- **Analytics**: View learner progress and course statistics

## 🏗️ Architecture

```
instructor/
├── main.py              # FastAPI app entry point
├── routes.py            # API endpoints
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic schemas
├── crud.py              # Database operations
├── auth.py              # JWT authentication
├── database.py          # Database connection
├── config.py            # Configuration
├── uploads/             # Uploaded course materials
└── requirements.txt     # Python dependencies
```

## 🚀 Quick Start

### Standalone Development
```bash
cd instructor
pip install -r requirements.txt
uvicorn main:app --reload --port 5002
```

### With Docker
```bash
docker compose up instructor -d
```

Access API docs: http://localhost:5002/docs

## 🗄️ Database Models

Uses same PostgreSQL database as learner service.

### Key Models

**Instructor**
```python
- instructorid (PK)
- email (unique)
- password_hash
- first_name, last_name
- created_at, updated_at
```

**Course**
```python
- courseid (PK)
- instructorid (FK)
- course_name
- coursedescription
- targetaudience
- prereqs
- is_published (boolean)
```

**Module**
```python
- moduleid (PK)
- courseid (FK)
- title
- description
- order_index (for ordering)
- content_path (for uploaded materials)
```

## 📡 API Endpoints

### Authentication

**POST /api/instructor/signup**
Register new instructor account.

**POST /api/instructor/login**
Login and get JWT token.

**GET /api/instructor/me**
Get current instructor info.

### Course Management

**POST /api/instructor/courses**
Create a new course.
```json
{
  "course_name": "Operating Systems",
  "coursedescription": "Learn OS fundamentals",
  "targetaudience": "CS undergraduates",
  "prereqs": "Data Structures",
  "is_published": false
}
```

**GET /api/instructor/courses**
List all courses created by instructor.

**GET /api/instructor/courses/{course_id}**
Get specific course details.

**PUT /api/instructor/courses/{course_id}**
Update course information.

**DELETE /api/instructor/courses/{course_id}**
Delete a course.

**PUT /api/instructor/courses/{course_id}/publish**
Publish course (make visible to learners).

### Module Management

**POST /api/instructor/courses/{course_id}/modules**
Add a module to a course.
```json
{
  "title": "Process Management",
  "description": "Learn about processes, threads, and scheduling",
  "order_index": 1,
  "learning_objectives": [
    "Understand process lifecycle",
    "Explain scheduling algorithms",
    "Compare threads vs processes"
  ]
}
```

**GET /api/instructor/courses/{course_id}/modules**
Get all modules for a course.

**PUT /api/instructor/modules/{module_id}**
Update module details.

**DELETE /api/instructor/modules/{module_id}**
Delete a module.

### Content Upload

**POST /api/instructor/courses/{course_id}/upload**
Upload PDF materials for RAG.
- Sends PDFs to SME service for vector store creation
- Used for quiz generation and chat

**GET /api/instructor/courses/{course_id}/materials**
List uploaded materials for a course.

## 🔐 Authentication

Same JWT-based authentication as learner service:
- Tokens stored in localStorage: `instructor_token`
- Sent via Authorization header: `Bearer <token>`
- 7-day expiration

## 💾 CRUD Operations

### InstructorCRUD
- `create_instructor(db, data)` - Register new instructor
- `get_instructor_by_id(db, instructor_id)`
- `get_instructor_by_email(db, email)`
- `authenticate_instructor(db, email, password)`

### CourseCRUD
- `create_course(db, instructor_id, data)` - Create course
- `get_instructor_courses(db, instructor_id)` - List instructor's courses
- `get_course_by_id(db, course_id)` - Get specific course
- `update_course(db, course_id, data)` - Update course
- `delete_course(db, course_id)` - Delete course
- `publish_course(db, course_id)` - Set is_published=True

### ModuleCRUD
- `create_module(db, course_id, data)` - Add module
- `get_course_modules(db, course_id)` - List modules (ordered)
- `get_module_by_id(db, module_id)` - Get specific module
- `update_module(db, module_id, data)` - Update module
- `delete_module(db, module_id)` - Delete module
- `reorder_modules(db, course_id, new_order)` - Change order

## 📤 Content Upload Flow

When instructor uploads PDFs:

```
1. Instructor uploads PDF via UI
2. POST /courses/{id}/upload
3. Save PDF to instructor/uploads/{courseid}/
4. Send PDF to SME service:
   POST http://sme:8000/upload-course-docs
   with course_id and file
5. SME processes PDF:
   - Extract text
   - Chunk into segments
   - Create embeddings
   - Store in FAISS vector store at sme/data/vector_store/{courseid}/
6. Return success
```

This vector store is used for:
- Quiz generation (RAG retrieval)
- Chat with course materials

## 🔧 Configuration

### Environment Variables (.env)
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learning_middleware
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
SME_SERVICE_URL=http://sme:8000
API_PREFIX=/api/instructor
```

## 🐛 Debugging

### Check Logs
```bash
docker compose logs -f instructor
```

### Common Issues

**Cannot upload files:**
```bash
# Check uploads directory exists
mkdir -p instructor/uploads

# Check file size limits in nginx/proxy
# Check SME service is running
docker compose ps sme
```

**Course not appearing for learners:**
```bash
# Check is_published flag
SELECT courseid, course_name, is_published FROM course;

# Publish via API
PUT /courses/{id}/publish
```

## 🧪 Testing

```bash
# Signup
curl -X POST http://localhost:5002/api/instructor/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"prof@university.edu","password":"secure123","first_name":"Dr.","last_name":"Smith"}'

# Create course
curl -X POST http://localhost:5002/api/instructor/courses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"course_name":"AI Fundamentals","coursedescription":"Introduction to AI","is_published":false}'

# Upload PDF
curl -X POST http://localhost:5002/api/instructor/courses/{course_id}/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@textbook.pdf"
```

## 📦 Dependencies

Same as learner service:
```txt
fastapi
uvicorn
sqlalchemy
psycopg2-binary
pydantic
python-jose[cryptography]
passlib[bcrypt]
python-multipart  # Required for file uploads
aiofiles          # Async file operations
```

## 🚢 Deployment

Configured in docker-compose.yml:
```yaml
instructor:
  build: ./instructor
  ports:
    - "5002:5002"
  volumes:
    - ./instructor/uploads:/app/uploads
  depends_on:
    - postgres
```

## 📊 Workflow Example

### Creating a Complete Course

```
1. Instructor signs up/logs in
2. Create course (unpublished)
3. Add modules with learning objectives:
   Module 1: "Introduction" - LOs: ["Define AI", "List applications"]
   Module 2: "Search Algorithms" - LOs: ["Implement BFS", "Compare algorithms"]
4. Upload course materials (textbook PDFs)
   - PDFs processed by SME
   - Vector store created for RAG
5. Publish course
6. Learners can now:
   - See course in catalog
   - Enroll
   - Get personalized content (based on LOs)
   - Take RAG-generated quizzes (using PDFs)
   - Chat with course materials
```

## 📞 Support

For instructor service issues:
- API docs: http://localhost:5002/docs
- Logs: `docker compose logs -f instructor`
- Database: Same PostgreSQL as learner service
