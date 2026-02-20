#!/bin/bash
# Database Interaction Backup Script
# Exports chat logs, feedback, and learning objectives to CSV/JSON files
# Usage: ./backup_interactions.sh [YYYY-MM-DD]

set -e

# Configuration
BACKUP_DATE="${1:-$(date +%Y-%m-%d)}"
BACKUP_DIR="/tmp/backups/${BACKUP_DATE}"
POSTGRES_USER="lmw_user"
POSTGRES_DB="lmw_database"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "==================================="
echo "Database Interaction Backup"
echo "Date: ${BACKUP_DATE}"
echo "Output: ${BACKUP_DIR}"
echo "==================================="
echo ""

# Function to export PostgreSQL table to CSV
export_table() {
    local table_name=$1
    local output_file=$2
    local query=$3
    
    echo "Exporting ${table_name}..."
    
    if [ -z "$query" ]; then
        # Export entire table
        psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            -c "COPY (SELECT * FROM ${table_name}) TO STDOUT WITH CSV HEADER" \
            > "${BACKUP_DIR}/${output_file}"
    else
        # Export with custom query
        psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            -c "COPY (${query}) TO STDOUT WITH CSV HEADER" \
            > "${BACKUP_DIR}/${output_file}"
    fi
    
    local row_count=$(tail -n +2 "${BACKUP_DIR}/${output_file}" | wc -l)
    echo "  ✓ Exported ${row_count} rows to ${output_file}"
}

# Export PostgreSQL tables
echo "--- PostgreSQL Exports ---"
export_table "chatlog" "chat_logs.csv"
export_table "modulefeedback" "module_feedback.csv"
export_table "quizfeedback" "quiz_feedback.csv"

# Export Learning Objectives with JOIN to get course details
echo "Exporting Learning Objectives..."
psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    -c "COPY (
        SELECT 
            c.courseid,
            c.course_name,
            c.instructorid,
            c.coursedescription,
            c.targetaudience,
            c.created_at
        FROM course c
        WHERE c.is_published = true
        ORDER BY c.created_at DESC
    ) TO STDOUT WITH CSV HEADER" \
    > "${BACKUP_DIR}/learning_objectives_courses.csv"

course_count=$(tail -n +2 "${BACKUP_DIR}/learning_objectives_courses.csv" | wc -l)
echo "  ✓ Exported ${course_count} courses to learning_objectives_courses.csv"

echo ""
echo "==================================="
echo "Backup Complete!"
echo "==================================="
echo "Location: ${BACKUP_DIR}"
echo ""
echo "Files created:"
ls -lh "${BACKUP_DIR}/" | tail -n +2 | awk '{printf "  - %s (%s)\n", $9, $5}'
echo ""

# Calculate total size
total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "Total size: ${total_size}"
echo ""
