# Instructor API Documentation

## Base URL
```
http://localhost:8003/api/v1/instructor
```

## Authentication
All endpoints (except `/signup` and `/login`) require JWT authentication via Bearer token in the Authorization header.

```bash
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### 1. Register Instructor

**Endpoint:** `POST /signup`

**Description:** Register a new instructor account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@university.edu",
  "password": "SecurePassword123!",
  "department": "Computer Science",
  "bio": "Professor specializing in data mining and machine learning"
}
```

**Response:** `201 Created`
```json
{
  "instructorid": "INST_ABC123XYZ",
  "name": "John Doe",
  "email": "john.doe@university.edu",
  "department": "Computer Science",
  "bio": "Professor specializing in data mining and machine learning",
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8003/api/v1/instructor/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@university.edu",
    "password": "SecurePassword123!",
    "department": "Computer Science",
    "bio": "Data mining expert"
  }'
```

---

### 2. Login

**Endpoint:** `POST /login`

**Description:** Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "john.doe@university.edu",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Example:**
```bash
TOKEN=$(curl -s -X POST "http://localhost:8003/api/v1/instructor/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@university.edu",
    "password": "SecurePassword123!"
  }' | jq -r '.access_token')
```

---

### 3. Get Current Instructor Info

**Endpoint:** `GET /me`

**Description:** Get current authenticated instructor's information.

**Response:** `200 OK`
```json
{
  "instructorid": "INST_ABC123XYZ",
  "name": "John Doe",
  "email": "john.doe@university.edu",
  "department": "Computer Science",
  "bio": "Professor specializing in data mining",
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

**Example:**
```bash
curl -X GET "http://localhost:8003/api/v1/instructor/me" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Course Management Endpoints

### 4. Create Course with Modules

**Endpoint:** `POST /courses`

**Description:** Create a new course with optional modules.

**Request Body:**
```json
{
  "course_name": "Data Mining and Machine Learning",
  "coursedescription": "Advanced course covering data mining algorithms and ML techniques",
  "targetaudience": "Graduate students",
  "prereqs": "Linear Algebra, Probability, Programming",
  "modules": [
    {
      "title": "Introduction to Data Mining",
      "description": "Fundamental concepts and techniques"
    },
    {
      "title": "Clustering Algorithms",
      "description": "K-means, hierarchical, and density-based clustering"
    },
    {
      "title": "Classification Methods",
      "description": "Decision trees, SVM, neural networks"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "courseid": "COURSE_ABC123",
  "instructorid": "INST_ABC123XYZ",
  "course_name": "Data Mining and Machine Learning",
  "coursedescription": "Advanced course covering data mining algorithms and ML techniques",
  "targetaudience": "Graduate students",
  "prereqs": "Linear Algebra, Probability, Programming",
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z",
  "modules": [
    {
      "moduleid": "COURSE_ABC123_MOD_1",
      "courseid": "COURSE_ABC123",
      "title": "Introduction to Data Mining",
      "description": "Fundamental concepts and techniques",
      "order_index": 0,
      "created_at": "2025-10-14T10:00:00Z",
      "updated_at": "2025-10-14T10:00:00Z"
    },
    ...
  ]
}
```

**Example:**
```bash
COURSE_RESPONSE=$(curl -s -X POST "http://localhost:8003/api/v1/instructor/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "Data Mining",
    "coursedescription": "Advanced data mining course",
    "targetaudience": "Graduate students",
    "prereqs": "Linear Algebra, Programming",
    "modules": [
      {"title": "Module 1", "description": "Introduction"},
      {"title": "Module 2", "description": "Advanced topics"}
    ]
  }')

COURSE_ID=$(echo "$COURSE_RESPONSE" | jq -r '.courseid')
```

---

### 5. Get All Courses

**Endpoint:** `GET /courses`

**Description:** Get all courses created by the authenticated instructor.

**Response:** `200 OK`
```json
[
  {
    "courseid": "COURSE_ABC123",
    "instructorid": "INST_ABC123XYZ",
    "course_name": "Data Mining",
    "coursedescription": "...",
    "targetaudience": "Graduate students",
    "prereqs": "Linear Algebra",
    "created_at": "2025-10-14T10:00:00Z",
    "updated_at": "2025-10-14T10:00:00Z",
    "modules": [...]
  }
]
```

**Example:**
```bash
curl -X GET "http://localhost:8003/api/v1/instructor/courses" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 6. Get Course by ID

**Endpoint:** `GET /courses/{courseid}`

**Description:** Get a specific course with all its modules.

**Response:** `200 OK`
```json
{
  "courseid": "COURSE_ABC123",
  "instructorid": "INST_ABC123XYZ",
  "course_name": "Data Mining",
  "coursedescription": "...",
  "targetaudience": "Graduate students",
  "prereqs": "Linear Algebra",
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z",
  "modules": [
    {
      "moduleid": "COURSE_ABC123_MOD_1",
      "title": "Introduction",
      ...
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## File Upload & Vector Store Endpoints

### 7. Upload Course Files to SME

**Endpoint:** `POST /courses/{courseid}/upload-to-sme`

**Description:** Upload one or more course reference files (PDFs, documents) to both local storage and SME service. **Supports multiple files in a single request.**

**Query Parameters:**
- `create_vector_store` (optional, default: `true`): Whether to automatically trigger vector store creation
  - `true`: Automatically create/recreate vector store after upload
  - `false`: Skip vector store creation (useful for multiple batch uploads)

**Request:** `multipart/form-data`
- `files`: One or more files to upload

**Response:** `200 OK`
```json
{
  "courseid": "COURSE_ABC123",
  "uploaded_files": [
    {
      "file_id": "uuid-1",
      "filename": "textbook.pdf",
      "file_size": 2500000,
      "file_type": "application/pdf",
      "local_path": "/app/uploads/courses/COURSE_ABC123/textbook.pdf"
    },
    {
      "file_id": "uuid-2",
      "filename": "slides.pdf",
      "file_size": 1200000,
      "file_type": "application/pdf",
      "local_path": "/app/uploads/courses/COURSE_ABC123/slides.pdf"
    }
  ],
  "sme_response": {
    "message": "Successfully uploaded 2 files for course COURSE_ABC123",
    "courseid": "COURSE_ABC123",
    "files": [...]
  },
  "mongo_file_ids": ["uuid-1", "uuid-2"],
  "vector_store_status": "creating",
  "vector_store_message": "Vector store creation started in background"
}
```

**Examples:**

**Single File Upload (Auto-create vector store):**
```bash
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/upload-to-sme" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@textbook.pdf"
```

**Multiple Files Upload (Auto-create vector store):**
```bash
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/upload-to-sme" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@textbook.pdf" \
  -F "files=@slides.pdf" \
  -F "files=@notes.pdf"
```

**Batch Upload Without Vector Store Creation:**
```bash
# Batch 1 - don't create vector store yet
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/upload-to-sme?create_vector_store=false" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf"

# Batch 2 - don't create vector store yet
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/upload-to-sme?create_vector_store=false" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@file3.pdf" \
  -F "files=@file4.pdf"

# Now manually trigger vector store creation with all files
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/create-vector-store" \
  -H "Authorization: Bearer $TOKEN"
```

**Notes:**
- Files are saved locally first at `/app/uploads/courses/{courseid}/`
- Files are then uploaded to SME service
- Metadata stored in MongoDB `course_files` collection
- Vector store creation happens asynchronously (doesn't block response)
- If vector store already exists, it will be recreated with the new files
- Maximum file size and count limits may apply (check server configuration)

---

### 8. Check Vector Store Status

**Endpoint:** `GET /courses/{courseid}/vector-store-status`

**Description:** Monitor the vector store creation progress.

**Response:** `200 OK`
```json
{
  "course_id": "COURSE_ABC123",
  "status": "ready",
  "message": "Vector store created successfully",
  "started_at": "2025-10-14T10:05:00Z",
  "completed_at": "2025-10-14T10:08:15Z",
  "failed_at": null,
  "error": null
}
```

**Status Values:**
- `not_started`: No files uploaded yet
- `creating`: Vector store is being created (in progress)
- `ready`: Vector store is ready for use
- `failed`: Creation failed (check `error` field)

**Example:**
```bash
# Poll until ready
while true; do
  STATUS=$(curl -s "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/vector-store-status" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  if [ "$STATUS" = "ready" ]; then
    echo "Vector store ready!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Vector store creation failed"
    exit 1
  fi
  
  echo "Status: $STATUS, waiting..."
  sleep 5
done
```

---

### 9. Manually Create Vector Store

**Endpoint:** `POST /courses/{courseid}/create-vector-store`

**Description:** Manually trigger vector store creation. Rarely needed since upload endpoint auto-creates by default.

**Response:** `200 OK`
```json
{
  "courseid": "COURSE_ABC123",
  "message": "Vector store creation initiated",
  "status": "creating"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/create-vector-store" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Learning Objectives Endpoints

### 10. Generate Learning Objectives

**Endpoint:** `POST /courses/{courseid}/generate-los`

**Description:** Generate AI-powered learning objectives for course modules using RAG.

**Prerequisites:**
- Vector store must be in `ready` status
- All specified module names must exist in the course

**Request Body:**
```json
{
  "courseid": "COURSE_ABC123",
  "module_names": [
    "Introduction to Data Mining",
    "Clustering Algorithms",
    "Classification Methods"
  ],
  "n_los": 5
}
```

**Response:** `200 OK`
```json
{
  "courseid": "COURSE_ABC123",
  "module_objectives": {
    "Introduction to Data Mining": [
      "Understand the fundamental concepts of data mining",
      "Explain the key processes in data mining pipeline",
      "Analyze data quality impact on mining results",
      "Compare various data mining techniques",
      "Evaluate ethical implications of data mining"
    ],
    "Clustering Algorithms": [
      "Understand k-means clustering principles",
      "Explain hierarchical clustering methods",
      "Analyze cluster quality metrics",
      "Compare different clustering algorithms",
      "Apply clustering to real-world problems"
    ],
    "Classification Methods": [...]
  },
  "status": "success"
}
```

**Error Responses:**
- `400 Bad Request`: No files uploaded or vector store not ready
- `425 Too Early`: Vector store still being created
- `404 Not Found`: Module name not found in course
- `500 Internal Server Error`: Vector store creation failed

**Example:**
```bash
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/generate-los" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseid": "'$COURSE_ID'",
    "module_names": ["Module 1", "Module 2"],
    "n_los": 6
  }'
```

---

### 11. Get Module Learning Objectives

**Endpoint:** `GET /modules/{moduleid}/learning-objectives`

**Description:** Retrieve learning objectives for a specific module.

**Response:** `200 OK`
```json
{
  "module_id": "COURSE_ABC123_MOD_1",
  "module_name": "Introduction to Data Mining",
  "learning_objectives": [
    {
      "objective_id": "lo_1",
      "text": "Understand the fundamental concepts of data mining",
      "order_index": 0,
      "generated_by_sme": true,
      "edited": false
    },
    {
      "objective_id": "lo_2",
      "text": "Explain the data mining process",
      "order_index": 1,
      "generated_by_sme": true,
      "edited": false
    },
    ...
  ],
  "generated_at": "2025-10-14T10:15:00Z",
  "last_modified": "2025-10-14T10:15:00Z"
}
```

**Example:**
```bash
MODULE_ID="COURSE_ABC123_MOD_1"
curl -X GET "http://localhost:8003/api/v1/instructor/modules/$MODULE_ID/learning-objectives" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 12. Update Module Learning Objectives

**Endpoint:** `PUT /modules/{moduleid}/learning-objectives`

**Description:** Edit/update learning objectives for a module. Replaces all existing LOs.

**Request Body:**
```json
{
  "moduleid": "COURSE_ABC123_MOD_1",
  "learning_objectives": [
    "Master data mining fundamentals and applications",
    "Explain the complete data mining pipeline",
    "Analyze data quality metrics and impact",
    "Compare supervised vs unsupervised learning",
    "Evaluate ethical considerations in data mining",
    "Apply preprocessing techniques effectively"
  ]
}
```

**Response:** `200 OK`
```json
{
  "module_id": "COURSE_ABC123_MOD_1",
  "learning_objectives": [
    {
      "objective_id": "lo_1",
      "text": "Master data mining fundamentals and applications",
      "order_index": 0,
      "generated_by_sme": false,
      "edited": true
    },
    {
      "objective_id": "lo_2",
      "text": "Explain the complete data mining pipeline",
      "order_index": 1,
      "generated_by_sme": false,
      "edited": true
    },
    ...
  ],
  "status": "success",
  "message": "Learning objectives updated successfully"
}
```

**Notes:**
- All LOs are marked as `edited: true` and `generated_by_sme: false`
- `last_modified` timestamp is updated
- Can add, remove, or modify any number of LOs

**Example:**
```bash
curl -X PUT "http://localhost:8003/api/v1/instructor/modules/$MODULE_ID/learning-objectives" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleid": "'$MODULE_ID'",
    "learning_objectives": [
      "Updated LO 1",
      "Updated LO 2",
      "New LO 3"
    ]
  }'
```

---

## Complete Workflow Example

```bash
#!/bin/bash

# 1. Register and login
TOKEN=$(curl -s -X POST "http://localhost:8003/api/v1/instructor/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@university.edu",
    "password": "SecurePass123!"
  }' | jq -r '.access_token')

# 2. Create course with modules
COURSE_RESPONSE=$(curl -s -X POST "http://localhost:8003/api/v1/instructor/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "Data Mining",
    "coursedescription": "Advanced data mining course",
    "targetaudience": "Graduate students",
    "prereqs": "Linear Algebra, Programming",
    "modules": [
      {"title": "Introduction", "description": "Fundamentals"},
      {"title": "Clustering", "description": "Clustering algorithms"},
      {"title": "Classification", "description": "Classification methods"}
    ]
  }')

COURSE_ID=$(echo "$COURSE_RESPONSE" | jq -r '.courseid')
echo "Created course: $COURSE_ID"

# 3. Upload multiple course materials
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/upload-to-sme" \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@textbook.pdf" \
  -F "files=@lecture_slides.pdf" \
  -F "files=@additional_readings.pdf"

# 4. Monitor vector store creation
echo "Waiting for vector store creation..."
while true; do
  STATUS=$(curl -s "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/vector-store-status" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  if [ "$STATUS" = "ready" ]; then
    echo "Vector store ready!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Vector store creation failed"
    exit 1
  fi
  
  echo "Status: $STATUS"
  sleep 10
done

# 5. Generate learning objectives
curl -X POST "http://localhost:8003/api/v1/instructor/courses/$COURSE_ID/generate-los" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseid": "'$COURSE_ID'",
    "module_names": ["Introduction", "Clustering", "Classification"],
    "n_los": 5
  }'

# 6. Get module IDs
MODULE_1=$(echo "$COURSE_RESPONSE" | jq -r '.modules[0].moduleid')

# 7. Review generated LOs
curl -X GET "http://localhost:8003/api/v1/instructor/modules/$MODULE_1/learning-objectives" \
  -H "Authorization: Bearer $TOKEN"

# 8. Edit LOs if needed
curl -X PUT "http://localhost:8003/api/v1/instructor/modules/$MODULE_1/learning-objectives" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleid": "'$MODULE_1'",
    "learning_objectives": [
      "Refined LO 1",
      "Refined LO 2",
      "Refined LO 3"
    ]
  }'

echo "Workflow complete!"
```

---

## Data Storage

### PostgreSQL (lmw_database)
- **courses**: Course information
- **modules**: Module information
- **instructors**: Instructor accounts

### MongoDB (lmw_mongo)
- **course_files**: Uploaded file metadata
- **course_vector_stores**: Vector store creation status
- **learning_objectives**: Generated and edited LOs

### Local Storage
- **`/app/uploads/courses/{courseid}/`**: Uploaded course files

---

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **425 Too Early**: Resource not ready yet (e.g., vector store still creating)
- **500 Internal Server Error**: Server-side error

### Error Response Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Rate Limits & Constraints

- **File Upload**: Multiple files supported per request
- **File Size**: Individual file limit (check server configuration)
- **Vector Store**: One per course (recreated when files added)
- **Learning Objectives**: Generated asynchronously via SME service
- **Timeout**: 5 minutes for vector store creation

---

## Health Check

**Endpoint:** `GET /health`

**Description:** Check if instructor service is healthy.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

**Example:**
```bash
curl http://localhost:8003/health
```

---

## Best Practices

1. **Multiple File Uploads**: Upload all related files in a single request when possible
2. **Large File Batches**: For many large files, upload in batches with `create_vector_store=false`, then manually trigger creation
3. **Vector Store Status**: Always check status is `ready` before generating LOs
4. **Error Handling**: Implement retry logic for failed vector store creation
5. **LO Editing**: Review AI-generated LOs and edit as needed for accuracy
6. **Authentication**: Store JWT token securely and refresh when needed

---

## Support

For issues or questions:
- Check logs: `docker logs lmw_instructor`
- Verify services: `docker ps`
- Test health: `curl http://localhost:8003/health`
