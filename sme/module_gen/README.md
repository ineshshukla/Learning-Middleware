# Module Content Generator

Generates structured, comprehensive learning content for educational modules in **Markdown format** using:
- Learning objectives
- User preferences (detail level, explanation style, language)
- Vector store retrieval for relevant context
- LLM-powered content generation

## Features

✅ **Markdown-First Output**: Generates clean, well-formatted markdown files ready for use  
✅ **Context-Aware**: Retrieves relevant content chunks from vector store for each learning objective  
✅ **Personalized**: Adapts content based on user learning preferences  
✅ **Comprehensive**: Covers all learning objectives with detailed explanations and examples  
✅ **Structured**: Uses proper headers, lists, code blocks, tables, and quotes  
✅ **Thinking Model Compatible**: Handles verbose output from Qwen3-4B-Thinking model

## Overview

The module content generator:
1. Takes learning objectives for a module
2. Retrieves relevant context from the vector store for each objective
3. Applies user learning preferences (detail level, explanation style, language)
4. Generates comprehensive, structured module content using LLM
5. Outputs both JSON and Markdown formats

## Usage

### Basic Command

Generate content using the sample files:

```bash
python module_gen/main.py
```

This uses the default sample files:
- `module_gen/sample_lo.json` - Learning objectives
- `module_gen/sample_userpref.json` - User preferences

### Custom Input Files

```bash
# Specify custom learning objectives and preferences files
python module_gen/main.py \
  module_gen.lo_file=path/to/objectives.json \
  module_gen.pref_file=path/to/preferences.json
```

### Specify Module

If your learning objectives file contains multiple modules:

```bash
python module_gen/main.py module_gen.module="Information Retrieval Models"
```

### Custom Output Path

```bash
# Save to specific markdown file
python module_gen/main.py module_gen.output=outputs/my_module.md

# The metadata will be saved as outputs/my_module_metadata.json
```

### Adjust Context Retrieval

```bash
# Retrieve more context chunks per objective (default: 3)
python module_gen/main.py module_gen.top_k_per_objective=5
```

## Input File Formats

### Learning Objectives (JSON)

```json
{
  "Module Name": {
    "learning_objectives": [
      "Understand the fundamental concepts of...",
      "Explain how different approaches...",
      "Analyze the trade-offs between..."
    ]
  }
}
```

### User Preferences (JSON)

```json
{
  "_id": {
    "CourseID": "CSE101",
    "LearnerID": "L123"
  },
  "preferences": {
    "DetailLevel": "detailed",           // "brief" | "moderate" | "detailed"
    "ExplanationStyle": "examples-heavy", // "theory-focused" | "balanced" | "examples-heavy"
    "Language": "technical"              // "simple" | "moderate" | "technical"
  },
  "lastUpdated": "2025-10-04T10:30:00Z"
}
```

## Output

The generator produces two files:

1. **Markdown file** (`.md`) - PRIMARY OUTPUT:
   - Complete module content in markdown format
   - Human-readable and ready to use
   - Includes learning objectives header
   - Properly formatted with headers, lists, code blocks, etc.

2. **JSON metadata file** (`_metadata.json`):
   - Structured metadata for programmatic access
   - Learning objectives list
   - User preferences used
   - Generation statistics
   - Parsed content sections

Default location: `outputs/module-{timestamp}/`
Default filename: `{module_name}.md` and `{module_name}_metadata.json`

## Output Structure

### Markdown File (Primary Output)
```markdown
# Information Retrieval Models

**Generated:** 2025-10-09T10:30:00Z  
**Learning Objectives:** 6

---

## Learning Objectives

1. Understand the role of caching in improving query performance
2. Explain how vector space models represent documents...
...

---

## Introduction

Content begins here with proper markdown formatting...

### Subtopic 1

Detailed explanation with **bold**, *italic*, and code:

```python
example_code()
```

...
```

### JSON Metadata File
```json
{
  "module_name": "Information Retrieval Models",
  "learning_objectives": [...],
  "user_preferences": {...},
  "markdown_content": "# Information Retrieval Models\n\n...",
  "content": {
    "sections": [...]
  },
  "metadata": {
    "generated_at": "2025-10-09T10:30:00Z",
    "num_objectives": 6,
    "num_context_chunks": 18,
    "content_length": 4521
  }
}
```

## Requirements

- Vector store at `data/vector_store/`
- VLLM 4B model server running (configured in vllm_client.py)
- Dependencies installed from `requirements.txt`

## User Preference Options

### Detail Level
- **brief**: Concise, focused explanations
- **moderate**: Balanced detail with clear explanations  
- **detailed**: Comprehensive, in-depth coverage

### Explanation Style
- **theory-focused**: Emphasis on concepts and principles
- **balanced**: Mix of theory and practical examples
- **examples-heavy**: Many concrete examples and use-cases

### Language
- **simple**: Accessible, plain language
- **moderate**: Balance technical terms with explanations
- **technical**: Precise technical terminology

## Example

```bash
# Generate detailed, example-heavy content for Information Retrieval Models
python module_gen/main.py \
  module_gen.module="Information Retrieval Models" \
  module_gen.top_k_per_objective=5 \
  module_gen.output=outputs/ir_models.md
```

Output:
```
✅ Module content generated successfully!
Module: Information Retrieval Models
Objectives covered: 6
Markdown file: outputs/ir_models.md
Metadata JSON: outputs/ir_models_metadata.json
```
