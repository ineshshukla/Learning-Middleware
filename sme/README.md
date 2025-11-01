# SME (Subject Matter Expert) Service

AI-powered service for generating personalized learning content, quizzes, and providing chat support using LLMs and RAG.

## 🎯 Purpose

The SME Service is the AI engine of the platform:
- **Module Content Generation**: Create personalized markdown content based on learning objectives and preferences
- **Quiz Generation**: Generate quiz questions using RAG (Retrieval-Augmented Generation)
- **Learning Objectives Generation**: Auto-generate LOs from module names
- **Chat Support**: Answer questions about course materials using RAG
- **Vector Store Management**: Process and index course PDFs for retrieval

## 🏗️ Architecture

```
sme/
├── apiserver.py               # FastAPI app with all endpoints
├── conf/
│   └── config.yaml            # Configuration (LLM endpoints, parameters)
├── data/
│   ├── docs/                  # Uploaded course PDFs
│   │   └── COURSE_{ID}/       # Per-course documents
│   └── vector_store/          # FAISS vector stores
│       └── COURSE_{ID}/       # Per-course embeddings
├── lo_gen/                    # Learning objectives generator
│   ├── main.py
│   └── vllm_client.py
├── module_gen/                # Module content generator
│   ├── main.py
│   └── vllm_client.py
├── quiz_gen/                  # Quiz generator with RAG
│   ├── main.py
│   └── (supporting files)
├── chat/                      # RAG-based chat
│   ├── main.py
│   └── rag.py
└── outputs/                   # Generated content logs
```

## 🤖 LLM Integration

Uses external vLLM service for inference:

### Environment Variables
```bash
# 4B Model (for faster operations)
VLLM_4B_URL=http://your-vllm-server:8000/v1
VLLM_API_KEY=your-api-key

# 70B Model (for complex generation)
VLLM_70B_URL=http://your-vllm-server:8001/v1
VLLM_70B_API_KEY=your-api-key
```

### Models Used
- **4B Model**: Quick tasks (LO generation, simple queries)
- **70B Model**: Complex tasks (module content, quiz generation)

## 📡 API Endpoints

### 1. Course Material Upload

**POST /upload-course-docs**
Upload PDFs for a course.
```bash
curl -X POST http://localhost:8000/upload-course-docs \
  -F "courseid=COURSE_123" \
  -F "files=@textbook.pdf" \
  -F "files=@notes.pdf"
```

Saves to: `data/docs/COURSE_123/`

**POST /createvs**
Create FAISS vector store from uploaded PDFs.
```json
{
  "courseid": "COURSE_123"
}
```

Process:
1. Read PDFs from `data/docs/COURSE_123/`
2. Extract text and chunk
3. Generate embeddings
4. Create FAISS index
5. Save to `data/vector_store/COURSE_123/`

### 2. Learning Objectives Generation

**POST /generate-los**
Auto-generate learning objectives from module names.
```json
{
  "courseID": "COURSE_123",
  "ModuleName": ["Concurrency", "Memory Management"],
  "n_los": 6
}
```

Response:
```json
{
  "Concurrency": [
    "Understand the difference between processes and threads",
    "Implement synchronization mechanisms",
    ...
  ],
  "Memory Management": [...]
}
```

### 3. Module Content Generation

**POST /generate-module**
Generate personalized module content.
```json
{
  "courseID": "COURSE_123",
  "userProfile": {
    "_id": {
      "CourseID": "COURSE_123",
      "LearnerID": "learner-uuid"
    },
    "preferences": {
      "DetailLevel": "detailed",
      "ExplanationStyle": "examples-heavy",
      "Language": "simple"
    }
  },
  "ModuleLO": {
    "Concurrency": {
      "learning_objectives": [
        "Understand threads vs processes",
        "Implement synchronization"
      ]
    }
  }
}
```

Response:
```json
{
  "Concurrency": "# Concurrency\n\n## Introduction\n\n..."
}
```

**How it works:**
1. Receives learning objectives + user preferences
2. Uses vector store to find relevant course materials
3. Prompts LLM with:
   - Learning objectives
   - Preferences (detail level, style, language)
   - Retrieved context from PDFs
4. Generates personalized markdown content
5. Returns formatted content

### 4. Quiz Generation

**POST /generate-quiz**
Generate quiz using RAG.
```json
{
  "courseID": "COURSE_123",
  "module_content": "# Concurrency\n\n## Introduction...",
  "module_name": "Concurrency",
  "questions_per_chunk": 1,
  "retrieval_top_k": 3,
  "batch_size": 2,
  "questions_per_batch": 3,
  "parallel_processing": true
}
```

Response:
```json
{
  "message": "Quiz generated successfully",
  "quiz_data": {
    "quiz_metadata": {
      "total_questions": 10,
      "generated_at": "2025-11-01T10:00:00Z"
    },
    "questions": [
      {
        "id": 1,
        "question": "What is the main difference between...",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "B",
        "explanation": "...",
        "topic": "Concurrency"
      }
    ]
  }
}
```

**How it works:**
1. Chunks module content into sections
2. For each chunk:
   - Query vector store with course_id
   - Retrieve relevant PDF context
   - Prompt LLM with:
     * Module content chunk
     * Retrieved context
     * Question format requirements
   - Generate questions
3. Combine all questions
4. Return structured quiz

**Performance Options:**
- `batch_size`: Number of chunks to process together
- `parallel_processing`: Use multiple workers
- `max_workers`: Number of parallel threads
- 50-minute timeout to handle large modules

### 5. Chat Support

**POST /chat**
Chat with course materials using RAG.
```json
{
  "courseid": "COURSE_123",
  "userprompt": "What is a deadlock?"
}
```

Response:
```json
{
  "answer": "A deadlock occurs when...",
  "sources": [
    {
      "content": "Excerpt from PDF",
      "metadata": {"page": 42}
    }
  ]
}
```

**How it works:**
1. Query vector store with user question
2. Retrieve top-k relevant chunks from course PDFs
3. Create prompt with question + context
4. LLM generates answer
5. Return answer with source citations

### 6. Health Check

**GET /**
Returns service status and available endpoints.

**GET /sme/health**
Check if service is running.

## 🔧 Configuration

### config.yaml Structure
```yaml
# LO Generation
lo_gen:
  course_id: "default"
  model: "4b"  # Faster model
  n_los: 6
  output_dir: "outputs"

# Module Generation
module_gen:
  course_id: "default"
  model: "70b"  # More capable model
  temperature: 0.7
  output_dir: "outputs"

# Quiz Generation
quiz_gen:
  course_id: "default"
  model: "70b"
  questions_per_chunk: 1
  retrieval_top_k: 3
  batch_size: 2
  temperature: 0.3  # Lower for consistency

# Chat
chat:
  model: "70b"
  retrieval_top_k: 5
  temperature: 0.5
```

### Vector Store

Uses **FAISS** (Facebook AI Similarity Search):
- Stores embeddings of course PDF chunks
- Fast similarity search
- One index per course

**Index Structure:**
```
data/vector_store/COURSE_123/
├── index.faiss        # Vector index
└── metadata.json      # Chunk metadata
```

## 🐛 Debugging

### Check Logs
```bash
docker compose logs -f sme
```

### Common Issues

**"No vector store found for course X":**
```bash
# Upload PDFs first
curl -X POST http://localhost:8000/upload-course-docs \
  -F "courseid=COURSE_123" \
  -F "files=@file.pdf"

# Create vector store
curl -X POST http://localhost:8000/createvs \
  -H "Content-Type: application/json" \
  -d '{"courseid":"COURSE_123"}'

# Verify
docker compose exec sme ls /app/data/vector_store/COURSE_123/
```

**Generation timeout:**
```bash
# Check vLLM service is running
curl $VLLM_70B_URL/health

# Check config.yaml for correct endpoints
docker compose exec sme cat /app/conf/config.yaml
```

**Quiz generation too slow:**
```bash
# Enable parallel processing in request
{
  "parallel_processing": true,
  "max_workers": 4,
  "batch_size": 3
}

# Or reduce questions
{
  "questions_per_batch": 2
}
```

## 📦 Dependencies

```txt
fastapi>=0.104.0
uvicorn>=0.24.0
langchain>=0.1.0           # LLM framework
langchain-community>=0.1.0 # Community integrations
faiss-cpu>=1.7.4           # Vector store
pypdf>=3.17.0              # PDF processing
omegaconf>=2.3.0           # Config management
pydantic>=2.0.0
python-multipart           # File uploads
```

## 🚢 Deployment

### Docker
```yaml
sme:
  build: ./sme
  ports:
    - "8000:8000"
  volumes:
    - ./sme/data:/app/data
    - ./sme/outputs:/app/outputs
  environment:
    - VLLM_4B_URL=${VLLM_4B_URL}
    - VLLM_API_KEY=${VLLM_API_KEY}
    - VLLM_70B_URL=${VLLM_70B_URL}
    - VLLM_70B_API_KEY=${VLLM_70B_API_KEY}
```

### Standalone
```bash
cd sme
pip install -r requirements.txt
uvicorn apiserver:app --host 0.0.0.0 --port 8000
```

## 🔄 Complete Workflow Example

### Setting Up a Course

```bash
# 1. Upload course PDFs
curl -X POST http://localhost:8000/upload-course-docs \
  -F "courseid=OS_2025" \
  -F "files=@os_textbook.pdf" \
  -F "files=@lecture_notes.pdf"

# 2. Create vector store
curl -X POST http://localhost:8000/createvs \
  -H "Content-Type: application/json" \
  -d '{"courseid":"OS_2025"}'

# 3. Generate learning objectives
curl -X POST http://localhost:8000/generate-los \
  -H "Content-Type: application/json" \
  -d '{
    "courseID":"OS_2025",
    "ModuleName":["Concurrency","Memory Management"],
    "n_los":6
  }'

# 4. Generate module content (called by orchestrator)
# POST /generate-module with LOs + preferences

# 5. Generate quiz (called by orchestrator)
# POST /generate-quiz with content + course_id

# 6. Chat with materials
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "courseid":"OS_2025",
    "userprompt":"Explain the difference between a thread and a process"
  }'
```

## 🎯 Design Decisions

### Why RAG (Retrieval-Augmented Generation)?

**For Quiz Generation:**
- Grounds questions in actual course materials
- Prevents hallucinations
- Ensures relevance to taught content
- Uses instructor-provided PDFs

**For Chat:**
- Provides accurate, source-backed answers
- References specific course materials
- Maintains consistency with course content

### Why FAISS?

- **Fast**: Millions of vectors, sub-second search
- **Scalable**: Handles large courses
- **Local**: No external dependencies
- **Flexible**: Works with any embedding model

### Why Separate Models (4B vs 70B)?

- **4B**: Fast, good for structured tasks (LOs)
- **70B**: Better reasoning, needed for content generation
- **Cost/Performance tradeoff**

## 🧪 Testing

### Test Endpoints
```bash
# Quick health check
curl http://localhost:8000/

# Test quiz generation
cd sme/quiz_gen
python main.py  # Standalone test

# Test module generation
cd sme/module_gen
python main.py  # Standalone test
```

## 📊 Performance

### Typical Generation Times

| Task | Time | Notes |
|------|------|-------|
| LO Generation | 30-60s | Per module |
| Module Content | 1-3 min | Depends on detail level |
| Quiz Generation | 2-5 min | Depends on module size, RAG complexity |
| Chat Response | 5-15s | Depends on query complexity |

### Optimization Tips

1. **Use batching** for quiz generation
2. **Enable parallel processing** for large modules
3. **Cache vector stores** (already implemented)
4. **Adjust `retrieval_top_k`** lower for speed, higher for quality

## 📞 Support

For SME service issues:
- API docs: http://localhost:8000/docs
- Logs: `docker compose logs -f sme`
- Check vLLM connection: `curl $VLLM_70B_URL/health`
- Verify vector stores: `ls sme/data/vector_store/`
- Check outputs: `ls sme/outputs/` for generation logs
