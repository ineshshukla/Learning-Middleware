#!/bin/bash

echo "======================================"
echo "Fixing CORS and Chat Logging Issues"
echo "======================================"
echo ""

cd /home/bhavyaahuja/code/iREL/LMW/Learning-Middleware-iREL

echo "Step 1: Restarting learner service..."
docker compose -f docker-compose.dev.yml restart learner
sleep 5

echo ""
echo "Step 2: Checking learner service status..."
docker compose -f docker-compose.dev.yml ps learner

echo ""
echo "Step 3: Testing API endpoints..."
echo "Testing root endpoint:"
curl -s http://localhost:8002/ | head -1

echo ""
echo "Testing health endpoint:"
curl -s http://localhost:8002/health

echo ""
echo "Testing API v1 learner path:"
curl -s http://localhost:8002/api/v1/learner/ 2>&1 | head -1

echo ""
echo "======================================"
echo "Configuration Summary:"
echo "======================================"
echo "Backend API prefix: /api/v1/learner"
echo "Frontend calls to: http://localhost:8002/api/v1/learner/*"
echo ""
echo "Expected endpoints:"
echo "- POST   /api/v1/learner/chat-logs (create log)"
echo "- GET    /api/v1/learner/chat-logs (get logs)"
echo "- PATCH  /api/v1/learner/chat-logs/{id}/feedback (update feedback)"
echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo "1. Open browser: http://localhost:3000/learner/chat"
echo "2. Open DevTools (F12) → Console tab"
echo "3. Refresh the page (Ctrl+Shift+R)"
echo "4. Select a course and ask a NEW question"
echo "5. Check console for any errors"
echo "6. Look for thumbs up/down icons next to timestamp"
echo ""
echo "If you still see CORS errors, run:"
echo "  docker compose -f docker-compose.dev.yml logs learner --tail 50"
echo ""
