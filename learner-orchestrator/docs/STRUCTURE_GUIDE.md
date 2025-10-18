# Project Structure Guide

## New Directory Structure

```
learner-orchestrator/
├── app/                          # Main application package
│   ├── __init__.py              # Package initialization
│   ├── core/                    # Core application logic
│   │   ├── __init__.py
│   │   └── config.py           # ⭐ Configuration management
│   └── db/                      # Database layer
│       ├── __init__.py          # Database exports
│       ├── database.py          # DB connections (PostgreSQL + MongoDB)
│       ├── models.py            # SQLAlchemy ORM models
│       └── schemas.py           # Pydantic validation schemas
├── services/                     # Business logic
│   ├── __init__.py
│   ├── analytics_service.py
│   ├── diagnostic_service.py
│   ├── feedback_service.py
│   └── learning_service.py
├── main.py                       # FastAPI application entry point
├── routes.py                     # API route definitions
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env                          # Environment variables (gitignored)
```

---

## Configuration Usage Guide

### 1. How Configuration Works

The configuration system uses **Pydantic Settings** which loads config from:
1. **Environment variables** (highest priority)
2. **.env file** (second priority)
3. **Default values** in code (fallback)

### 2. Using Config in Your Code

#### Example 1: Import in Services
```python
# In services/diagnostic_service.py
from app.core.config import settings

class DiagnosticService:
    def __init__(self, db: Session):
        self.db = db
        
    async def call_sme_service(self):
        # Use settings to get SME service URL
        sme_url = settings.sme_service_url
        response = requests.post(f"{sme_url}/generate-module", ...)
        return response
```

#### Example 2: Import in Routes
```python
# In routes.py
from app.core.config import settings

@router.get("/info")
def get_service_info():
    return {
        "service": settings.project_name,
        "port": settings.service_port,
        "learner_service": settings.learner_service_url
    }
```

#### Example 3: Import in main.py
```python
# In main.py
from app.core.config import settings

app = FastAPI(
    title=settings.project_name,  # Uses config value
    description="...",
    version="2.0.0"
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.service_port,  # Uses config value
        reload=True
    )
```

### 3. Environment Variables (.env file)

Create a `.env` file in the project root:

```env
# Application
PROJECT_NAME="Learner Orchestrator Service"
SERVICE_PORT=8001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lmw_database
DB_USER=lmw_user
DB_PASSWORD=lmw_password

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=lmw_mongo

# External Services
LEARNER_SERVICE_URL=http://localhost:8000
SME_SERVICE_URL=http://localhost:8002
```

**Docker Override:**
```env
# For Docker deployment
DB_HOST=postgres
MONGO_URI=mongodb://mongodb:27017
```

### 4. Accessing Configuration Properties

```python
from app.core.config import settings

# Access basic settings
project_name = settings.project_name
port = settings.service_port

# Access computed properties
database_url = settings.database_url  
# Returns: "postgresql://lmw_user:lmw_password@localhost:5432/lmw_database"

mongo_url = settings.mongo_url
# Returns: "mongodb://localhost:27017"

mongo_db_name = settings.mongo_db_name
# Returns: "lmw_mongo"

# Access external service URLs
learner_api = settings.learner_service_url
sme_api = settings.sme_service_url
```

### 5. Database Connection Usage

The database connections use config automatically:

```python
# In app/db/database.py (already configured)
from app.core.config import settings

# PostgreSQL engine uses settings.database_url
engine = create_engine(
    settings.database_url,  # Automatically from config
    pool_pre_ping=True,
    pool_recycle=3600,
)

# MongoDB connection uses settings.mongo_url
mongo_client = MongoClient(settings.mongo_url)
mongo_db = mongo_client[settings.mongo_db_name]
```

### 6. Import Patterns

**✅ Correct:**
```python
from app.core.config import settings

# Use settings.property
db_url = settings.database_url
```

**✅ Also correct (if you need the function):**
```python
from app.core.config import get_settings

settings = get_settings()
db_url = settings.database_url
```

**❌ Don't do this:**
```python
from config import settings  # Old way - won't work!
```

---

## Import Changes Summary

### Old Imports → New Imports

| Old | New |
|-----|-----|
| `from config import settings` | `from app.core.config import settings` |
| `from database import get_db` | `from app.db.database import get_db` |
| `from models import CourseDiagnostic` | `from app.db.models import CourseDiagnostic` |
| `from schemas import ModuleFeedbackCreate` | `from app.db.schemas import ModuleFeedbackCreate` |

### Files Already Updated
- ✅ `services/diagnostic_service.py`
- ✅ `services/feedback_service.py`
- ✅ `services/learning_service.py`
- ✅ `services/analytics_service.py`
- ✅ `routes.py`
- ✅ `main.py`

---

## Changes Made

### 1. **Removed Visual Explanation Style**
- Updated `app/db/schemas.py`
- Changed from: `"example-heavy|conceptual|practical|visual"`
- Changed to: `"example-heavy|conceptual|practical"`

### 2. **Created New Directory Structure**
```
app/
├── core/config.py        # Configuration with detailed docstrings
├── db/
│   ├── database.py       # Enhanced with usage examples
│   ├── models.py         # Enhanced with detailed docstrings
│   └── schemas.py        # Enhanced with usage examples
```

### 3. **Enhanced Documentation**
- Added comprehensive docstrings to all modules
- Added usage examples in docstrings
- Added type hints and return types
- Added inline comments explaining key concepts

---

## Testing the Changes

### 1. Start the service
```bash
cd /home/yajat/Documents/LMA/Learning-Middleware-iREL/learner-orchestrator
python main.py
```

### 2. Verify config is loading
```python
# In Python shell
from app.core.config import settings
print(settings.database_url)
print(settings.mongo_url)
print(settings.project_name)
```

### 3. Run the test suite
```bash
cd /home/yajat/Documents/LMA/Learning-Middleware-iREL
./test_all_services.sh
```

---

## Docker Deployment

The Dockerfile needs to be updated to reflect the new structure. The current imports are already updated, so the Docker build should work as-is. The config will automatically pick up environment variables from docker-compose.yml.

```yaml
# In docker-compose.yml
environment:
  - DB_HOST=postgres
  - MONGO_URI=mongodb://mongodb:27017
  - LEARNER_SERVICE_URL=http://host.docker.internal:8000
```

---

## Benefits of New Structure

1. **Organized Code**: Clear separation of concerns
   - `app/core/`: Application-level concerns (config, security, etc.)
   - `app/db/`: Data layer (models, schemas, connections)
   - `services/`: Business logic

2. **Better IDE Support**: Proper package structure enables better autocomplete

3. **Easier Testing**: Can mock `settings` for unit tests

4. **Scalability**: Easy to add new core modules (logging, security, etc.)

5. **Clear Dependencies**: Import paths show layer hierarchy

---

## Next Steps

1. ✅ All imports updated
2. ✅ Directory structure created
3. ✅ Documentation added
4. ⏳ Test the service
5. ⏳ Update Dockerfile if needed
6. ⏳ Run comprehensive tests
