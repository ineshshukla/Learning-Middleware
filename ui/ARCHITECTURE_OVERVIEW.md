# Learning Middleware iREL - Architecture Overview

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│                   /ui - Port: 3000                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐     │
│  │   /learner/*   │  │ /instructor/*  │  │  /shared/*   │     │
│  │  (Student UI)  │  │  (Teacher UI)  │  │ (Common UI)  │     │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘     │
│           │                   │                   │              │
└───────────┼───────────────────┼───────────────────┼──────────────┘
            │                   │                   │
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Services                            │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Learner API    │  Instructor API  │  Learner Orchestrator     │
│   Port: 8000     │   Port: 8001     │    Port: 8002             │
│                  │                  │                            │
│  • Enrollment    │  • Course CRUD   │  • Analytics Service      │
│  • Progress      │  • Module Mgmt   │  • Diagnostic Service     │
│  • Assessment    │  • Content Edit  │  • Feedback Service       │
│  • Learning      │  • Publishing    │  • Learning Service       │
└──────────────────┴──────────────────┴───────────────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                      Port: 5432                                  │
│                                                                  │
│  • Users          • Courses        • Modules                    │
│  • Enrollments    • Learning Objectives                         │
│  • Progress       • Assessments                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SME Services (AI Layer)                       │
│                    /sme - Ports: Various                         │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Chat Service   │   LO Generator   │  Module Generator         │
│                  │                  │                            │
│  • RAG Chatbot   │  • Objective     │  • Content Generation     │
│  • Q&A Support   │    Generation    │  • Structure Creation     │
│  • FAISS Vector  │  • Concept       │  • Context Retrieval      │
│    Store         │    Extraction    │                            │
│                  │                  │                            │
│  vLLM Inference  │  vLLM Inference  │  vLLM Inference           │
└──────────────────┴──────────────────┴───────────────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                FAISS Vector Store + Documents                    │
│                /sme/data/                                        │
│                                                                  │
│  • vector_store/  (FAISS index)                                 │
│  • docs/          (PDF textbooks & materials)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### **1. Learner Enrolls in Course**

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌──────────┐
│ Learner  │────▶│ /learner/  │────▶│ Learner API  │────▶│ Postgres │
│   UI     │     │  explore   │     │ :8000        │     │          │
└──────────┘     └────────────┘     └──────────────┘     └──────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Diagnostic   │
                                    │ Assessment   │
                                    │ (Orchestr.)  │
                                    └──────────────┘
```

### **2. Instructor Creates Course**

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌──────────┐
│Instructor│────▶│/instructor/│────▶│ Instructor   │────▶│ Postgres │
│   UI     │     │  upload    │     │ API :8001    │     │          │
└──────────┘     └────────────┘     └──────────────┘     └──────────┘
                        │                   │
                        │                   ▼
                        │            ┌──────────────┐
                        └───────────▶│ LO Generator │
                                     │ (SME)        │
                                     └──────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │ Module Gen   │
                                     │ (SME)        │
                                     └──────────────┘
```

### **3. AI Chat Interaction**

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌──────────┐
│ Any User │────▶│ /shared/   │────▶│ Chat Service │────▶│  FAISS   │
│          │     │   chat     │     │ (SME)        │     │ Vector   │
└──────────┘     └────────────┘     └──────────────┘     │  Store   │
     ▲                                      │              └──────────┘
     │                                      ▼                    │
     │                               ┌──────────────┐            │
     └───────────────────────────────│ vLLM Model   │◀───────────┘
                                     │ Inference    │
                                     └──────────────┘
```

---

## 🗂️ UI Route Mapping

### **Learner Routes**

| Route | Purpose | Backend API |
|-------|---------|-------------|
| `/learner` | Dashboard with enrolled courses | `GET /api/user_course_enrollments` |
| `/learner/explore` | Browse available courses | `GET /api/courses` |
| `/learner/course/[id]` | Course overview & modules | `GET /api/courses/{id}` |
| `/learner/course/[id]/module/[moduleId]` | Module learning experience | `GET /api/modules/{id}` |

### **Instructor Routes**

| Route | Purpose | Backend API |
|-------|---------|-------------|
| `/instructor/dashboard` | Overview of created courses | `GET /api/courses` |
| `/instructor/courses` | Course management list | `GET /api/courses` |
| `/instructor/courses/[id]/history` | Version history | `GET /api/courses/{id}/history` |
| `/instructor/course/[id]` | Course details view | `GET /api/courses/{id}` |
| `/instructor/upload` | Create new course | `POST /api/courses` + SME LO Gen |
| `/instructor/editor` | Edit course content | `PUT /api/courses/{id}` + SME Module Gen |
| `/instructor/quiz` | Design assessments | `POST /api/assessments` |
| `/instructor/assignment` | Create assignments | `POST /api/assignments` |
| `/instructor/library` | Resource management | `GET /api/resources` |

### **Shared Routes**

| Route | Purpose | Backend API |
|-------|---------|-------------|
| `/shared/profile` | User profile & settings | `GET /api/users/{id}` |
| `/shared/chat` | AI assistant chat | SME Chat Service |
| `/signin` | Authentication | `POST /api/auth/signin` |

---

## 🔌 API Endpoints Reference

### **Learner API (Port 8000)**

```
POST   /signup
POST   /login
GET    /me
GET    /courses
POST   /enroll
GET    /progress
PUT    /progress/{module_id}
GET    /dashboard
POST   /assessment/submit
```

### **Instructor API (Port 8001)**

```
POST   /signup
POST   /login
GET    /courses
POST   /courses
PUT    /courses/{id}
DELETE /courses/{id}
POST   /courses/{id}/modules
PUT    /modules/{id}
POST   /courses/{id}/publish
GET    /courses/{id}/analytics
```

### **SME Services**

```
# Chat Service
POST   /chat/query
{
  "query": "string",
  "context": "string"
}

# LO Generator
POST   /lo_gen/generate
{
  "module_name": "string",
  "course_materials": "string",
  "num_objectives": int
}

# Module Generator
POST   /module_gen/generate
{
  "module_name": "string",
  "learning_objectives": ["string"],
  "user_preferences": {}
}
```

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Hooks
- **Auth:** Cookie-based (Google OAuth)

### **Backend**
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Auth:** JWT tokens
- **Validation:** Pydantic

### **AI/ML (SME)**
- **LLM:** vLLM (custom client)
- **Embeddings:** HuggingFace (sentence-transformers)
- **Vector Store:** FAISS
- **RAG:** LangChain
- **Config:** Hydra + OmegaConf

### **Infrastructure**
- **Container:** Docker + Docker Compose
- **Database:** PostgreSQL 13+
- **File Storage:** Local filesystem (uploads/)

---

## 📦 Dependencies

### **UI (`/ui/package.json`)**
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "latest",
    "lucide-react": "latest"
  }
}
```

### **Backend (`requirements.txt`)**
```
fastapi
sqlalchemy
pydantic
python-jose[cryptography]
passlib[bcrypt]
psycopg2-binary
```

### **SME (`/sme/requirements.txt`)**
```
langchain
langchain-community
langchain-huggingface
faiss-cpu
sentence-transformers
hydra-core
omegaconf
loguru
PyPDF2
```

---

## 🚀 Getting Started

### **1. Start Backend Services**
```bash
# Terminal 1: Learner API
cd learner
python main.py

# Terminal 2: Instructor API
cd instructor
python main.py

# Terminal 3: Database
docker-compose up postgres
```

### **2. Start Frontend**
```bash
cd ui
npm install
npm run dev
# Access at http://localhost:3000
```

### **3. Start SME Services (Optional)**
```bash
# Terminal 4: Chat Service
cd sme/chat
python main.py

# Note: LO Gen and Module Gen are called as library functions
```

---

## 🔐 Security Considerations

1. **Cookie Security:**
   - Set `httpOnly: true` for auth cookies
   - Use `secure: true` in production (HTTPS)
   - Set appropriate `sameSite` policy

2. **API Security:**
   - All backend routes require JWT authentication
   - Role-based access control in middleware
   - Input validation via Pydantic schemas

3. **File Uploads:**
   - Validate file types and sizes
   - Scan for malware
   - Store outside web root

4. **SME Services:**
   - Rate limiting on AI endpoints
   - Content filtering for generated text
   - Vector store access control

---

## 📊 Performance Optimization

1. **Frontend:**
   - Use Next.js Image optimization
   - Implement lazy loading for courses
   - Cache API responses with SWR/React Query
   - Code splitting for SME integrations

2. **Backend:**
   - Database query optimization (indexes)
   - Connection pooling
   - Caching layer (Redis)
   - Async processing for heavy tasks

3. **SME:**
   - Vector store caching
   - Batch inference for multiple requests
   - Response streaming for long generations
   - Model quantization

---

## 📝 Future Enhancements

- [ ] Real-time collaboration in course editor
- [ ] WebSocket support for live updates
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Enhanced AI features (auto-grading, personalization)
- [ ] Video content support
- [ ] Gamification elements

---

**Last Updated:** October 9, 2025  
**Maintained by:** iREL Team
