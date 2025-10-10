LO Generator API

This FastAPI service exposes an endpoint to generate Learning Objectives (LOs) for given module names using the existing `lo_gen` generator.

Endpoint

POST /generate-los

Request JSON body:
{
  "courseID": "<course id>",
  "ModuleName": ["Module 1", "Module 2"],
  "n_los": 6
}

- `courseID` (string): Course identifier used to select course-specific docs/vector store.
- `ModuleName` (array of strings): List of module titles to generate LOs for.
- `n_los` (optional, integer): Number of learning objectives to generate per module (defaults to 6).

Response:
A JSON mapping of module name to a list of generated learning objectives. Example:
{
  "Module 1": ["Understand ...", "Explain ...", ...],
  "Module 2": [...]
}


Run locally

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

Example curl

```bash
curl -X POST "http://localhost:8000/generate-los" \
  -H "Content-Type: application/json" \
  -d '{"courseID":"EC2101", "ModuleName":["Combinational Logic","Sequential Circuits"], "n_los":6}'
```

Notes and caveats

- The endpoint uses the existing `conf/config.yaml` for defaults. It updates `lo_gen.course_id` from the request to select course-specific data.
- Generation uses the VLLM endpoints as configured by environment variables in `lo_gen/vllm_client.py` (VLLM_4B_URL, VLLM_API_KEY, etc.). Ensure those services are running and reachable.
- Generation can be slow depending on the model. Consider running the API behind an async worker or queue for production.

