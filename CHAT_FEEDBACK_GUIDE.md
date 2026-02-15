# Chat Feedback Feature

This document describes the chat feedback feature that allows learners to rate AI responses with thumbs up/down.

## 🎯 Overview

Learners can now provide feedback on every AI response in the chat by clicking thumbs up (👍) or thumbs down (👎) icons. This feedback is stored in the database for analytics and improvement of the AI system.

## 📊 Database Schema

The `ChatLog` table now includes a `feedback` column:

```sql
CREATE TABLE ChatLog (
    id SERIAL PRIMARY KEY,
    learnerid VARCHAR(50) NOT NULL,
    courseid VARCHAR(50) NOT NULL,
    moduleid VARCHAR(50),
    user_question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    sources_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    feedback VARCHAR(10) CHECK (feedback IN ('like', 'dislike')), -- NEW COLUMN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100),
    ...
);
```

**Feedback values:**
- `'like'` - User found the response helpful (👍)
- `'dislike'` - User found the response not helpful (👎)
- `NULL` - No feedback provided yet

## 🔧 Migration Instructions

If you already have a ChatLog table without the feedback column, run the migration:

```bash
# Connect to the database
docker exec -i lmw_postgres psql -U lmw_user -d lmw_database < database/migrations/add_feedback_to_chatlog.sql

# Or run it directly
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -f /path/to/database/migrations/add_feedback_to_chatlog.sql
```

## 💡 User Interface

### Where to Find Feedback Icons

**1. Module Chat (Floating Chat):**
- Located in: Any module page
- Icon location: Bottom-right corner chat bubble → Each AI response
- Icon size: Small (3x3, subtle)

**2. Course Chat Page:**
- Located in: `/learner/chat` page
- Icon location: Each AI response message
- Icon size: Small (3x3, subtle)

### How It Works

1. **Initial State:** Icons are gray/muted
2. **After Clicking Like:** Thumbs up turns green, thumbs down stays muted
3. **After Clicking Dislike:** Thumbs down turns red, thumbs up stays muted
4. **Toggle Off:** Click the same icon again to remove feedback

## 📡 API Endpoints

### Update Feedback

**Endpoint:** `PATCH /chat-logs/{log_id}/feedback`

**Request:**
```json
{
  "feedback": "like"  // or "dislike"
}
```

**Response:**
```json
{
  "id": 123,
  "learnerid": "L123",
  "courseid": "C456",
  "user_question": "What is a function?",
  "ai_response": "A function is...",
  "feedback": "like",
  "created_at": "2026-02-15T10:30:00Z",
  ...
}
```

**Authentication:** Required (learner must own the chat log)

### Example Usage

```bash
# Get auth token first (from cookies or login)
TOKEN="your_jwt_token_here"

# Update feedback
curl -X PATCH "http://localhost:8002/chat-logs/123/feedback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "like"}'
```

## 📊 Querying Feedback Data

### View Recent Chats with Feedback

```sql
SELECT 
    cl.id,
    l.email as learner,
    c.course_name,
    cl.user_question,
    LEFT(cl.ai_response, 100) as answer_preview,
    CASE 
        WHEN cl.feedback = 'like' THEN '👍 Liked'
        WHEN cl.feedback = 'dislike' THEN '👎 Disliked'
        ELSE '- No feedback'
    END as feedback_status,
    cl.created_at
FROM ChatLog cl
JOIN Learner l ON cl.learnerid = l.learnerid
JOIN Course c ON cl.courseid = c.courseid
ORDER BY cl.created_at DESC
LIMIT 20;
```

### Feedback Statistics

```sql
-- Overall feedback stats
SELECT 
    COUNT(*) as total_responses,
    COUNT(feedback) as responses_with_feedback,
    SUM(CASE WHEN feedback = 'like' THEN 1 ELSE 0 END) as likes,
    SUM(CASE WHEN feedback = 'dislike' THEN 1 ELSE 0 END) as dislikes,
    ROUND(100.0 * COUNT(feedback) / COUNT(*), 2) as feedback_rate_percent,
    ROUND(100.0 * SUM(CASE WHEN feedback = 'like' THEN 1 ELSE 0 END) / COUNT(feedback), 2) as like_percent
FROM ChatLog;
```

### Feedback by Course

```sql
SELECT 
    c.course_name,
    COUNT(*) as total_interactions,
    SUM(CASE WHEN cl.feedback = 'like' THEN 1 ELSE 0 END) as likes,
    SUM(CASE WHEN cl.feedback = 'dislike' THEN 1 ELSE 0 END) as dislikes,
    ROUND(100.0 * SUM(CASE WHEN cl.feedback = 'like' THEN 1 ELSE 0 END) / 
          NULLIF(COUNT(cl.feedback), 0), 2) as satisfaction_rate
FROM ChatLog cl
JOIN Course c ON cl.courseid = c.courseid
GROUP BY c.course_name
ORDER BY total_interactions DESC;
```

### Find Poorly Rated Responses

```sql
-- Get responses that received dislikes
SELECT 
    cl.id,
    c.course_name,
    cl.user_question,
    cl.ai_response,
    cl.sources_count,
    cl.response_time_ms,
    cl.created_at
FROM ChatLog cl
JOIN Course c ON cl.courseid = c.courseid
WHERE cl.feedback = 'dislike'
ORDER BY cl.created_at DESC;
```

### Learners Who Provide Most Feedback

```sql
SELECT 
    l.email,
    l.first_name,
    l.last_name,
    COUNT(*) as total_chats,
    COUNT(cl.feedback) as feedback_given,
    ROUND(100.0 * COUNT(cl.feedback) / COUNT(*), 2) as feedback_rate
FROM Learner l
JOIN ChatLog cl ON l.learnerid = cl.learnerid
GROUP BY l.learnerid, l.email, l.first_name, l.last_name
HAVING COUNT(*) > 5
ORDER BY feedback_rate DESC;
```

## 📈 Analytics Use Cases

### 1. **Content Quality Assessment**
Use dislike feedback to identify topics/modules where AI responses need improvement.

### 2. **Course Improvement**
Analyze courses with low satisfaction rates to enhance course materials.

### 3. **Response Time vs Satisfaction**
Correlate response time with feedback to optimize generation speed vs quality.

```sql
SELECT 
    CASE 
        WHEN response_time_ms < 1000 THEN '< 1s'
        WHEN response_time_ms < 3000 THEN '1-3s'
        WHEN response_time_ms < 5000 THEN '3-5s'
        ELSE '> 5s'
    END as response_time_bucket,
    COUNT(*) as total,
    SUM(CASE WHEN feedback = 'like' THEN 1 ELSE 0 END) as likes,
    SUM(CASE WHEN feedback = 'dislike' THEN 1 ELSE 0 END) as dislikes
FROM ChatLog
WHERE feedback IS NOT NULL
GROUP BY response_time_bucket
ORDER BY response_time_ms;
```

### 4. **Source Count vs Satisfaction**
Check if more sources lead to better responses.

```sql
SELECT 
    sources_count,
    COUNT(*) as total,
    SUM(CASE WHEN feedback = 'like' THEN 1 ELSE 0 END) as likes,
    ROUND(100.0 * SUM(CASE WHEN feedback = 'like' THEN 1 ELSE 0 END) / 
          NULLIF(COUNT(feedback), 0), 2) as satisfaction_rate
FROM ChatLog
WHERE feedback IS NOT NULL
GROUP BY sources_count
ORDER BY sources_count;
```

## 🔐 Security & Privacy

- **Authentication Required:** Only the learner who created the chat log can update its feedback
- **Validation:** Backend validates feedback is either 'like' or 'dislike'
- **Non-Blocking:** Feedback failures don't interrupt chat experience
- **Idempotent:** Clicking the same feedback twice removes it (toggles off)

## 🚀 Testing the Feature

### 1. Start the Services

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Navigate to Chat

- **Course Chat:** http://localhost:3000/learner/chat
- **Module Chat:** Navigate to any module page, click chat icon

### 3. Test Workflow

1. Ask a question in chat
2. Wait for AI response
3. Look for small thumbs up/down icons at the bottom of the response
4. Click thumbs up → icon turns green
5. Click thumbs down → icon turns red
6. Click the same icon again → feedback removed

### 4. Verify in Database

```bash
# Connect to database
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database

# Check recent feedback
SELECT id, user_question, feedback, created_at 
FROM ChatLog 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### Icons Not Showing

**Check 1:** Ensure the message has a `logId` (database ID)
- Open browser console
- Check message object in React DevTools

**Check 2:** Icons only appear for assistant messages, not user messages

**Check 3:** Icons only appear after the message finishes streaming

### Feedback Not Saving

**Check 1:** Check browser console for errors

**Check 2:** Verify learner is authenticated

**Check 3:** Check backend logs:
```bash
docker compose -f docker-compose.dev.yml logs -f learner
```

### Database Column Missing

**Error:** `column "feedback" does not exist`

**Solution:** Run the migration:
```bash
docker exec -i lmw_postgres psql -U lmw_user -d lmw_database \
  < database/migrations/add_feedback_to_chatlog.sql
```

## 📝 Technical Implementation Details

### Frontend (React/Next.js)

**Files Modified:**
- `ui/components/course-chat.tsx` - Floating chat component
- `ui/app/learner/chat/page.tsx` - Main chat page
- `ui/lib/learner-api.ts` - API client

**Key Features:**
- Optimistic UI updates (immediate visual feedback)
- Error handling with rollback
- Toggle functionality (click again to remove)
- Non-blocking API calls

### Backend (FastAPI/Python)

**Files Modified:**
- `database/init.sql` - Schema with feedback column
- `learner/models.py` - ChatLog model
- `learner/schemas.py` - ChatLogResponse + ChatLogFeedbackUpdate
- `learner/crud.py` - update_feedback() method
- `learner/routes.py` - PATCH /chat-logs/{log_id}/feedback endpoint

**Key Features:**
- Input validation (only 'like' or 'dislike')
- Authorization (only log owner can update)
- Database constraint check

## 🎨 UI Design

**Color Scheme:**
- Thumbs up (liked): Green (`text-green-600`)
- Thumbs down (disliked): Red (`text-red-600`)
- No feedback: Muted (`text-[#7a6358]/60`)
- Hover: Light background (`hover:bg-[#ffc09f]/20`)

**Icon Size:** `h-3 w-3` (12px × 12px) - Font size or smaller as requested

**Placement:** Right side of timestamp in message footer

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Check backend logs: `docker compose -f docker-compose.dev.yml logs -f learner`
3. Check frontend console for errors
4. Verify database migration ran successfully
