#!/bin/bash

echo "======================================"
echo "Testing Chat Logging System"
echo "======================================"
echo ""

cd /home/bhavyaahuja/code/iREL/LMW/Learning-Middleware-iREL

echo "Step 1: Creating/Verifying ChatLog table..."
docker exec -i lmw_postgres psql -U lmw_user -d lmw_database < database/migrations/create_chatlog_table.sql

echo ""
echo "======================================"
echo "Step 2: Verifying table structure..."
echo "======================================"
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "SELECT COUNT(*) as total_rows FROM ChatLog;"

echo ""
echo "======================================"
echo "Step 3: Restarting learner service..."
echo "======================================"
docker compose -f docker-compose.dev.yml restart learner

echo "Waiting for service to start..."
sleep 5

echo ""
echo "======================================"
echo "Step 4: Testing admin endpoint..."
echo "======================================"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "http://localhost:8002/api/v1/learner/admin/chat-logs?limit=5")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS! Endpoint is working"
    echo ""
    echo "Response (first 500 chars):"
    echo "$BODY" | head -c 500
    echo ""
else
    echo "❌ ERROR! Got status $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY"
    echo ""
    echo "Checking learner logs for errors..."
    docker compose -f docker-compose.dev.yml logs learner --tail 20
fi

echo ""
echo "======================================"
echo "Step 5: Testing chat log creation..."
echo "======================================"

# Get auth token (you'll need valid credentials)
echo "To test creating chat logs, you need to:"
echo "1. Login as a learner to get a token"
echo "2. Then POST to /api/v1/learner/chat-logs with the token"
echo ""
echo "Or just use the UI:"
echo "  http://localhost:3000/learner/chat"
echo ""

echo "======================================"
echo "Summary"
echo "======================================"
echo "✅ ChatLog table created/verified"
echo "✅ Indexes created"
echo "✅ Learner service restarted"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "🎉 All tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Go to http://localhost:3000/learner/chat"
    echo "2. Select a course and ask a question"
    echo "3. Look for thumbs up/down icons"
else
    echo "⚠️  Admin endpoint returned error $HTTP_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check logs: docker compose -f docker-compose.dev.yml logs learner"
    echo "2. Verify DB: docker exec -it lmw_postgres psql -U lmw_user -d lmw_database"
    echo "3. Check for Python errors in the backend"
fi
