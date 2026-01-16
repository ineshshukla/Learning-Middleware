# Docker Development Guide

## 🚀 Quick Start

### Development Mode (Recommended for Coding)
**Use this while actively developing - changes reflect instantly without rebuild!**

```bash
# First time only (builds images)
docker compose -f docker-compose.dev.yml up -d --build

# After first build, just start services (takes seconds)
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

**Why use this?**
- ✅ Code changes reflect **instantly** (no rebuild)
- ✅ Hot reload enabled for all services
- ✅ Volume mounts: your local files = container files
- ✅ Fast iteration cycle

---

### Production Mode (For Deployment/Testing)
**Use this to test production builds or deploy**

```bash
# Build and run production images
docker compose up -d --build

# Stop
docker compose down
```

**Why use this?**
- ✅ Optimized multi-stage builds
- ✅ Smaller image sizes
- ✅ Production-ready configuration
- ❌ Code changes require rebuild

---

## 📋 Development Workflow

### Daily Development Routine

1. **Start services once:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Code normally** - changes are live!
   - Edit Python files → FastAPI auto-reloads
   - Edit Next.js files → Hot reload in browser
   - **No rebuild needed**

3. **View logs when needed:**
   ```bash
   # All services
   docker compose -f docker-compose.dev.yml logs -f
   
   # Specific service
   docker compose -f docker-compose.dev.yml logs -f ui
   docker compose -f docker-compose.dev.yml logs -f sme
   ```

4. **Restart a service if needed:**
   ```bash
   docker compose -f docker-compose.dev.yml restart ui
   ```

5. **Stop when done:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

---

## 🔄 When Do You Need to Rebuild?

### ✅ Rebuild ONLY when:
- You changed `requirements.txt` (Python dependencies)
- You changed `package.json` (Node.js dependencies)
- You changed `Dockerfile` or `Dockerfile.dev`
- First time setup

```bash
# Rebuild specific service
docker compose -f docker-compose.dev.yml up -d --build ui

# Rebuild all services
docker compose -f docker-compose.dev.yml up -d --build
```

### ❌ NO rebuild needed when:
- You change Python code (`.py` files)
- You change TypeScript/React code (`.tsx`, `.ts` files)
- You change configuration files
- You add new routes/endpoints

---

## 🛠️ Useful Commands

### View Running Containers
```bash
docker ps
```

### Execute commands inside container
```bash
# Python shell
docker exec -it sme python

# Bash shell
docker exec -it sme bash

# Run database migrations
docker exec -it learner python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Clean up everything (fresh start)
```bash
# Stop and remove containers, networks
docker compose -f docker-compose.dev.yml down

# Also remove volumes (⚠️ deletes database data)
docker compose -f docker-compose.dev.yml down -v

# Remove all unused images
docker image prune -a
```

### Check disk usage
```bash
docker system df
```

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| UI | 3000 | http://localhost:3000 |
| Learner Orchestrator | 8001 | http://localhost:8001 |
| Learner | 8002 | http://localhost:8002 |
| Instructor | 8003 | http://localhost:8003 |
| SME | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |

---

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker compose -f docker-compose.dev.yml logs <service-name>

# Example
docker compose -f docker-compose.dev.yml logs sme
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Or with docker
docker ps | grep 3000
```

### Database connection errors
```bash
# Check if postgres is healthy
docker compose -f docker-compose.dev.yml ps

# View postgres logs
docker compose -f docker-compose.dev.yml logs postgres
```

### Changes not reflecting
1. Check if volume is mounted:
   ```bash
   docker inspect <container_name> | grep Mounts -A 10
   ```

2. Restart the specific service:
   ```bash
   docker compose -f docker-compose.dev.yml restart <service>
   ```

### Out of disk space
```bash
# Clean up unused containers/images
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## 💡 Pro Tips

1. **Use `docker compose logs -f` in a separate terminal** to watch live logs while coding

2. **Create aliases** for common commands:
   ```bash
   alias dcdev='docker compose -f docker-compose.dev.yml'
   alias dcup='docker compose -f docker-compose.dev.yml up -d'
   alias dclogs='docker compose -f docker-compose.dev.yml logs -f'
   alias dcdown='docker compose -f docker-compose.dev.yml down'
   ```

3. **VS Code integration**: Install "Docker" extension to manage containers from UI

4. **Health checks**: Wait ~30 seconds after `up` for health checks to pass

5. **Database migrations**: Run them inside the container or via volume-mounted code

---

## 📁 File Structure

```
.
├── docker-compose.yml           # Production config
├── docker-compose.dev.yml       # Development config (use this!)
├── .dockerignore                # Files to exclude from builds
│
├── ui/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development build
│   └── .dockerignore
│
├── sme/
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── learner/
│   ├── Dockerfile
│   └── Dockerfile.dev
│
└── ... (same pattern for all services)
```

---

## ⏱️ Build Time Comparison

| Scenario | Development | Production |
|----------|-------------|------------|
| **First build** | ~5-8 min | ~20-25 min |
| **Code change** | 0 sec (instant) | ~20-25 min (full rebuild) |
| **Dependency change** | ~2-3 min | ~20-25 min |
| **Restart service** | ~5 sec | N/A (need rebuild) |

---

**Bottom line**: Use `docker-compose.dev.yml` for development. Only rebuild when dependencies change. Your 22-minute wait becomes a 0-second instant refresh! 🎉
