# Learning Objectives Generator

Generates learning objectives for educational modules using LLM and vector store retrieval.

## Usage

### Basic Command

Generate learning objectives for a single module:

```bash
python lo_gen/main.py lo_gen.modules='["Module Name"]'
```

### Generate Multiple Modules

```bash
python lo_gen/main.py lo_gen.modules='["Module 1", "Module 2", "Module 3"]'
```

### Customize Parameters

```bash
# Set number of learning objectives per module (default: 4)
python lo_gen/main.py lo_gen.modules='["Information Retrieval Models"]' lo_gen.n_los=5

# Set number of context chunks to retrieve (default: 5)
python lo_gen/main.py lo_gen.modules='["Information Retrieval Models"]' lo_gen.top_k=10

# Combine parameters
python lo_gen/main.py lo_gen.modules='["Information Retrieval Models"]' lo_gen.n_los=6 lo_gen.top_k=8
```

### Using a Module List File

Create a text file with one module name per line:

```bash
# modules.txt
Information Retrieval Models
Query Processing
Text Mining
```

Then run:

```bash
python lo_gen/main.py lo_gen.modules_file=modules.txt
```

### Custom Output Path

```bash
python lo_gen/main.py lo_gen.modules='["Module Name"]' lo_gen.save_path=outputs/custom/los.json
```

## Output

Results are saved to `outputs/los-{timestamp}/los.json` by default.

Each module entry contains:
- `learning_objectives`: List of generated objectives
- `raw_model_output`: Complete LLM response
- `context_chunks`: Retrieved context used for generation

## Requirements

- Vector store must be present at `data/vector_store/`
- VLLM server running at the configured endpoint
- All dependencies installed from `requirements.txt`
