#!/bin/bash
# Health Check Script for All Services

echo "════════════════════════════════════════════════════════════════"
echo "  Learning Middleware iREL - Service Health Check"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    local expected_status=$4
    
    echo -n "[$name] (port $port) ... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port$endpoint 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ HEALTHY${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ UNHEALTHY${NC} (HTTP $response)"
        return 1
    fi
}

# Function to check container status
check_container() {
    local container=$1
    echo -n "Container: $container ... "
    
    status=$(docker inspect -f '{{.State.Health.Status}}' $container 2>/dev/null)
    
    if [ -z "$status" ]; then
        # No health check defined, check if running
        if docker ps --filter "name=$container" --filter "status=running" | grep -q $container; then
            echo -e "${GREEN}RUNNING${NC} (no health check)"
            return 0
        else
            echo -e "${RED}NOT RUNNING${NC}"
            return 1
        fi
    elif [ "$status" = "healthy" ]; then
        echo -e "${GREEN}HEALTHY${NC}"
        return 0
    elif [ "$status" = "starting" ]; then
        echo -e "${YELLOW}STARTING${NC}"
        return 2
    else
        echo -e "${RED}UNHEALTHY${NC}"
        return 1
    fi
}

echo "1. Container Status:"
echo "───────────────────────────────────────────────────────────────"
check_container "lmw_postgres"
check_container "lmw_mongodb"
check_container "lmw_sme"
check_container "lmw_learner"
check_container "lmw_instructor"
check_container "lmw_learner_orchestrator"
echo ""

echo "2. Service Endpoints:"
echo "───────────────────────────────────────────────────────────────"
check_service "SME" 8000 "/health" 200
check_service "Orchestrator" 8001 "/" 200
check_service "Learner" 8002 "/health" 200
check_service "Instructor" 8003 "/health" 200
echo ""

echo "3. Database Connections:"
echo "───────────────────────────────────────────────────────────────"
echo -n "PostgreSQL ... "
if docker exec lmw_postgres pg_isready -U lmw_user -d lmw_database >/dev/null 2>&1; then
    echo -e "${GREEN}✓ READY${NC}"
else
    echo -e "${RED}✗ NOT READY${NC}"
fi

echo -n "MongoDB ... "
if docker exec lmw_mongodb mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
    echo -e "${GREEN}✓ READY${NC}"
else
    echo -e "${RED}✗ NOT READY${NC}"
fi
echo ""

echo "4. API Documentation URLs:"
echo "───────────────────────────────────────────────────────────────"
echo "  SME:          http://localhost:8000/docs"
echo "  Orchestrator: http://localhost:8001/docs"
echo "  Learner:      http://localhost:8002/docs"
echo "  Instructor:   http://localhost:8003/docs"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  Run 'docker compose ps' for detailed container status"
echo "  Run 'docker compose logs <service>' to view service logs"
echo "════════════════════════════════════════════════════════════════"
