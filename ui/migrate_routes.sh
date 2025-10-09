#!/bin/bash

# UI Route Migration Script
# This script helps update route references from old structure to new structure

echo "=========================================="
echo "UI Route Migration Helper"
echo "Learning Middleware iREL"
echo "=========================================="
echo ""

# Define color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
UI_DIR="/code/Research/iREL/lmw_Final/Learning-Middleware-iREL/ui"
cd "$UI_DIR" || exit 1

echo -e "${YELLOW}Step 1: Finding old route references...${NC}"
echo ""

# Function to search for patterns
search_pattern() {
    local pattern=$1
    local desc=$2
    echo -e "${YELLOW}Searching for: ${desc}${NC}"
    
    # Search in TSX/TS files, exclude node_modules and .next
    grep -rn "$pattern" app/ components/ --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next || echo "  No matches found"
    echo ""
}

# Search for old instructor routes
echo -e "${GREEN}=== INSTRUCTOR ROUTE REFERENCES ===${NC}"
search_pattern "href=\"/dashboard\"" "Dashboard links"
search_pattern "href=\"/courses\"" "Courses links"
search_pattern "href=\"/upload\"" "Upload links"
search_pattern "href=\"/editor\"" "Editor links"
search_pattern "href=\"/quiz\"" "Quiz links"
search_pattern "href=\"/assignment\"" "Assignment links"
search_pattern "href=\"/library\"" "Library links"
search_pattern "href=\"/course/" "Course detail links"

echo -e "${GREEN}=== SHARED ROUTE REFERENCES ===${NC}"
search_pattern "href=\"/profile\"" "Profile links"
search_pattern "href=\"/chat\"" "Chat links"

echo -e "${GREEN}=== ROUTER NAVIGATION ===${NC}"
search_pattern "router.push\(\"/dashboard" "Dashboard navigation"
search_pattern "router.push\(\"/courses" "Courses navigation"
search_pattern "router.push\(\"/upload" "Upload navigation"
search_pattern "router.push\(\"/editor" "Editor navigation"

echo ""
echo -e "${YELLOW}Step 2: Migration Commands${NC}"
echo ""
echo "Run these commands to update route references:"
echo ""

cat << 'EOF'
# Update instructor route references
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/dashboard"|href="/instructor/dashboard"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/courses"|href="/instructor/courses"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/upload"|href="/instructor/upload"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/editor"|href="/instructor/editor"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/quiz"|href="/instructor/quiz"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/assignment"|href="/instructor/assignment"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/library"|href="/instructor/library"|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/course/|href="/instructor/course/|g' {} +

# Update shared route references
find app/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/profile"|href="/shared/profile"|g' {} +
find app/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|href="/chat"|href="/shared/chat"|g' {} +

# Update router.push calls
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/dashboard|router.push("/instructor/dashboard|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/courses|router.push("/instructor/courses|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/upload|router.push("/instructor/upload|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/editor|router.push("/instructor/editor|g' {} +
find app/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/profile|router.push("/shared/profile|g' {} +
find app/ components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|router.push("/chat|router.push("/shared/chat|g' {} +

# Update redirect calls
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|redirect("/dashboard|redirect("/instructor/dashboard|g' {} +
find app/instructor components/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|redirect("/courses|redirect("/instructor/courses|g' {} +
EOF

echo ""
echo -e "${YELLOW}Step 3: Verification Commands${NC}"
echo ""
echo "After running migrations, verify with:"
echo ""

cat << 'EOF'
# Check for any remaining old routes (should return minimal results)
grep -rn 'href="/dashboard"' app/instructor/ components/ --include="*.tsx" --include="*.ts"
grep -rn 'href="/courses"' app/instructor/ components/ --include="*.tsx" --include="*.ts"
grep -rn 'href="/profile"' app/ components/ --include="*.tsx" --include="*.ts" | grep -v "/shared/profile"
grep -rn 'href="/chat"' app/ components/ --include="*.tsx" --include="*.ts" | grep -v "/shared/chat"

# Check build
npm run build

# Start dev server and test
npm run dev
EOF

echo ""
echo -e "${GREEN}Step 4: Cleanup Old Routes${NC}"
echo ""
echo "After testing and verification, remove old routes:"
echo ""

cat << 'EOF'
# Backup first!
tar -czf ui_backup_$(date +%Y%m%d_%H%M%S).tar.gz app/

# Remove old instructor routes
rm -rf app/dashboard
rm -rf app/courses
rm -rf app/upload
rm -rf app/editor
rm -rf app/quiz
rm -rf app/assignment
rm -rf app/library
rm -rf app/course

# Remove old shared routes
rm -rf app/profile
rm -rf app/chat

# Clean and rebuild
rm -rf .next
npm run build
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "Migration Summary"
echo "==========================================${NC}"
echo ""
echo "1. Review the search results above"
echo "2. Run the migration commands (copy from above)"
echo "3. Run verification commands"
echo "4. Test thoroughly in browser"
echo "5. Run cleanup commands"
echo ""
echo -e "${YELLOW}Important: Create a backup before cleanup!${NC}"
echo ""
echo "For detailed guidance, see:"
echo "  - RESTRUCTURING_GUIDE.md"
echo "  - ARCHITECTURE_OVERVIEW.md"
echo ""
