# Docker Setup Guide - Learning Middleware iREL

## Quick Start (All Services)

### 1. Build and Start All Services
```bash
# Navigate to project root
cd /code/Research/iREL/lmw_Final/Learning-Middleware-iREL

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f
```

### 2. Check Service Status
```bash
# Check all running containers
docker-compose ps

# Check specific service logs
docker-compose logs -f instructor
docker-compose logs -f learner
docker-compose logs -f sme
```

### 3. Stop All Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

---

## Services Overview

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **PostgreSQL** | 5432 | - | Main database for courses, modules, users |
| **MongoDB** | 27017 | - | Storage for learning objectives, files |
| **SME Service** | 8000 | http://localhost:8000 | Learning objectives, module gen, quiz gen |
| **Learner Orchestrator** | 8001 | http://localhost:8001 | Learner workflow orchestration |
| **Learner API** | 8002 | http://localhost:8002 | Learner authentication & data |
| **Instructor API** | 8003 | http://localhost:8003 | Instructor authentication & courses |
| **UI (Next.js)** | 3000 | http://localhost:3000 | Frontend application |

---

## Detailed Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d instructor

# Start with rebuild
docker-compose up --build -d

# Start without detached mode (see logs in terminal)
docker-compose up
```

### Stop Services
```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop instructor

# Remove stopped containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f instructor
docker-compose logs -f learner
docker-compose logs -f sme

# Last 100 lines
docker-compose logs --tail=100 instructor

# Since specific time
docker-compose logs --since 10m instructor
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build instructor

# Rebuild without cache
docker-compose build --no-cache instructor

# Rebuild and restart
docker-compose up --build -d
```

### Service Health Checks
```bash
# Check health status
docker-compose ps

# Inspect specific service
docker inspect lmw_instructor

# Check service health
docker inspect --format='{{.State.Health.Status}}' lmw_instructor
```

---

## Environment Variables

### PostgreSQL
- **POSTGRES_DB**: lmw_database
- **POSTGRES_USER**: lmw_user
- **POSTGRES_PASSWORD**: lmw_password

### MongoDB
- **MONGO_INITDB_ROOT_USERNAME**: lmw_user
- **MONGO_INITDB_ROOT_PASSWORD**: lmw_password
- **MONGO_INITDB_DATABASE**: lmw_mongo

### Instructor API (Port 8003)
```env
DATABASE_URL=postgresql://lmw_user:lmw_password@postgres:5432/lmw_database
MONGODB_URL=mongodb://lmw_user:lmw_password@mongodb:27017/?authSource=admin
SECRET_KEY=your-secret-key-change-this-in-production
API_V1_STR=/api/v1/instructor
SME_SERVICE_URL=http://sme:8000
```

### Learner API (Port 8002)
```env
DATABASE_URL=postgresql://lmw_user:lmw_password@postgres:5432/lmw_database
SECRET_KEY=your-secret-key-change-this-in-production
API_V1_STR=/api/v1/learner
```

### SME Service (Port 8000)
```env
POSTGRES_HOST=postgres
POSTGRES_USER=lmw_user
POSTGRES_PASSWORD=lmw_password
POSTGRES_DB=lmw_database
```

---

## Running UI (Frontend)

The UI is NOT dockerized yet. Run it separately:

```bash
# Navigate to UI folder
cd ui

# Install dependencies (first time only)
npm install
# or
pnpm install

# Set environment variables
echo 'NEXT_PUBLIC_INSTRUCTOR_API_URL=http://localhost:8003' > .env.local
echo 'NEXT_PUBLIC_LEARNER_API_URL=http://localhost:8002' >> .env.local
echo 'NEXT_PUBLIC_SME_API_URL=http://localhost:8000' >> .env.local

# Start development server
npm run dev
# or
pnpm dev
```

Access UI at: http://localhost:3000

---

## Database Access

### PostgreSQL
```bash
# Connect to PostgreSQL container
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database

# Run SQL query
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c "SELECT * FROM instructor;"

# Backup database
docker exec lmw_postgres pg_dump -U lmw_user lmw_database > backup.sql

# Restore database
cat backup.sql | docker exec -i lmw_postgres psql -U lmw_user -d lmw_database
```

### MongoDB
```bash
# Connect to MongoDB container
docker exec -it lmw_mongodb mongosh -u lmw_user -p lmw_password --authenticationDatabase admin lmw_mongo

# List collections
docker exec -it lmw_mongodb mongosh -u lmw_user -p lmw_password --authenticationDatabase admin lmw_mongo --eval "db.getCollectionNames()"

# Query learning objectives
docker exec -it lmw_mongodb mongosh -u lmw_user -p lmw_password --authenticationDatabase admin lmw_mongo --eval "db.learning_objectives.find().pretty()"
```

---

## Troubleshooting

### Services Not Starting
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs instructor

# Restart service
docker-compose restart instructor

# Rebuild and restart
docker-compose up --build -d
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :8003

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
# ports:
#   - "8004:8003"  # host:container
```

### Database Connection Issues
```bash
# Check if databases are running
docker-compose ps postgres mongodb

# Restart databases
docker-compose restart postgres mongodb

# Check database logs
docker-compose logs postgres
docker-compose logs mongodb

# Reset databases (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Clean Start (Reset Everything)
```bash
# Stop and remove everything
docker-compose down -v --rmi all

# Remove all unused Docker resources
docker system prune -a

# Rebuild from scratch
docker-compose up --build -d
```

### Container Keeps Restarting
```bash
# Check why container is failing
docker-compose logs <service-name>

# Check last 50 lines
docker-compose logs --tail=50 <service-name>

# Disable restart policy temporarily
docker update --restart=no lmw_instructor
```

---

## Development Workflow

### Making Code Changes

#### For Python Services (instructor/learner/sme)
```bash
# Option 1: Rebuild and restart
docker-compose up --build -d <service-name>

# Option 2: Use volume mounts for live reload (add to docker-compose.yml)
volumes:
  - ./instructor:/app
```

#### For UI Changes
The UI runs outside Docker, so changes are auto-reloaded by Next.js.

### Testing API Endpoints

```bash
# Health checks
curl http://localhost:8003/health  # Instructor
curl http://localhost:8002/health  # Learner
curl http://localhost:8000/        # SME

# MongoDB health
curl http://localhost:8003/api/v1/instructor/health/mongodb

# Create test instructor
curl -X POST http://localhost:8003/api/v1/instructor/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","first_name":"Test","last_name":"User"}'
```

---

## Production Deployment

### Before Deploying
1. **Change default passwords** in docker-compose.yml
2. **Set strong SECRET_KEY** in environment variables
3. **Enable SSL/TLS** for database connections
4. **Set up backups** for PostgreSQL and MongoDB
5. **Configure proper logging**
6. **Set resource limits** for containers

### Example Production Changes
```yaml
services:
  instructor:
    environment:
      SECRET_KEY: ${SECRET_KEY}  # Use env file
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Useful Docker Commands

```bash
# View resource usage
docker stats

# Clean up unused resources
docker system prune

# View networks
docker network ls

# View volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Execute command in container
docker exec -it lmw_instructor bash

# Copy files from/to container
docker cp lmw_instructor:/app/logs ./logs
docker cp ./file.txt lmw_instructor:/app/

# View container IP
docker inspect lmw_instructor | grep IPAddress
```

---

## Service Dependencies

```
┌─────────────┐
│  PostgreSQL │ (Port 5432)
└──────┬──────┘
       │
       ├──────→ Learner API (Port 8002)
       │
       ├──────→ Instructor API (Port 8003)
       │            │
       │            ├──→ MongoDB (Port 27017)
       │            │
       │            └──→ SME Service (Port 8000)
       │
       └──────→ Learner Orchestrator (Port 8001)
                     │
                     ├──→ Learner API
                     ├──→ Instructor API
                     └──→ SME Service

┌──────────┐
│  UI      │ (Port 3000) ────→ All APIs
│ (Next.js)│
└──────────┘
```

---

## Quick Reference

### Start Everything
```bash
docker-compose up -d && cd ui && npm run dev
```

### Stop Everything
```bash
docker-compose down && pkill -f "next dev"
```

### Reset Everything
```bash
docker-compose down -v
docker-compose up --build -d
cd ui && rm -rf .next && npm run dev
```

### View All Logs
```bash
docker-compose logs -f | grep -E "instructor|learner|sme"
```

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs <service>`
2. Check health: `docker-compose ps`
3. Review documentation in each service folder
4. See FIXES_APPLIED.md for recent changes
