#!/bin/bash

echo "=== Testing Chat Feedback Feature ==="
echo ""

echo "1. Checking if feedback column exists..."
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "\d chatlog" | grep feedback

echo ""
echo "2. Checking recent chat logs (with feedback column)..."
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "
SELECT 
    id, 
    LEFT(user_question, 40) as question,
    CASE 
        WHEN feedback IS NULL THEN '(no feedback)'
        WHEN feedback = 'like' THEN '👍 Liked'
        WHEN feedback = 'dislike' THEN '👎 Disliked'
    END as feedback_status,
    created_at
FROM ChatLog 
ORDER BY created_at DESC 
LIMIT 5;
"

echo ""
echo "3. Checking service status..."
docker compose -f docker-compose.dev.yml ps learner ui

echo ""
echo "=== Next Steps ==="
echo "1. Go to: http://localhost:3000/learner/chat"
echo "2. Select a course"
echo "3. Ask a NEW question (e.g., 'What is a variable?')"
echo "4. Wait for the response to complete"
echo "5. Look for small thumbs up/down icons next to the timestamp"
echo ""
echo "Note: Old messages won't have the icons - only NEW messages after this migration!"
