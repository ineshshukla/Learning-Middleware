# Multi-Vector Store RAG System

This system supports both **global** and **module-specific** vector stores for course materials.

## Overview

For each course, the system creates:
- **1 Global Vector Store**: Contains only files uploaded directly to `data/docs/{course_id}/` (NOT including files in module subdirectories)
- **N Module-Specific Vector Stores**: One for each module directory in `data/docs/{course_id}/{module_id}`

### Important: Global vs Module Files
- **Global files**: Upload without module_id → saved to `data/docs/{course_id}/` → indexed in global vector store only
- **Module files**: Upload with module_id → saved to `data/docs/{course_id}/{module_id}/` → indexed in that module's vector store only
- Files are NOT duplicated between global and module vector stores

## Directory Structure

```
data/docs/
└── {course_id}/           # e.g., "test" or "EC2101"
    ├── syllabus.pdf       # Global file → ONLY in global vector store
    ├── overview.pdf       # Global file → ONLY in global vector store
    ├── m1/                # Module 1
    │   ├── lecture1.pdf   # Module file → ONLY in m1 vector store
    │   └── notes1.pdf
    ├── m2/                # Module 2
    │   ├── lecture2.pdf   # Module file → ONLY in m2 vector store
    │   └── notes2.pdf
    └── m3/                # Module 3
        └── lecture3.pdf   # Module file → ONLY in m3 vector store
```

## Vector Store Storage

After creation, vector stores are saved to:
```
data/vector_store/
└── {course_id}/
    ├── global/            # Contains ONLY syllabus.pdf, overview.pdf (not module files)
    ├── m1/                # Contains ONLY m1 module files
    ├── m2/                # Contains ONLY m2 module files
    └── m3/                # Contains ONLY m3 module files
```

## Usage

### Step 1: Create Vector Stores

After adding your course documents, create all vector stores:

```bash
cd sme/chat
python create_stores.py
```

This will:
1. Read the `course_id` from `conf/config.yaml`
2. Scan `data/docs/{course_id}/` for documents and subdirectories
3. Create a global vector store with files directly in the course directory (NOT including module subdirectories)
4. Create module-specific vector stores for each subdirectory

### Step 2: Configure Chat

Edit `conf/config.yaml` to specify which vector store to use:

**For Global Vector Store (all course materials):**
```yaml
rag:
  course_id: "test"
  module_id: null        # null = use global vector store only
```

**For Module-Specific with Hybrid Retrieval (recommended):**
```yaml
rag:
  course_id: "test"
  module_id: "m1"        # Use module 1 with hybrid retrieval
  global_chunks: 1       # Retrieve 1 chunk from global store
  module_chunks: 4       # Retrieve 4 chunks from module store
```

When `module_id` is specified, the system uses **hybrid retrieval**:
- Retrieves `global_chunks` from the global vector store (course-wide context)
- Retrieves `module_chunks` from the module-specific vector store (focused content)
- Combines both for a balanced context with general course knowledge + specific module details

### Step 3: Start Chat

```bash
cd sme/chat
python main.py
```

The chat will automatically load the appropriate vector store based on your configuration.

## Configuration Reference

### config.yaml - RAG Section

```yaml
rag:
  docs_path: "data/docs"                    # Base path for documents
  embedding_model_name: "all-MiniLM-L6-v2"  # Embedding model
  vector_store_path: "data/vector_store"    # Base path for vector stores
  course_id: "test"                         # Course ID (required)
  module_id: null                           # Module ID (null for global, or "m1", "m2", etc.)
  create_all_stores: false                  # Internal flag (do not modify)
  
  # Hybrid retrieval configuration (used when module_id is specified)
  global_chunks: 1                          # Number of chunks from global vector store
  module_chunks: 4                          # Number of chunks from module vector store
```

### Hybrid Retrieval Settings

When `module_id` is specified, you can control the balance between global and module-specific context:

- **`global_chunks`**: Number of relevant chunks to retrieve from global vector store
  - Default: 1
  - Use higher values (2-3) for questions that might reference course-wide concepts
  
- **`module_chunks`**: Number of relevant chunks to retrieve from module vector store
  - Default: 4
  - Use higher values (5-7) for very module-specific questions

**Example configurations:**

```yaml
# Balanced (default) - Good for most use cases
global_chunks: 1
module_chunks: 4

# Module-focused - For very specific module questions
global_chunks: 0
module_chunks: 5

# Course-aware - For questions that reference both module and course concepts
global_chunks: 2
module_chunks: 3
```

## API Usage

### In Python Code

```python
from rag import create_course_vector_stores, get_vector_store

# Create all vector stores for a course
stores = create_course_vector_stores(
    docs_path="data/docs",
    vs_path="data/vector_store",
    model="all-MiniLM-L6-v2",
    device="cpu",
    course_id="test"
)

# Access stores
global_store = stores['global']
module_1_store = stores['modules']['m1']

# Or load a specific store later
from rag import get_vector_store

# Load global store
global_vs = get_vector_store(
    vs_path="data/vector_store",
    model="all-MiniLM-L6-v2",
    device="cpu",
    course_id="test",
    module_id=None  # None for global
)

# Load module-specific store
module_vs = get_vector_store(
    vs_path="data/vector_store",
    model="all-MiniLM-L6-v2",
    device="cpu",
    course_id="test",
    module_id="m1"
)
```

## Use Cases

### Use Global Vector Store When:
- Answering general questions about the entire course
- Questions about course syllabus, overview, or general course materials
- Questions that span multiple modules but need general course context
- Content uploaded without a specific module assignment

### Use Module-Specific Vector Store When:
- Focused questions about a specific module
- Better context relevance for module-specific content
- Faster retrieval (smaller vector store)
- Working with content uploaded for that specific module

## Notes

- **Global store is separate**: The global vector store contains ONLY files uploaded directly to the course directory (not in module folders)
- **Module stores are independent**: Each module store only contains documents from that specific module directory
- **No duplication**: Files are stored in either global OR module stores, never both
- **Automatic creation**: When you run `create_stores.py`, it automatically detects all module directories
- **Persistent storage**: Vector stores are saved to disk and loaded on demand, avoiding recreation each time
- **Flexible switching**: You can switch between global and module-specific stores by just changing `module_id` in config

## Example Workflow

```bash
# 1. Add your course materials
mkdir -p data/docs/CS101/module1
mkdir -p data/docs/CS101/module2
cp lecture1.pdf data/docs/CS101/module1/
cp lecture2.pdf data/docs/CS101/module2/

# 2. Update config.yaml
# Set course_id: "CS101"

# 3. Create all vector stores
cd sme/chat
python create_stores.py

# 4. Chat with global store (set module_id: null)
python main.py

# 5. Chat with module 1 (set module_id: "module1")
python main.py
```
