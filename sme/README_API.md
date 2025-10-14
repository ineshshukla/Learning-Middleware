# LO Generator & Module Content API

This FastAPI service exposes endpoints to generate Learning Objectives (LOs) and module content using the existing `lo_gen` and `module_gen` generators.

## Endpoints

### POST /upload-file

Upload files for a specific course.

**Request:** Multipart form data
- `courseid` (form field): The course identifier
- `files` (file uploads): List of files to upload

Files will be saved to `data/docs/{courseid}/` directory.

**Response:**
```json
{
  "message": "Successfully uploaded 2 files for course CS101",
  "courseid": "CS101",
  "files": [
    {
      "filename": "document1.pdf",
      "size": 1024,
      "path": "/path/to/data/docs/CS101/document1.pdf"
    }
  ]
}
```

### POST /createvs

Create vector store for a course from uploaded documents.

**Request JSON body:**
```json
{
  "courseid": "CS101"
}
```

**Response:**
```json
{
  "message": "Vector store created successfully for course CS101",
  "courseid": "CS101",
  "docs_path": "/path/to/data/docs/CS101",
  "vs_path": "/path/to/data/vector_store/CS101"
}
```

### POST /generate-quiz

Generate quiz questions from module content using the knowledge base and batching.

Supports both the new request shape and legacy fields. New fields enable batching and performance controls.

**Preferred request JSON body:**
```json
{
  "courseID": "EC2101",
  "module_content": "# Module Title\n\n## Section 1...",
  "module_name": "Optional Module Name",
  "retrieval_top_k": 3,
  "batch_size": 2,
  "questions_per_batch": 3,
  "parallel_processing": true,
  "max_workers": 4
}
```

**Legacy request (still supported):**
```json
{
  "modulecontent": "# Module Title\n\n## Section 1...",
  "modulename": "Module Name"
}
```

**Response:**
```json
{
  "message": "Quiz generated successfully for module: Module Name",
  "module_name": "Module Name",
  "quiz_data": {
    "quiz_metadata": {
      "module_name": "Module Name",
      "total_questions": 12,
      "question_types": ["mcq"],
      "generated_at": "2025-10-14T12:00:00Z",
      "generation_method": "langgraph_agent",
      "chunks_processed": 7,
      "generation_config": {
        "chunking_method": "markdown_headers",
        "questions_per_chunk": 1,
        "temperature": 0.3
      }
    },
    "questions": [
      {
        "id": 1,
        "type": "mcq",
        "question": "…",
        "options": ["A) …", "B) …", "C) …", "D) …"],
        "correct_answer": "B",
        "explanation": "…",
        "topic": "…",
        "chunk_index": 0
      }
    ]
  },
  "content_length": 1234
}
```

Notes:
- Set `courseID` to use the course-specific vector store.
- `batch_size` and `questions_per_batch` control batching (default 2 and 3).
- Enable `parallel_processing` and tune `max_workers` for speed.

### POST /generate-los

Generate learning objectives for given module names.

**Request JSON body:**
```json
{
  "courseID": "<course id>",
  "ModuleName": ["Module 1", "Module 2"],
  "n_los": 6
}
```

- `courseID` (string): Course identifier used to select course-specific docs/vector store.
- `ModuleName` (array of strings): List of module titles to generate LOs for.
- `n_los` (optional, integer): Number of learning objectives to generate per module (defaults to 6).

**Response:**
A JSON mapping of module name to a list of generated learning objectives. 

Example:
```json
{
  "Module 1": ["Understand ...", "Explain ...", ...],
  "Module 2": [...]
}
```

### POST /generate-module

Generate complete module content based on learning objectives and user preferences.

**Request JSON body:**
```json
{
  "courseID": "egrf",
  "userProfile": {
    "_id": {
      "CourseID": "CSE101",
      "LearnerID": "L123"
    },
    "preferences": {
      "DetailLevel": "detailed",
      "ExplanationStyle": "conceptual",
      "Language": "technical"
    },
    "lastUpdated": "2025-10-04T10:30:00Z"
  },
  "ModuleLO": {
    "Understanding Processor Architecture": {
      "learning_objectives": [
        "Understand the fundamental components of a processor architecture including ALU, registers, and control units",
        "Analyze the control unit's role in coordinating instruction execution with ALU and register operations"
      ]
    }
  }
}
```

- `courseID` (string): Course identifier used to select course-specific docs/vector store.
- `userProfile` (object): User preferences matching the structure in `sample_userpref.json`.
- `ModuleLO` (object): Module names mapped to their learning objectives, matching the structure in `sample_lo.json`.

**Response:**
A JSON mapping of module name to generated markdown content (with thinking tokens removed).

Example:
```json
{
  "Understanding Processor Architecture": "# Understanding Processor Architecture\n\n## Introduction\n\n..."
}
```

## Run locally

1. Install dependencies (recommended in a virtualenv):

```bash
pip install -r requirements.txt
pip install fastapi uvicorn omegaconf pydantic python-dotenv httpx
```

2. Start the server (development):

```bash
python apiserver.py
```

This starts a local uvicorn server on port 8000 (0.0.0.0:8000). For production, run:

```bash
uvicorn apiserver:app --host 0.0.0.0 --port 8000 --workers 1
```

## Example curl requests

### Upload Files
```bash
curl -X POST "http://localhost:8000/upload-file" \
  -F "courseid=CS101" \
  -F "files=@document1.pdf" \
  -F "files=@document2.pdf"
```

### Create Vector Store
```bash
curl -X POST "http://localhost:8000/createvs" \
  -H "Content-Type: application/json" \
  -d '{"courseid": "CS101"}'
```

### Generate Quiz
```bash
curl -X POST "http://localhost:8000/generate-quiz" \
  -H "Content-Type: application/json" \
  -d '{"modulecontent": "## Introduction\n\nA processor is the central component of a computer system...", "modulename": "Understanding Processor Architecture"}'
```

### Generate LOs
```bash
curl -X POST "http://localhost:8000/generate-los" \
  -H "Content-Type: application/json" \
  -d '{"courseID":"EC2101", "ModuleName":["Combinational Logic","Sequential Circuits"], "n_los":6}'
```

### Generate Module Content
```bash
curl -X POST "http://localhost:8000/generate-module" \
  -H "Content-Type: application/json" \
  -d '{
    "courseID": "CSE101",
    "userProfile": {
      "_id": {"CourseID": "CSE101", "LearnerID": "L123"},
      "preferences": {
        "DetailLevel": "detailed",
        "ExplanationStyle": "conceptual",
        "Language": "technical"
      },
      "lastUpdated": "2025-10-04T10:30:00Z"
    },
    "ModuleLO": {
      "Understanding Processor Architecture": {
        "learning_objectives": [
          "Understand the fundamental components of a processor architecture",
          "Analyze the control unit role in instruction execution"
        ]
      }
    }
  }'
```

## Testing

Run the test script to verify the module generation endpoint:

```bash
python test_module_generation.py
```

```bash
curl -X POST "http://localhost:8000/generate-los" \
  -H "Content-Type: application/json" \
  -d '{"courseID":"EC2101", "ModuleName":["Combinational Logic","Sequential Circuits"], "n_los":6}'
```

## Notes and caveats

- The endpoints use the existing `conf/config.yaml` for defaults. They update `lo_gen.course_id` and `module_gen.course_id` from the request to select course-specific data.
- Generation uses the VLLM endpoints as configured by environment variables in `lo_gen/vllm_client.py` and `module_gen/vllm_client.py` (VLLM_4B_URL, VLLM_API_KEY, etc.). Ensure those services are running and reachable.
- Generation can be slow depending on the model. Consider running the API behind an async worker or queue for production.
- The `/generate-module` endpoint automatically removes thinking tokens from the generated content, returning clean markdown format as stored in the outputs directory.
- User preferences support DetailLevel (detailed/brief/moderate), ExplanationStyle (examples-heavy/theory-focused/balanced), and Language (technical/simple/balanced) options.

