# Operations Guide - Learning Middleware

Quick reference for running, monitoring, and troubleshooting the Learning Middleware platform.

## 🚀 Starting the Platform

### Complete Stack
```bash
# Start all services
cd Learning-Middleware-iREL
docker compose up -d

# Check status
docker compose ps

# All services should show "Up" status:
# - postgres (healthy)
# - mongodb (healthy)
# - learner (Up)
# - instructor (Up)
# - learner-orchestrator (Up)
# - sme (Up)
# - ui (Up)
```

### Individual Services
```bash
# Start specific service
docker compose up <service-name> -d

# Service names:
# postgres, mongodb, learner, instructor, learner-orchestrator, sme, ui
```

### Development Mode (UI)
```bash
# UI with hot-reload
cd ui
pnpm install
pnpm run dev
# Access at http://localhost:3000
```

## 🔍 Monitoring

### View Logs

**All services:**
```bash
docker compose logs -f
```

**Specific service:**
```bash
# Real-time logs
docker compose logs -f <service-name>

# Last 100 lines
docker compose logs --tail 100 <service-name>

# Last 10 minutes
docker compose logs --since 10m <service-name>
```

**Examples:**
```bash
# Watch SME generation
docker compose logs -f sme

# Check learner API errors
docker compose logs --tail 50 learner

# Monitor orchestrator
docker compose logs -f learner-orchestrator
```

### Check Service Health

```bash
# Check if containers are running
docker compose ps

# Check specific service
docker compose ps learner

# View resource usage
docker stats
```

### API Health Checks

```bash
# Learner service
curl http://localhost:5001/docs

# Instructor service
curl http://localhost:5002/docs

# Orchestrator
curl http://localhost:8001/docs

# SME service
curl http://localhost:8000/

# UI
curl http://localhost:3000
```

## 🗄️ Database Access

### PostgreSQL

```bash
# Connect to database
docker exec -it lmw_postgres psql -U postgres -d learning_middleware

# Common commands:
\dt                              # List tables
\d learner                       # Describe table
SELECT * FROM learner LIMIT 5;   # Query data
\q                               # Quit
```

**Useful queries:**
```sql
-- Check learners
SELECT learnerid, email, first_name, last_name FROM learner;

-- Check courses
SELECT courseid, course_name, is_published FROM course;

-- Check enrollments
SELECT e.learnerid, e.courseid, c.course_name 
FROM enrolledcourses e 
JOIN course c ON e.courseid = c.courseid;

-- Check cached content
SELECT moduleid, learnerid, 
       LENGTH(content) as content_length,
       generated_at 
FROM generatedmodulecontent;

-- Check cached quizzes
SELECT moduleid, learnerid, 
       jsonb_array_length(quiz_data->'questions') as num_questions,
       generated_at 
FROM generatedquiz;
```

### MongoDB

```bash
# Connect to MongoDB
docker exec -it lmw_mongodb mongosh

# Switch to database
use learning_middleware

# View collections
show collections

# Query preferences
db.CourseContent_Pref.find().pretty()

# Find specific learner's preferences
db.CourseContent_Pref.find({
  "_id.LearnerID": "learner-uuid"
}).pretty()

# Count preferences
db.CourseContent_Pref.countDocuments()

# Exit
exit
```

## 🔧 Common Tasks

### Restart Service

```bash
# Restart specific service
docker compose restart <service-name>

# Rebuild and restart (after code changes)
docker compose up -d --build <service-name>

# Example: After updating learner service
docker compose up -d --build learner
```

### Clear Data

```bash
# Stop all services
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Remove specific volume
docker volume rm learning-middleware-irel_postgres_data

# Fresh start
docker compose up -d
```

### View Vector Stores

```bash
# List all course vector stores
docker compose exec sme ls -la /app/data/vector_store/

# Check specific course
docker compose exec sme ls -la /app/data/vector_store/COURSE_123/

# View uploaded PDFs
docker compose exec sme ls -la /app/data/docs/COURSE_123/
```

### Reset Cache

```bash
# Clear all generated content
docker exec -it lmw_postgres psql -U postgres -d learning_middleware -c \
  "DELETE FROM generatedmodulecontent;"

# Clear all generated quizzes
docker exec -it lmw_postgres psql -U postgres -d learning_middleware -c \
  "DELETE FROM generatedquiz;"

# Clear specific learner's content
docker exec -it lmw_postgres psql -U postgres -d learning_middleware -c \
  "DELETE FROM generatedmodulecontent WHERE learnerid='learner-uuid';"
```

## 🐛 Troubleshooting

### Service Won't Start

**Check logs:**
```bash
docker compose logs <service-name>
```

**Common issues:**

1. **Port already in use:**
```bash
# Find process using port
lsof -i :5001  # or whatever port

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

2. **Database not ready:**
```bash
# Wait for databases to be healthy
docker compose ps postgres mongodb

# Restart dependent service
docker compose restart learner
```

3. **Build failures:**
```bash
# Rebuild from scratch
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
```

### Content Not Generating

**Check SME service:**
```bash
# Is it running?
docker compose ps sme

# Any errors?
docker compose logs --tail 50 sme

# Test connectivity
curl http://localhost:8000/
```

**Check orchestrator:**
```bash
# Logs
docker compose logs --tail 50 learner-orchestrator

# Test SME connection from orchestrator
docker compose exec learner-orchestrator curl http://sme:8000/
```

**Check vLLM (if using external):**
```bash
# Test vLLM endpoint
curl $VLLM_70B_URL/health

# Check environment variables
docker compose exec sme env | grep VLLM
```

### Quiz Generation Timeout

**Frontend shows timeout error:**
```bash
# Check SME logs for generation progress
docker compose logs -f sme | grep quiz

# Verify timeout settings:
# - Frontend: 3000 seconds (50 min) in learner-api.ts
# - Orchestrator: 3000 seconds in sme_client.py
# - SME: Should complete within this time
```

**If consistently timing out:**
```bash
# Reduce batch size or enable parallel processing
# Edit request in UI or orchestrator
{
  "batch_size": 2,
  "questions_per_batch": 2,
  "parallel_processing": true
}
```

### Database Connection Errors

**PostgreSQL:**
```bash
# Check if running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
docker exec -it lmw_postgres psql -U postgres -c "SELECT 1;"

# Restart
docker compose restart postgres

# Wait for services to reconnect
docker compose restart learner instructor
```

**MongoDB:**
```bash
# Check if running
docker compose ps mongodb

# Check logs
docker compose logs mongodb

# Test connection
docker exec -it lmw_mongodb mongosh --eval "db.stats()"

# Restart
docker compose restart mongodb learner-orchestrator
```

### UI Not Loading

**Check frontend:**
```bash
# Logs
docker compose logs ui

# Or in dev mode
cd ui
pnpm run dev
# Check terminal for errors
```

**Check backend connectivity:**
```bash
# From browser console:
# Network tab → Look for failed requests
# Console → Look for CORS errors

# Verify environment variables
cat ui/.env.local

# Should have:
NEXT_PUBLIC_LEARNER_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_INSTRUCTOR_API_BASE_URL=http://localhost:5002
NEXT_PUBLIC_ORCHESTRATOR_API_BASE=http://localhost:8001
```

### Module Content Not Appearing

**Check browser console:**
```bash
# Look for [DEBUG], [GENERATE], [SAVE], [API] messages
# Note any errors
```

**Check database:**
```sql
-- Is content being saved?
SELECT * FROM generatedmodulecontent 
WHERE moduleid = 'MODULE_ID' AND learnerid = 'LEARNER_ID';

-- If empty, content didn't save
-- If has empty string, generation failed
-- If has content, UI display issue
```

**Check logs:**
```bash
# Learner service
docker compose logs learner | grep -i content

# Orchestrator
docker compose logs learner-orchestrator | grep -i generate

# SME
docker compose logs sme | grep -i module
```

## 📊 Performance Monitoring

### Check Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats lmw_sme

# Look for:
# - High CPU: LLM generation in progress
# - High memory: Vector store loaded
# - Network I/O: Data transfer
```

### Slow Quiz Generation

**Normal times:**
- Small module (< 2000 words): 2-3 minutes
- Medium module (2000-5000 words): 3-5 minutes
- Large module (> 5000 words): 5-10 minutes

**If slower:**
```bash
# Enable parallel processing
# Check SME logs for bottlenecks
docker compose logs -f sme | grep -E "Processing|Generated"

# Check vLLM response time
# Monitor network latency to vLLM
```

### Database Performance

```sql
-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (enable in postgresql.conf)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 🔄 Backup & Restore

### Backup

```bash
# PostgreSQL
docker exec lmw_postgres pg_dump -U postgres learning_middleware > backup.sql

# MongoDB
docker exec lmw_mongodb mongodump --db learning_middleware --out /tmp/backup
docker cp lmw_mongodb:/tmp/backup ./mongodb_backup

# Vector stores and uploads
tar -czf sme_data_backup.tar.gz sme/data/
```

### Restore

```bash
# PostgreSQL
docker exec -i lmw_postgres psql -U postgres learning_middleware < backup.sql

# MongoDB
docker cp ./mongodb_backup lmw_mongodb:/tmp/backup
docker exec lmw_mongodb mongorestore /tmp/backup

# Vector stores
tar -xzf sme_data_backup.tar.gz
```

## 🔒 Security Checks

```bash
# Check JWT secret is set
docker compose exec learner env | grep SECRET_KEY
# Should NOT be default value in production

# Check database passwords
docker compose exec postgres env | grep POSTGRES_PASSWORD
# Should be strong password in production

# Check CORS settings in main.py files
# Ensure only allowed origins in production
```

## 📞 Getting Help

1. **Check logs** first: `docker compose logs -f <service>`
2. **Check service docs**: Read README.md in each service folder
3. **Check API docs**: Visit /docs endpoint for each API service
4. **Check database**: Verify data is being stored correctly
5. **Check network**: Ensure services can communicate

## 🚦 Health Check Script

Create `health_check.sh`:
```bash
#!/bin/bash

echo "Checking services..."
curl -s http://localhost:5001/docs > /dev/null && echo "✅ Learner" || echo "❌ Learner"
curl -s http://localhost:5002/docs > /dev/null && echo "✅ Instructor" || echo "❌ Instructor"
curl -s http://localhost:8001/docs > /dev/null && echo "✅ Orchestrator" || echo "❌ Orchestrator"
curl -s http://localhost:8000/ > /dev/null && echo "✅ SME" || echo "❌ SME"
curl -s http://localhost:3000/ > /dev/null && echo "✅ UI" || echo "❌ UI"

echo "Checking databases..."
docker exec lmw_postgres psql -U postgres -c "SELECT 1;" > /dev/null 2>&1 && echo "✅ PostgreSQL" || echo "❌ PostgreSQL"
docker exec lmw_mongodb mongosh --eval "db.stats()" > /dev/null 2>&1 && echo "✅ MongoDB" || echo "❌ MongoDB"
```

Run: `chmod +x health_check.sh && ./health_check.sh`
