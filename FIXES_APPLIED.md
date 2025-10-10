# Fixes Applied - Module Storage & File Upload

## Date: October 11, 2025

## Issues Fixed

### 1. MongoDB Connection Issue - Module Names Not Storing ✅

**Problem:** MongoDB wasn't properly connected, preventing module names and learning objectives from being stored.

**Root Cause:** 
- MongoDB was not running (Docker container was stopped)
- MongoDB connection string was missing the `authSource=admin` parameter

**Solution:**
1. Started MongoDB container: `docker start lmw_mongodb`
2. Updated MongoDB connection string in `/instructor/config.py`:
   ```python
   mongodb_url: str = "mongodb://lmw_user:lmw_password@localhost:27017/?authSource=admin"
   ```
3. Added health check endpoint at `/api/v1/instructor/health/mongodb` to verify MongoDB connectivity

**Testing:**
```bash
curl http://localhost:8001/api/v1/instructor/health/mongodb
```
Expected output:
```json
{
  "status": "connected",
  "database": "lmw_mongo",
  "collections": ["learning_objectives", "course_files"]
}
```

---

### 2. Enhanced Module Creation Error Handling ✅

**Problem:** When module creation failed, errors were not properly logged or reported.

**Solution:**
Enhanced the `create_course` endpoint in `/instructor/routes.py` with:
- Detailed logging for each module creation step
- Try-catch blocks for individual module creation
- Graceful handling of MongoDB initialization failures
- Clear success/warning/error indicators (✓, ⚠, ✗)
- Proper transaction rollback on module creation failures

**New Log Output:**
```
Creating 3 modules...
Creating module 1 with ID: COURSE_ABC123_MOD_1
  Title: 'Introduction to Python'
  Description: 'Basic Python concepts'
✓ Successfully created module: COURSE_ABC123_MOD_1 - Introduction to Python
✓ Initialized learning objectives for module: COURSE_ABC123_MOD_1
```

---

### 3. File Upload to SME Directory ✅

**Problem:** Uploaded files were being stored in `./uploads/{courseid}/` instead of the SME service's `sme/data/docs/{courseid}/` directory.

**Solution:**
Modified `FileCRUD.upload_file()` in `/instructor/crud.py`:

**Before:**
```python
course_dir = os.path.join(upload_dir, course_id)
os.makedirs(course_dir, exist_ok=True)
file_path = os.path.join(course_dir, unique_filename)
```

**After:**
```python
from pathlib import Path
project_root = Path(__file__).parent.parent
sme_docs_dir = project_root / "sme" / "data" / "docs" / course_id
sme_docs_dir.mkdir(parents=True, exist_ok=True)
file_path = sme_docs_dir / unique_filename
```

**File Storage Structure:**
```
Learning-Middleware-iREL/
├── instructor/
│   └── crud.py (updated)
└── sme/
    └── data/
        └── docs/
            └── COURSE_ABC123/     ← Files stored here
                ├── uuid1.pdf
                ├── uuid2.docx
                └── uuid3.pptx
```

**Benefits:**
- Files are now accessible to SME service for learning objective generation
- Vector store can directly access course documents
- Proper separation of concerns (SME manages course content)

---

## Files Modified

1. **`/instructor/config.py`**
   - Updated MongoDB connection string to include `authSource=admin`

2. **`/instructor/routes.py`**
   - Added `/health/mongodb` endpoint
   - Enhanced module creation error handling and logging
   - Added try-catch blocks for individual module operations

3. **`/instructor/crud.py`**
   - Modified `FileCRUD.upload_file()` to use SME directory
   - Added success logging for file uploads
   - Changed from `os.path` to `pathlib.Path` for better path handling

---

## How to Verify

### Test 1: MongoDB Connection
```bash
# Check MongoDB is running
docker ps | grep mongo

# Test health endpoint
curl http://localhost:8001/api/v1/instructor/health/mongodb
```

### Test 2: Create Course with Multiple Modules
```bash
# Via UI: Go to http://localhost:3000/instructor/courses/create
# 1. Fill in course details
# 2. Add 3+ modules with different titles
# 3. Submit and check backend logs for "✓ Successfully created module" messages
```

### Test 3: File Upload
```bash
# Upload a PDF file through UI
# Check that file appears in: ./sme/data/docs/{COURSE_ID}/

ls -la ./sme/data/docs/COURSE_*/
```

### Test 4: Database Verification
```bash
# PostgreSQL - Check modules were created
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database \
  -c "SELECT moduleid, title FROM module ORDER BY created_at DESC LIMIT 5;"

# MongoDB - Check learning objectives initialized
docker exec -it lmw_mongodb mongosh -u lmw_user -p lmw_password \
  --authenticationDatabase admin lmw_mongo \
  --eval "db.learning_objectives.find().pretty()"
```

---

## Next Steps

### Recommended Improvements:

1. **Vector Store Integration**
   - Update SME service to automatically index uploaded documents
   - Trigger vector store rebuild when new files are uploaded
   - See: `/sme/chat/rag.py` and `/sme/lo_gen/main.py`

2. **File Processing Pipeline**
   - Add background job to process uploaded files
   - Extract text from PDFs/DOCX for learning objective generation
   - Update module content automatically

3. **MongoDB Backup**
   - Set up regular backups of learning objectives and file metadata
   - Add volume mount in docker-compose.yml for MongoDB data persistence

4. **Error Monitoring**
   - Add Sentry or logging service for production
   - Set up alerts for MongoDB connection failures
   - Monitor file upload failures

---

## Common Issues & Solutions

### Issue: "MongoDB connection refused"
**Solution:** 
```bash
docker start lmw_mongodb
sleep 3  # Wait for MongoDB to start
```

### Issue: "Authentication failed"
**Solution:** Check that connection string includes `?authSource=admin`

### Issue: Files not appearing in SME directory
**Solution:** 
1. Check file permissions: `ls -la sme/data/docs/`
2. Verify course ID is correct
3. Check backend logs for "✓ File uploaded successfully" message

### Issue: Only first module gets created
**Solution:** 
1. Check MongoDB is running
2. Check backend logs for module creation errors
3. Verify frontend is sending all modules in the array

---

## Service Status

- ✅ MongoDB: Running on port 27017
- ✅ PostgreSQL: Running on port 5432  
- ✅ Instructor API: Running on port 8001
- ⏸️  UI: Start with `cd ui && npm run dev`

---

## Contact & Support

For issues or questions:
1. Check backend logs: `docker logs -f lmw_postgres` or `docker logs -f lmw_mongodb`
2. Review instructor API logs: Check terminal where `uvicorn` is running
3. Test endpoints with: `curl` or Postman collection in `/docs/`
