#!/bin/bash

# Build script with optimizations
# This script uses BuildKit for faster builds with better caching

echo "🚀 Starting optimized Docker build..."
echo ""
echo "Optimizations enabled:"
echo "  ✓ BuildKit for parallel layer builds"
echo "  ✓ Dependency caching (pip/pnpm)"
echo "  ✓ Layer reuse optimization"
echo ""

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Optional: Set parallel build limit based on CPU cores
# Uncomment and adjust based on your system
# export COMPOSE_PARALLEL_LIMIT=4

# Build with docker-compose
if [ "$1" == "dev" ]; then
    echo "Building development containers..."
    docker-compose -f docker-compose.dev.yml build --parallel
else
    echo "Building production containers..."
    docker-compose build --parallel
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "To start the services:"
if [ "$1" == "dev" ]; then
    echo "  docker-compose -f docker-compose.dev.yml up"
else
    echo "  docker-compose up"
fi
