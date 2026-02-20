#!/bin/bash
# Database Interaction Backup Wrapper Script
# Exports interaction data from PostgreSQL and MongoDB to local backup folder
# Usage: ./scripts/backup-data.sh [YYYY-MM-DD]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DATE="${1:-$(date +%Y-%m-%d)}"
BACKUP_DIR="./backups/${BACKUP_DATE}"
POSTGRES_CONTAINER="lmw_postgres"
MONGO_CONTAINER="lmw_mongo"
MONGO_USER="lmw_user"
MONGO_PASS="lmw_password"
MONGO_DB="lmw_mongo"

echo -e "${BLUE}==================================="
echo "LMW Interaction Data Backup"
echo "===================================${NC}"
echo -e "Date: ${YELLOW}${BACKUP_DATE}${NC}"
echo -e "Output: ${YELLOW}${BACKUP_DIR}${NC}"
echo ""

# Create local backup directory
mkdir -p "${BACKUP_DIR}"

# Check if containers are running
echo -e "${BLUE}Checking database containers...${NC}"
if ! docker ps | grep -q "${POSTGRES_CONTAINER}"; then
    echo -e "${YELLOW}⚠ Warning: ${POSTGRES_CONTAINER} is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q "${MONGO_CONTAINER}"; then
    echo -e "${YELLOW}⚠ Warning: ${MONGO_CONTAINER} is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Both containers are running${NC}"
echo ""

# Copy backup script to container
echo -e "${BLUE}Preparing PostgreSQL backup...${NC}"
docker cp database/backup_interactions.sh "${POSTGRES_CONTAINER}:/tmp/backup_interactions.sh"
docker exec "${POSTGRES_CONTAINER}" chmod +x /tmp/backup_interactions.sh

# Run PostgreSQL backup inside container
echo ""
docker exec "${POSTGRES_CONTAINER}" /tmp/backup_interactions.sh "${BACKUP_DATE}"

# Copy PostgreSQL backup files from container to host
echo -e "${BLUE}Copying PostgreSQL exports to host...${NC}"
docker cp "${POSTGRES_CONTAINER}:/tmp/backups/${BACKUP_DATE}/." "${BACKUP_DIR}/"
echo -e "${GREEN}✓ PostgreSQL data copied${NC}"
echo ""

# Export MongoDB Learning Objectives
echo -e "${BLUE}--- MongoDB Exports ---${NC}"
echo "Exporting Learning Objectives..."

docker exec "${MONGO_CONTAINER}" mongoexport \
    --db="${MONGO_DB}" \
    --collection=courselearningobjective \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASS}" \
    --authenticationDatabase=admin \
    --out="/tmp/learning_objectives.json" \
    --jsonArray \
    2>/dev/null

# Copy MongoDB export to host
docker cp "${MONGO_CONTAINER}:/tmp/learning_objectives.json" "${BACKUP_DIR}/learning_objectives.json"

# Count documents
doc_count=$(cat "${BACKUP_DIR}/learning_objectives.json" | grep -o '"_id"' | wc -l)
echo -e "${GREEN}  ✓ Exported ${doc_count} learning objectives to learning_objectives.json${NC}"
echo ""

# Cleanup temp files in containers
docker exec "${POSTGRES_CONTAINER}" rm -rf /tmp/backups
docker exec "${MONGO_CONTAINER}" rm -f /tmp/learning_objectives.json

# Summary
echo -e "${GREEN}==================================="
echo "Backup Complete!"
echo "===================================${NC}"
echo -e "Location: ${YELLOW}${BACKUP_DIR}${NC}"
echo ""
echo "Files created:"
ls -lh "${BACKUP_DIR}/" | tail -n +2 | awk -v green="$GREEN" -v nc="$NC" '{printf "  %s- %s (%s)%s\n", green, $9, $5, nc}'
echo ""

# Calculate total size
total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo -e "Total size: ${YELLOW}${total_size}${NC}"
echo ""

# Show row counts
echo -e "${BLUE}Data Summary:${NC}"
for csv_file in "${BACKUP_DIR}"/*.csv; do
    if [ -f "$csv_file" ]; then
        filename=$(basename "$csv_file")
        row_count=$(($(wc -l < "$csv_file") - 1))
        echo -e "  ${filename}: ${YELLOW}${row_count}${NC} rows"
    fi
done
echo ""
echo -e "${GREEN}✓ Backup saved successfully!${NC}"
echo ""
