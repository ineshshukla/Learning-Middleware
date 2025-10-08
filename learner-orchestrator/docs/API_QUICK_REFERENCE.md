# 📋 API Quick Reference

## Learner Service (Port 8000)

**Base URL**: `http://localhost:8000/api/v1/auth`

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Create new account |
| POST | `/login` | ❌ | Login (form data) |
| POST | `/login-json` | ❌ | Login (JSON) |
| GET | `/me` | ✅ | Get current user |

### Courses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/courses` | ❌ | List all courses |
| GET | `/courses/{id}` | ❌ | Get course by ID |

### Enrollment
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/enroll` | ✅ | Enroll in course |
| GET | `/my-courses` | ✅ | My enrolled courses |
| DELETE | `/unenroll/{id}` | ✅ | Unenroll from course |

### Progress
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/progress/{course_id}` | ✅ | Course progress |
| PUT | `/progress/module/{module_id}` | ✅ | Update module progress |
| GET | `/dashboard` | ✅ | Full dashboard |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/init-sample-data` | ❌ | Initialize sample data |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Service health check |

---

## Orchestrator Service (Port 8001)

**Base URL**: `http://localhost:8001/api/orchestrator`

### Diagnostics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/diagnostic` | ❌ | Submit diagnostic |
| GET | `/diagnostic/{learner_id}/{course_id}` | ❌ | Get diagnostic |
| PUT | `/diagnostic/{learner_id}/{course_id}` | ❌ | Update diagnostic |

### Learning Flow
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/module/current/{learner_id}/{course_id}` | ❌ | Get current module |
| POST | `/quiz/submit` | ❌ | Submit quiz answers |
| POST | `/module/complete` | ❌ | Complete module |
| GET | `/progress/{learner_id}/{course_id}` | ❌ | Course progress |

### Feedback
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/feedback` | ❌ | Submit module feedback |
| GET | `/feedback/{learner_id}/{course_id}` | ❌ | Feedback history |
| GET | `/feedback/module/{module_id}` | ❌ | Module feedback (SME) |

### Preferences
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/preferences` | ❌ | Update preferences |
| GET | `/preferences/{learner_id}/{course_id}` | ❌ | Get preferences |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/module/{module_id}` | ❌ | Module analytics |
| GET | `/analytics/learner/{learner_id}` | ❌ | Learner analytics |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Service health check |

---

## Quick Examples

### Get Token
```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')
```

### Enroll in Course
```bash
curl -X POST "http://localhost:8000/api/v1/auth/enroll" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseid":"CSE101"}'
```

### Submit Diagnostic
```bash
curl -X POST "http://localhost:8001/api/orchestrator/diagnostic" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_id": "uuid-123",
    "course_id": "CSE101",
    "preferred_generation_style": "example-heavy",
    "current_mastery_level": "beginner",
    "learning_pace": "moderate",
    "prior_knowledge": "Basic programming",
    "learning_goals": "Master algorithms"
  }'
```

### Submit Feedback
```bash
curl -X POST "http://localhost:8001/api/orchestrator/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "learner_id": "uuid-123",
    "course_id": "CSE101",
    "module_id": "CSE101_M1",
    "response_preference": "brief",
    "confidence_level": 4,
    "difficulty_rating": 2,
    "additional_notes": "Great module!"
  }'
```

---

## Field Options

### Diagnostic Fields
- **preferred_generation_style**: `example-heavy`, `brief`, `detailed`, `more-analogies`
- **current_mastery_level**: `beginner`, `intermediate`, `advanced`
- **learning_pace**: `slow`, `moderate`, `fast`

### Feedback Fields
- **response_preference**: `example-heavy`, `brief`, `more-analogies`, `detailed`
- **confidence_level**: 1-5 (1=not confident, 5=very confident)
- **difficulty_rating**: 1-5 (1=too easy, 3=just right, 5=too hard)

### Preferences Fields
- **detail_level**: `detailed`, `moderate`, `brief`
- **explanation_style**: `example-heavy`, `conceptual`, `practical`
- **language**: `simple`, `technical`, `balanced`

### Module Status
- **not_started**: Not begun
- **in_progress**: Currently working
- **completed**: Finished

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET/PUT) |
| 201 | Created (POST) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## Interactive Docs

- **Learner Service**: http://localhost:8000/docs
- **Orchestrator Service**: http://localhost:8001/docs

---

## Testing

```bash
cd Learning-Middleware-iREL
./test_all_services.sh
```

Expected: **21/21 tests passing** ✅

---

**For detailed documentation, see**: `API_DOCUMENTATION.md`
