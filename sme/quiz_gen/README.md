# Quiz Generation Module

Generate quiz questions from module content using knowledge base retrieval and LangGraph workflow.

## Features

- **🚀 Parallel Processing**: 2-4x faster generation with concurrent chunk processing
- **📦 Smart Batching**: Configurable batch processing (default: 3 questions for 2 chunks = 50% fewer LLM calls!)
- **Knowledge Base Integration**: Retrieves relevant context from course-specific vector stores
- **Markdown Chunking**: Splits content by headers for better organization
- **LangGraph Workflow**: Structured pipeline for content processing and question generation
- **Highly Configurable**: Adjust batch size, questions per batch, retrieval depth, workers, and more

## Command Line Usage

### Basic Usage

```bash
python sme/quiz_gen/main.py \
    quiz_gen.module_content_path=path/to/module.md
```

### Specify Course ID (Vector Store)

Use a specific course's vector store for knowledge base retrieval:

```bash
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module-processor_architecture.md
```

### Full Configuration Example

```bash
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module-processor_architecture.md \
    quiz_gen.module_name="Processor Architecture" \
    quiz_gen.batch_size=2 \
    quiz_gen.questions_per_batch=3 \
    quiz_gen.retrieval_top_k=5 \
    quiz_gen.output=outputs/my_quiz.json
```

### Customizing Batching

Control how many questions are generated per batch:

```bash
# Generate 5 questions for every 3 chunks
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.batch_size=3 \
    quiz_gen.questions_per_batch=5

# Disable batching (1 chunk = 1 question each)
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.batch_size=1 \
    quiz_gen.questions_per_batch=1
```

### Configuration Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `quiz_gen.course_id` | Course ID for vector store selection | `EC2101` | `CS101` |
| `quiz_gen.module_content_path` | Path to module markdown file | **Required** | `outputs/module.md` |
| `quiz_gen.module_name` | Override module name | Extracted from content | `"My Module"` |
| `quiz_gen.questions_per_chunk` | Questions to generate per chunk (legacy) | `1` | `2` |
| `quiz_gen.retrieval_top_k` | Knowledge base chunks to retrieve | `3` | `5` |
| `quiz_gen.parallel_processing` | Enable parallel chunk processing | `true` | `false` |
| `quiz_gen.max_workers` | Number of parallel workers | `4` | `8` |
| `quiz_gen.batch_size` | Number of chunks per batch | `2` | `3` |
| `quiz_gen.questions_per_batch` | Questions generated per batch | `3` | `5` |
| `quiz_gen.output` | Custom output file path | Auto-generated | `outputs/quiz.json` |
| `quiz_gen.temperature` | LLM temperature | `0.3` | `0.5` |

## Prerequisites

### 1. Vector Store Setup

Before generating quizzes, you need a vector store for knowledge base retrieval:

```bash
# 1. Upload course documents (via API)
curl -X POST "http://localhost:8000/upload-file" \
  -F "courseid=EC2101" \
  -F "files=@document1.pdf" \
  -F "files=@document2.pdf"

# 2. Create vector store
curl -X POST "http://localhost:8000/createvs" \
  -H "Content-Type: application/json" \
  -d '{"courseid": "EC2101"}'
```

### 2. VLLM Server

Ensure VLLM server is running. Configure via environment variables:

```bash
export VLLM_4B_URL=http://localhost:8001/v1
export VLLM_4B_MODEL=./Qwen3-4B-Thinking-2507-Q4_K_M.gguf
export VLLM_API_KEY=dummy
```

Or create a `.env` file:

```env
VLLM_4B_URL=http://localhost:8001/v1
VLLM_4B_MODEL=./Qwen3-4B-Thinking-2507-Q4_K_M.gguf
VLLM_API_KEY=dummy
```

## Output Format

The generated quiz is saved as JSON:

```json
{
  "quiz_metadata": {
    "module_name": "Processor Architecture",
    "total_questions": 10,
    "question_types": ["mcq"],
    "generated_at": "2025-10-14T12:00:00Z",
    "generation_method": "langgraph_agent",
    "chunks_processed": 5,
    "generation_config": {
      "chunking_method": "markdown_headers",
      "questions_per_chunk": 2,
      "temperature": 0.3
    }
  },
  "questions": [
    {
      "id": 1,
      "question": "What is the primary function of the ALU?",
      "options": [
        "A) Store data",
        "B) Perform arithmetic operations",
        "C) Control instruction flow",
        "D) Manage memory"
      ],
      "correct_answer": "B",
      "explanation": "The ALU performs arithmetic and logical operations...",
      "topic": "Processor Components",
      "type": "mcq",
      "chunk_index": 0
    }
  ]
}
```

## Examples

### Example 1: Generate Quiz for Different Courses

```bash
# For EC2101 course
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/ir_module.md

# For CS101 course
python sme/quiz_gen/main.py \
    quiz_gen.course_id=CS101 \
    quiz_gen.module_content_path=outputs/cs_module.md
```

### Example 2: Generate More Questions

```bash
# Generate 3 questions per content chunk
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.questions_per_chunk=3
```

### Example 3: Deeper Knowledge Base Retrieval

```bash
# Retrieve top 5 most relevant chunks from knowledge base
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.retrieval_top_k=5
```

### Example 4: Custom Output Location

```bash
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.output=custom_output/my_quiz.json
```

### Example 5: Fast Generation with Parallel Processing

```bash
# Use 8 workers for faster generation (2-4x speedup)
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/large_module.md \
    quiz_gen.parallel_processing=true \
    quiz_gen.max_workers=8
```

### Example 6: Disable Parallel Processing

```bash
# Use sequential processing (useful for debugging)
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.parallel_processing=false
```

## API Usage

You can also generate quizzes via the REST API:

```bash
curl -X POST "http://localhost:8000/generate-quiz" \
  -H "Content-Type: application/json" \
  -d '{
    "courseID": "EC2101",
    "module_content": "# Module Title\n\n## Section 1\nContent...",
    "questions_per_chunk": 2,
    "retrieval_top_k": 3
  }'
```

## Configuration File

Default settings are in `sme/conf/config.yaml`:

```yaml
quiz_gen:
  course_id: "EC2101"
  questions_per_chunk: 1
  retrieval_top_k: 3
  temperature: 0.3
  output_dir: "outputs"
  question_types: ["mcq"]
```

Override these via command line as shown above.

## Troubleshooting

### Vector Store Not Found

```
⚠️ Vector store not available - will generate questions without knowledge base context
```

**Solution**: Create vector store first via `/createvs` API endpoint.

### VLLM Server Connection Error

```
❌ Error: Connection refused
```

**Solution**: Ensure VLLM server is running and `VLLM_4B_URL` is correct.

### No Content Chunks Generated

```
⚠️ No level 2 headers found, falling back to all headers
```

**Solution**: Ensure module content has proper markdown headers (`##`).

## Performance Optimization

### ⚡ Parallel Processing + Smart Batching

Quiz generation now uses **dual optimization** for maximum speed:

1. **Smart Batching**: Generates 3 questions for every 2 chunks (50% fewer LLM calls)
2. **Parallel Processing**: Processes batches concurrently

**Speed Gains:**
- 2-4x faster with parallel processing
- Additional 30-40% reduction from batching
- Combined: **3-5x faster** than original sequential approach
- Automatic optimization when beneficial

**Configuration:**
```bash
# Fast generation with 6 workers
python sme/quiz_gen/main.py \
    quiz_gen.course_id=EC2101 \
    quiz_gen.module_content_path=outputs/module.md \
    quiz_gen.max_workers=6 \
    quiz_gen.questions_per_chunk=2
```

**See [PERFORMANCE.md](PERFORMANCE.md) for:**
- Detailed benchmarks
- Tuning guidelines
- Best practices
- Troubleshooting

### Quick Performance Tips

1. **Smart batching is automatic** - System generates 3 questions per 2 chunks (50% fewer calls)
2. **Use parallel processing** (enabled by default for 2+ chunks)
3. **Adjust workers** based on module size: 4 workers for small, 6-8 for large
4. **Optimize retrieval**: Use `retrieval_top_k=2` for faster, still good results
5. **Keep server warm**: Vector store loads once, reuse for multiple generations

**Example Speed Improvement:**
- 8 chunks, original: 8 LLM calls
- 8 chunks, with batching: 4 LLM calls (50% reduction!)
- With parallel processing (4 workers): All 4 calls run concurrently

## Dependencies

- `langgraph`
- `langchain-openai`
- `langchain-community`
- `langchain-huggingface`
- `omegaconf`
- `loguru`
- `python-dotenv`

Install via:

```bash
pip install -r requirements.txt
```
