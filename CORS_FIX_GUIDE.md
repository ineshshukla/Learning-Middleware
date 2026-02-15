# CORS and 500 Error - Troubleshooting Guide

## Problem

You're seeing these errors in the browser console:
```
POST http://localhost:8002/api/v1/learner/chat-logs
CORS Missing Allow Origin
Status code: 500
Failed to log chat interaction: TypeError: NetworkError when attempting to fetch resource.
```

This prevents chat logs from being saved, which means no `logId` is assigned, so thumbs icons don't appear.

---

## Root Cause

The issue has two parts:
1. **500 Error**: The backend is returning a server error when trying to create chat logs
2. **CORS Error**: This is a side effect - when a 500 error occurs, CORS headers are not sent

---

## ✅ Fix Applied

I've updated the `learner/config.py` file to ensure it properly reads the `API_V1_STR` environment variable from docker-compose:

```python
class Config:
    env_file = ".env"
    case_sensitive = False  # <-- Added this line
```

---

## 🔧 Apply the Fix

### Step 1: Restart the Learner Service

```bash
cd Learning-Middleware-iREL
chmod +x fix_cors.sh
./fix_cors.sh
```

**Or manually:**
```bash
docker compose -f docker-compose.dev.yml restart learner
```

### Step 2: Verify the Service Started

```bash
docker compose -f docker-compose.dev.yml ps learner
```

You should see:
```
NAME      COMMAND                  SERVICE   STATUS
learner   "uvicorn main:app ..."   learner   Up
```

### Step 3: Test the API

```bash
# Test root endpoint
curl http://localhost:8002/

# Test health endpoint  
curl http://localhost:8002/health

# Test OpenAPI docs
curl http://localhost:8002/api/v1/learner/openapi.json | head -20
```

---

## 🧪 Test Chat Logging

1. **Open the chat page:**
   ```
   http://localhost:3000/learner/chat
   ```

2. **Open DevTools (F12) → Console tab**

3. **Clear previous errors:**
   - Click the 🚫 icon in console to clear old errors

4. **Refresh the page:**
   - Press `Ctrl+Shift+R` (hard refresh)

5. **Ask a NEW question:**
   - Select a course
   - Type: "What is a function?"
   - Send the message

6. **Check the console:**
   - You should NOT see CORS errors
   - You should NOT see "Failed to log chat interaction"
   - You should see a successful POST to `/chat-logs`

7. **Look for thumbs icons:**
   - Next to the AI response timestamp
   - Small gray thumbs: 👍 👎

---

## 🔍 If Still Not Working

### Check Backend Logs

```bash
docker compose -f docker-compose.dev.yml logs learner --tail 100
```

Look for:
- **Import errors**: Missing modules or circular imports
- **Database errors**: Connection issues or missing tables
- **Pydantic errors**: Schema validation failures

### Check Database

```bash
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "\d chatlog"
```

Verify the `feedback` column exists.

### Check API Prefix

```bash
docker compose -f docker-compose.dev.yml exec learner python -c "from config import settings; print(f'API Prefix: {settings.api_v1_str}')"
```

Should output: `API Prefix: /api/v1/learner`

### Test Login (Verify API Works)

```bash
curl -X POST http://localhost:8002/api/v1/learner/login-json \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

If this returns a 404, the API prefix is wrong.  
If this returns 401/400, the API prefix is correct but credentials are invalid (expected).

---

## 🐛 Common Issues

### Issue 1: API Prefix Mismatch

**Symptoms:**
- 404 errors on all endpoints
- Swagger docs not loading

**Solution:**
```bash
# Check docker-compose env vars
grep API_V1_STR docker-compose.dev.yml

# Should show:
# API_V1_STR: /api/v1/learner

# Rebuild and restart
docker compose -f docker-compose.dev.yml up -d --build learner
```

### Issue 2: Database Connection Error

**Symptoms:**
- 500 error specifically on `/chat-logs POST`
- Logs show: "connection refused" or "could not translate host name"

**Solution:**
```bash
# Check postgres is running
docker compose -f docker-compose.dev.yml ps postgres

# Restart postgres and learner
docker compose -f docker-compose.dev.yml restart postgres
sleep 5
docker compose -f docker-compose.dev.yml restart learner
```

### Issue 3: Missing feedback Column

**Symptoms:**
- 500 error with message: `column "feedback" does not exist`

**Solution:**
```bash
# Run migration again
docker exec -i lmw_postgres psql -U lmw_user -d lmw_database \
  < database/migrations/add_feedback_to_chatlog.sql

# Restart learner
docker compose -f docker-compose.dev.yml restart learner
```

### Issue 4: Import Error in Backend

**Symptoms:**
- Service won't start
- Logs show Python import errors

**Solution:**
```bash
# Check logs for specific error
docker compose -f docker-compose.dev.yml logs learner --tail 50

# Common fix: restart
docker compose -f docker-compose.dev.yml restart learner
```

---

## ✅ Verification Checklist

Before asking a question in chat, verify:

- [ ] Learner service is "Up": `docker compose -f docker-compose.dev.yml ps learner`
- [ ] Database has feedback column: `docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "\d chatlog"`
- [ ] API prefix is correct: Should be `/api/v1/learner`
- [ ] No backend errors in logs: `docker compose -f docker-compose.dev.yml logs learner --tail 20`
- [ ] Browser console is clear (F12 → Console → Clear)
- [ ] Page is hard-refreshed: `Ctrl+Shift+R`

---

## 📊 Expected Behavior After Fix

### In Browser Console (F12):
```
POST http://localhost:8002/api/v1/learner/chat-logs   ✅ 201 Created
Response: {"id": 123, "learnerid": "...", "feedback": null, ...}
```

### In Chat UI:
```
┌─────────────────────────────────────┐
│ What is a function?                 │  ← Your question
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ A function is a reusable block...   │  ← AI response
│                                     │
│ 10:30 AM  👍  👎                    │  ← Thumbs icons appear!
│          ↑gray ↑gray                │
└─────────────────────────────────────┘
```

### In Database:
```bash
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "
SELECT id, LEFT(user_question, 40), feedback, created_at 
FROM ChatLog 
ORDER BY created_at DESC 
LIMIT 3;
"
```

Should show new entries with `feedback` column (NULL initially, or 'like'/'dislike' after clicking).

---

## 🆘 Still Having Issues?

Run diagnostics:

```bash
cd Learning-Middleware-iREL

echo "=== Service Status ==="
docker compose -f docker-compose.dev.yml ps

echo ""
echo "=== Recent Learner Logs ==="
docker compose -f docker-compose.dev.yml logs learner --tail 30

echo ""
echo "=== Database Connection ==="
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "SELECT version();"

echo ""
echo "=== ChatLog Table Structure ==="
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "\d chatlog"
```

Share the output for further debugging.

---

**Status:** 
- ✅ Config fix applied
- ⏳ Service restart required
- 🧪 Testing needed
