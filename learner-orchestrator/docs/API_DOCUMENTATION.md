# 📖 Complete API Documentation

## Table of Contents
- [Learner Service API](#learner-service-api) (Port 8000)
- [Orchestrator Service API](#orchestrator-service-api) (Port 8001)
- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Request/Response Examples](#request-response-examples)

---

# Learner Service API

**Base URL**: `http://localhost:8000/api/v1/auth`

The Learner Service handles authentication, enrollment, and progress tracking.

---

## Authentication Endpoints

### 1. Sign Up

Create a new learner account.

**Endpoint**: `POST /signup`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "Education": [
    {
      "degree": "Bachelor",
      "field": "Computer Science"
    }
  ],
  "Interests": ["Machine Learning", "Web Development"]
}
```

**Response** (201 Created):
```json
{
  "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "email": "john@example.com",
  "first_name": null,
  "last_name": null,
  "created_at": "2025-10-09T10:30:00.123456",
  "updated_at": "2025-10-09T10:30:00.123456"
}
```

---

### 2. Login (Form Data)

Login with username/password form data (OAuth2 compatible).

**Endpoint**: `POST /login`

**Request** (Form Data):
```
username=john@example.com
password=securepassword123
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 3. Login (JSON)

Login with JSON payload.

**Endpoint**: `POST /login-json`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 4. Get Current Learner

Get authenticated learner's information.

**Endpoint**: `GET /me`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2025-10-09T10:30:00.123456",
  "updated_at": "2025-10-09T10:30:00.123456"
}
```

---

## Course Browsing Endpoints

### 5. Get All Courses

Retrieve all available courses with their modules.

**Endpoint**: `GET /courses`

**Response** (200 OK):
```json
[
  {
    "courseid": "CSE101",
    "course_name": "Introduction to Computer Science",
    "coursedescription": "Basic concepts of programming",
    "targetaudience": "Beginners",
    "prereqs": "None",
    "instructorid": "inst_001",
    "created_at": "2025-10-09T10:00:00",
    "updated_at": "2025-10-09T10:00:00",
    "modules": [
      {
        "moduleid": "CSE101_M1",
        "title": "Introduction to Programming",
        "description": "Basic programming concepts",
        "order_index": 1,
        "courseid": "CSE101",
        "content_path": null,
        "created_at": "2025-10-09T10:00:00Z",
        "updated_at": "2025-10-09T10:00:00Z"
      }
    ]
  }
]
```

---

### 6. Get Course by ID

Retrieve a specific course with its modules.

**Endpoint**: `GET /courses/{course_id}`

**Path Parameters**:
- `course_id` (string): Course identifier (e.g., "CSE101")

**Response** (200 OK):
```json
{
  "courseid": "CSE101",
  "course_name": "Introduction to Computer Science",
  "coursedescription": "Basic concepts of programming",
  "targetaudience": "Beginners",
  "prereqs": "None",
  "instructorid": "inst_001",
  "created_at": "2025-10-09T10:00:00",
  "updated_at": "2025-10-09T10:00:00",
  "modules": [...]
}
```

**Error Responses**:
- `404 Not Found`: Course not found

---

## Enrollment Endpoints

### 7. Enroll in Course

Enroll the authenticated learner in a course.

**Endpoint**: `POST /enroll`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "courseid": "CSE101"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "courseid": "CSE101",
  "enrollment_date": "2025-10-09T10:30:00",
  "status": "active",
  "course": {
    "courseid": "CSE101",
    "course_name": "Introduction to Computer Science",
    "modules": [...]
  }
}
```

**Notes**:
- Creates `EnrolledCourse` record
- Creates `CourseContent` record (MongoDB)
- Initializes `LearnerModuleProgress` for all modules

---

### 8. Get My Enrolled Courses

Get all courses the authenticated learner is enrolled in.

**Endpoint**: `GET /my-courses`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
    "courseid": "CSE101",
    "enrollment_date": "2025-10-09T10:30:00",
    "status": "active",
    "course": {
      "courseid": "CSE101",
      "course_name": "Introduction to Computer Science",
      "modules": [...]
    }
  }
]
```

---

### 9. Unenroll from Course

Unenroll from a course.

**Endpoint**: `DELETE /unenroll/{course_id}`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "message": "Successfully unenrolled from course CSE101"
}
```

**Error Responses**:
- `404 Not Found`: Not enrolled in this course

---

## Progress Tracking Endpoints

### 10. Get Course Progress

Get detailed progress for a specific course.

**Endpoint**: `GET /progress/{course_id}`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "courseid": "CSE101",
  "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "currentmodule": "CSE101_M2",
  "status": "ongoing",
  "course": {
    "courseid": "CSE101",
    "course_name": "Introduction to Computer Science",
    "modules": [...]
  },
  "modules_progress": [
    {
      "id": 1,
      "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
      "moduleid": "CSE101_M1",
      "status": "completed",
      "progress_percentage": 100,
      "started_at": "2025-10-09T10:30:00Z",
      "completed_at": "2025-10-09T11:00:00Z",
      "created_at": "2025-10-09T10:30:00Z",
      "updated_at": "2025-10-09T11:00:00Z"
    },
    {
      "id": 2,
      "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
      "moduleid": "CSE101_M2",
      "status": "in_progress",
      "progress_percentage": 50,
      "started_at": "2025-10-09T11:05:00Z",
      "completed_at": null,
      "created_at": "2025-10-09T10:30:00Z",
      "updated_at": "2025-10-09T11:05:00Z"
    }
  ]
}
```

---

### 11. Update Module Progress

Update progress for a specific module.

**Endpoint**: `PUT /progress/module/{module_id}`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `module_id` (string): Module identifier

**Request Body**:
```json
{
  "status": "in_progress",
  "progress_percentage": 75
}
```

**Response** (200 OK):
```json
{
  "id": 2,
  "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "moduleid": "CSE101_M2",
  "status": "in_progress",
  "progress_percentage": 75,
  "started_at": "2025-10-09T11:05:00Z",
  "completed_at": null,
  "created_at": "2025-10-09T10:30:00Z",
  "updated_at": "2025-10-09T11:30:00Z"
}
```

**Status Values**:
- `not_started`: Module not started
- `in_progress`: Currently working on module
- `completed`: Module finished

---

### 12. Get Learner Dashboard

Get comprehensive dashboard with all learner data.

**Endpoint**: `GET /dashboard`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "learner": {
    "learnerid": "8e661b56-e937-4c31-bbe8-7bd80e678605",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "enrolled_courses": [
    {
      "id": 1,
      "courseid": "CSE101",
      "course": {...}
    }
  ],
  "course_progress": [
    {
      "courseid": "CSE101",
      "status": "ongoing",
      "modules_progress": [...]
    }
  ]
}
```

---

## Admin Endpoints

### 13. Initialize Sample Data

Initialize sample courses and modules (admin only).

**Endpoint**: `POST /admin/init-sample-data`

**Response** (200 OK):
```json
{
  "message": "Sample data initialized successfully!"
}
```

**Creates**:
- 3 courses: CSE101, CSE102, WEB101
- Multiple modules per course
- 1 instructor

---

## Health Check

### 14. Health Check

Check if the service is running.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "healthy"
}
```

---

# Orchestrator Service API

**Base URL**: `http://localhost:8001/api/orchestrator`

The Orchestrator Service manages the learning flow: diagnostics, modules, quizzes, feedback, and analytics.

---

## Diagnostic Endpoints

### 1. Submit Course Diagnostic

Submit initial diagnostic form when enrolling in a course.

**Endpoint**: `POST /diagnostic`

**Request Body**:
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferred_generation_style": "example-heavy",
  "current_mastery_level": "beginner",
  "learning_pace": "moderate",
  "prior_knowledge": "Basic programming in Python",
  "learning_goals": "Master data structures and algorithms"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferred_generation_style": "example-heavy",
  "current_mastery_level": "beginner",
  "learning_pace": "moderate",
  "prior_knowledge": "Basic programming in Python",
  "learning_goals": "Master data structures and algorithms",
  "created_at": "2025-10-09T10:30:00",
  "updated_at": "2025-10-09T10:30:00"
}
```

**Field Options**:
- `preferred_generation_style`: `"example-heavy"`, `"brief"`, `"detailed"`, `"more-analogies"`
- `current_mastery_level`: `"beginner"`, `"intermediate"`, `"advanced"`
- `learning_pace`: `"slow"`, `"moderate"`, `"fast"`

**Notes**:
- Fill this BEFORE starting the first module
- SME service uses this to generate personalized content

---

### 2. Get Course Diagnostic

Retrieve the diagnostic form for a learner and course.

**Endpoint**: `GET /diagnostic/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "id": 1,
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferred_generation_style": "example-heavy",
  "current_mastery_level": "beginner",
  "learning_pace": "moderate",
  "prior_knowledge": "Basic programming in Python",
  "learning_goals": "Master data structures and algorithms",
  "created_at": "2025-10-09T10:30:00",
  "updated_at": "2025-10-09T10:30:00"
}
```

**Error Responses**:
- `404 Not Found`: Diagnostic not found

---

### 3. Update Course Diagnostic

Update diagnostic preferences mid-course.

**Endpoint**: `PUT /diagnostic/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Request Body**:
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferred_generation_style": "detailed",
  "current_mastery_level": "intermediate",
  "learning_pace": "fast",
  "prior_knowledge": "Updated knowledge",
  "learning_goals": "Updated goals"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferred_generation_style": "detailed",
  "current_mastery_level": "intermediate",
  "learning_pace": "fast",
  "prior_knowledge": "Updated knowledge",
  "learning_goals": "Updated goals",
  "created_at": "2025-10-09T10:30:00",
  "updated_at": "2025-10-09T12:00:00"
}
```

---

## Learning Flow Endpoints

### 4. Get Current Module

Get the current module content for a learner.

**Endpoint**: `GET /module/current/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "module_id": "CSE101_M1",
  "course_id": "CSE101",
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "title": "Introduction to Programming",
  "content": "Module content generated by SME...",
  "status": "in_progress",
  "progress_percentage": 50,
  "quiz_available": true
}
```

**Notes**:
- Returns content from MongoDB `coursecontent` collection
- Content is generated by SME service based on diagnostic

---

### 5. Submit Quiz

Submit quiz answers and get scored result.

**Endpoint**: `POST /quiz/submit`

**Request Body**:
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "module_id": "CSE101_M1",
  "quiz_id": "quiz_123",
  "answers": [
    {
      "question_id": "q1",
      "selected_answer": "A"
    },
    {
      "question_id": "q2",
      "selected_answer": "C"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "quiz_id": "quiz_123",
  "module_id": "CSE101_M1",
  "score": 85.5,
  "total_questions": 10,
  "correct_answers": 9,
  "passed": true,
  "feedback": "Great job! You passed the quiz.",
  "details": [
    {
      "question_id": "q1",
      "correct": true,
      "explanation": "Correct! Arrays are indexed from 0."
    }
  ]
}
```

**Notes**:
- Updates `Quiz` table with score
- Stores responses in MongoDB `learnerresponse` collection

---

### 6. Complete Module

Mark module as complete and get next module info.

**Endpoint**: `POST /module/complete`

**Query Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier
- `module_id` (string): Module identifier

**Response** (200 OK):
```json
{
  "current_module_id": "CSE101_M1",
  "completed": true,
  "next_module_id": "CSE101_M2",
  "next_module_title": "Variables and Data Types",
  "course_complete": false,
  "message": "Module completed! Moving to next module."
}
```

**If Course Complete**:
```json
{
  "current_module_id": "CSE101_M3",
  "completed": true,
  "next_module_id": null,
  "next_module_title": null,
  "course_complete": true,
  "message": "Congratulations! Course completed."
}
```

**Notes**:
- Updates `CourseContent` table
- Advances learner to next module

---

### 7. Get Course Progress

Get overall progress for a learner in a course.

**Endpoint**: `GET /progress/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "course_id": "CSE101",
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "total_modules": 3,
  "completed_modules": 1,
  "current_module": "CSE101_M2",
  "overall_progress": 33.33,
  "modules": [
    {
      "module_id": "CSE101_M1",
      "status": "completed",
      "progress": 100
    },
    {
      "module_id": "CSE101_M2",
      "status": "in_progress",
      "progress": 50
    }
  ]
}
```

---

## Feedback Endpoints

### 8. Submit Module Feedback

Submit feedback after completing a module.

**Endpoint**: `POST /feedback`

**Request Body**:
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "module_id": "CSE101_M1",
  "response_preference": "brief",
  "confidence_level": 4,
  "difficulty_rating": 2,
  "additional_notes": "Great module! Would like more examples."
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "module_id": "CSE101_M1",
  "response_preference": "brief",
  "confidence_level": 4,
  "difficulty_rating": 2,
  "additional_notes": "Great module! Would like more examples.",
  "created_at": "2025-10-09T11:00:00"
}
```

**Field Descriptions**:
- `response_preference`: `"example-heavy"`, `"brief"`, `"more-analogies"`, `"detailed"`
- `confidence_level`: 1-5 (1=not confident, 5=very confident)
- `difficulty_rating`: 1-5 (1=too easy, 3=just right, 5=too hard)

**Notes**:
- SME service uses this to generate the next module
- Helps personalize content difficulty and style

---

### 9. Get Learner Feedback History

Get all feedback submissions for a learner in a course.

**Endpoint**: `GET /feedback/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
    "course_id": "CSE101",
    "module_id": "CSE101_M1",
    "response_preference": "brief",
    "confidence_level": 4,
    "difficulty_rating": 2,
    "additional_notes": "Great module!",
    "created_at": "2025-10-09T11:00:00"
  },
  {
    "id": 2,
    "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
    "course_id": "CSE101",
    "module_id": "CSE101_M2",
    "response_preference": "example-heavy",
    "confidence_level": 3,
    "difficulty_rating": 3,
    "additional_notes": "More examples would help.",
    "created_at": "2025-10-09T12:00:00"
  }
]
```

---

### 10. Get Module Feedback (SME View)

Get all feedback for a specific module from all learners.

**Endpoint**: `GET /feedback/module/{module_id}`

**Path Parameters**:
- `module_id` (string): Module identifier

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "learner_id": "learner-1",
    "module_id": "CSE101_M1",
    "response_preference": "brief",
    "confidence_level": 4,
    "difficulty_rating": 2,
    "additional_notes": "Great!"
  },
  {
    "id": 5,
    "learner_id": "learner-2",
    "module_id": "CSE101_M1",
    "response_preference": "example-heavy",
    "confidence_level": 3,
    "difficulty_rating": 4,
    "additional_notes": "Too difficult"
  }
]
```

**Use Case**:
- SME/Instructor reviews feedback
- Identifies common issues
- Improves module content

---

## Preferences Endpoints

### 11. Update Content Preferences

Update learner's content preferences for a course.

**Endpoint**: `PUT /preferences`

**Request Body**:
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "course_id": "CSE101",
  "preferences": {
    "detail_level": "moderate",
    "explanation_style": "example-heavy",
    "language": "simple"
  }
}
```

**Response** (200 OK):
```json
{
  "message": "Preferences updated successfully",
  "success": true,
  "data": {
    "matched": 1,
    "modified": 1
  }
}
```

**Preference Options**:
- `detail_level`: `"detailed"`, `"moderate"`, `"brief"`
- `explanation_style`: `"example-heavy"`, `"conceptual"`, `"practical"`
- `language`: `"simple"`, `"technical"`, `"balanced"`

**Notes**:
- Stored in MongoDB `coursecontent_pref` collection
- Used by SME to customize content generation

---

### 12. Get Content Preferences

Get learner's content preferences for a course.

**Endpoint**: `GET /preferences/{learner_id}/{course_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID
- `course_id` (string): Course identifier

**Response** (200 OK):
```json
{
  "_id": {
    "CourseID": "CSE101",
    "LearnerID": "8e661b56-e937-4c31-bbe8-7bd80e678605"
  },
  "preferences": {
    "detail_level": "moderate",
    "explanation_style": "example-heavy",
    "language": "simple"
  },
  "lastUpdated": "2025-10-09T10:30:00"
}
```

**If No Preferences Set**:
```json
{
  "preferences": {
    "detail_level": "moderate",
    "explanation_style": "balanced",
    "language": "simple"
  },
  "message": "Using default preferences"
}
```

---

## Analytics Endpoints

### 13. Get Module Analytics

Get analytics for a specific module across all learners.

**Endpoint**: `GET /analytics/module/{module_id}`

**Path Parameters**:
- `module_id` (string): Module identifier

**Response** (200 OK):
```json
{
  "module_id": "CSE101_M1",
  "completions": 45,
  "average_score": 82.3,
  "average_confidence": 3.8,
  "average_difficulty": 2.5,
  "common_preferences": {
    "brief": 20,
    "example-heavy": 15,
    "detailed": 10
  }
}
```

**Metrics**:
- `completions`: Number of learners who completed
- `average_score`: Average quiz score (0-100)
- `average_confidence`: Average confidence level (1-5)
- `average_difficulty`: Average difficulty rating (1-5)
- `common_preferences`: Most requested content styles

**Use Case**:
- SME evaluates module effectiveness
- Identifies if content needs adjustment

---

### 14. Get Learner Analytics

Get analytics for a specific learner across all courses.

**Endpoint**: `GET /analytics/learner/{learner_id}`

**Path Parameters**:
- `learner_id` (string): Learner UUID

**Response** (200 OK):
```json
{
  "learner_id": "8e661b56-e937-4c31-bbe8-7bd80e678605",
  "courses_enrolled": 3,
  "modules_completed": 8,
  "quizzes_completed": 7,
  "average_quiz_score": 85.2,
  "preferred_response_style": "example-heavy",
  "average_confidence": 4.1
}
```

**Metrics**:
- `courses_enrolled`: Total courses enrolled
- `modules_completed`: Total modules finished
- `quizzes_completed`: Total quizzes taken
- `average_quiz_score`: Overall quiz performance
- `preferred_response_style`: Most used content style
- `average_confidence`: Average self-reported confidence

**Use Case**:
- Track learner progress
- Identify learning patterns

---

## Health Check

### 15. Health Check

Check if the orchestrator service is running.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "learner-orchestrator"
}
```

---

# Authentication

## JWT Token Authentication

Most endpoints require JWT authentication.

### Obtaining a Token

1. **Sign up**: `POST /api/v1/auth/signup`
2. **Login**: `POST /api/v1/auth/login` or `POST /api/v1/auth/login-json`
3. **Receive token**: Get `access_token` from response

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example with curl

```bash
# Get token
TOKEN=$(curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Use token
curl "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

---

# Error Responses

## Standard Error Format

All errors return:

```json
{
  "detail": "Error message description"
}
```

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

## Common Errors

### 401 Unauthorized

```json
{
  "detail": "Not authenticated"
}
```

**Solution**: Include valid JWT token in Authorization header

### 404 Not Found

```json
{
  "detail": "Course not found"
}
```

**Solution**: Verify resource ID is correct

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Solution**: Check request body matches schema

---

# Request/Response Examples

## Complete Learning Flow Example

### 1. Sign Up and Login

```bash
# Sign up
curl -X POST "http://localhost:8000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "secure123",
    "Education": [{"degree": "BS", "field": "CS"}],
    "Interests": ["AI"]
  }'

# Login
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secure123"}'
```

### 2. Browse and Enroll

```bash
# Get all courses
curl "http://localhost:8000/api/v1/auth/courses"

# Enroll in course
curl -X POST "http://localhost:8000/api/v1/auth/enroll" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseid":"CSE101"}'
```

### 3. Submit Diagnostic

```bash
curl -X POST "http://localhost:8001/api/orchestrator/diagnostic" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_id": "uuid-here",
    "course_id": "CSE101",
    "preferred_generation_style": "example-heavy",
    "current_mastery_level": "beginner",
    "learning_pace": "moderate",
    "prior_knowledge": "Basic Python",
    "learning_goals": "Master algorithms"
  }'
```

### 4. Start Learning

```bash
# Get current module
curl "http://localhost:8001/api/orchestrator/module/current/uuid-here/CSE101"

# Submit quiz
curl -X POST "http://localhost:8001/api/orchestrator/quiz/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_id": "uuid-here",
    "course_id": "CSE101",
    "module_id": "CSE101_M1",
    "quiz_id": "quiz_1",
    "answers": [{"question_id": "q1", "selected_answer": "A"}]
  }'
```

### 5. Submit Feedback

```bash
curl -X POST "http://localhost:8001/api/orchestrator/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_id": "uuid-here",
    "course_id": "CSE101",
    "module_id": "CSE101_M1",
    "response_preference": "brief",
    "confidence_level": 4,
    "difficulty_rating": 2,
    "additional_notes": "Great!"
  }'
```

### 6. Complete Module

```bash
curl -X POST "http://localhost:8001/api/orchestrator/module/complete?learner_id=uuid-here&course_id=CSE101&module_id=CSE101_M1"
```

---

## API Testing

Use the provided test script:

```bash
cd Learning-Middleware-iREL
./test_all_services.sh
```

Expected: **21/21 tests passing** ✅

---

## API Clients

### Python Example

```python
import requests

BASE_URL = "http://localhost:8000/api/v1/auth"

# Login
response = requests.post(f"{BASE_URL}/login-json", json={
    "email": "alice@example.com",
    "password": "secure123"
})
token = response.json()["access_token"]

# Get courses
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/courses", headers=headers)
courses = response.json()
print(courses)
```

### JavaScript Example

```javascript
const BASE_URL = 'http://localhost:8000/api/v1/auth';

// Login
const loginResponse = await fetch(`${BASE_URL}/login-json`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'alice@example.com',
    password: 'secure123'
  })
});
const {access_token} = await loginResponse.json();

// Get courses
const coursesResponse = await fetch(`${BASE_URL}/courses`, {
  headers: {'Authorization': `Bearer ${access_token}`}
});
const courses = await coursesResponse.json();
console.log(courses);
```

---

## Interactive API Documentation

Visit these URLs for interactive Swagger docs:

- **Learner Service**: http://localhost:8000/docs
- **Orchestrator Service**: http://localhost:8001/docs

Features:
- Try API calls directly in browser
- See request/response schemas
- Download OpenAPI specification

---

**Last Updated**: October 9, 2025  
**Version**: 2.0.0  
**Total Endpoints**: 29 (14 Learner + 15 Orchestrator)
