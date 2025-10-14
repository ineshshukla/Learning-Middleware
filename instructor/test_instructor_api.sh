#!/bin/bash
# Comprehensive Test Script for Instructor API
# This script tests all endpoints in the correct order

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
API_BASE="http://localhost:8003/api/v1/instructor"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# Function to extract JSON field
extract_json() {
    echo "$1" | python3 -c "import sys, json; print(json.load(sys.stdin)$2)" 2>/dev/null
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Instructor API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s "http://localhost:8003/")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Instructor API is running"; then
    print_result 0 "Health check endpoint"
else
    print_result 1 "Health check endpoint"
fi
echo ""

# Test 2: MongoDB Health Check
echo -e "${YELLOW}Test 2: MongoDB Health Check${NC}"
RESPONSE=$(curl -s "$API_BASE/health/mongodb")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "connected"; then
    print_result 0 "MongoDB health check"
else
    print_result 1 "MongoDB health check"
fi
echo ""

# Test 3: Signup New Instructor
echo -e "${YELLOW}Test 3: Signup New Instructor${NC}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_instructor_$TIMESTAMP@example.com"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"TestPass123!\",
        \"first_name\": \"Test\",
        \"last_name\": \"Instructor\"
    }")
echo "Response: $SIGNUP_RESPONSE"
if echo "$SIGNUP_RESPONSE" | grep -q "instructorid"; then
    print_result 0 "Instructor signup"
    INSTRUCTOR_ID=$(echo "$SIGNUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['instructorid'])" 2>/dev/null)
else
    print_result 1 "Instructor signup"
fi
echo ""

# Test 4: Login
echo -e "${YELLOW}Test 4: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"TestPass123!\"
    }")
echo "Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    print_result 0 "Instructor login"
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
else
    print_result 1 "Instructor login"
    echo -e "${RED}Cannot proceed without token. Exiting...${NC}"
    exit 1
fi
echo ""

# Test 5: Get Current Instructor Info
echo -e "${YELLOW}Test 5: Get Current Instructor Info${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_BASE/me" \
    -H "Authorization: Bearer $TOKEN")
echo "Response: $ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q "$TEST_EMAIL"; then
    print_result 0 "Get current instructor info"
else
    print_result 1 "Get current instructor info"
fi
echo ""

# Test 6: Create Course with Modules
echo -e "${YELLOW}Test 6: Create Course with Modules${NC}"
COURSE_RESPONSE=$(curl -s -X POST "$API_BASE/courses" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "course_name": "Introduction to Machine Learning",
        "coursedescription": "Learn the basics of ML algorithms",
        "targetaudience": "Undergraduate",
        "prereqs": "Basic Python, Linear Algebra",
        "modules": [
            {"title": "Introduction to ML"},
            {"title": "Supervised Learning"},
            {"title": "Unsupervised Learning"}
        ]
    }')
echo "Response: $COURSE_RESPONSE"
if echo "$COURSE_RESPONSE" | grep -q "courseid"; then
    print_result 0 "Create course with modules"
    COURSE_ID=$(echo "$COURSE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['courseid'])" 2>/dev/null)
    MODULE_ID=$(echo "$COURSE_RESPONSE" | python3 -c "import sys, json; mods = json.load(sys.stdin)['modules']; print(mods[0]['moduleid'] if mods else '')" 2>/dev/null)
    echo "Course ID: $COURSE_ID"
    echo "First Module ID: $MODULE_ID"
else
    print_result 1 "Create course with modules"
fi
echo ""

# Test 7: Get All Courses
echo -e "${YELLOW}Test 7: Get All Courses${NC}"
COURSES_RESPONSE=$(curl -s -X GET "$API_BASE/courses" \
    -H "Authorization: Bearer $TOKEN")
echo "Response: $COURSES_RESPONSE"
if echo "$COURSES_RESPONSE" | grep -q "$COURSE_ID"; then
    print_result 0 "Get all courses"
else
    print_result 1 "Get all courses"
fi
echo ""

# Test 8: Get Specific Course
echo -e "${YELLOW}Test 8: Get Specific Course${NC}"
COURSE_DETAIL=$(curl -s -X GET "$API_BASE/courses/$COURSE_ID" \
    -H "Authorization: Bearer $TOKEN")
echo "Response: $COURSE_DETAIL"
if echo "$COURSE_DETAIL" | grep -q "Introduction to Machine Learning"; then
    print_result 0 "Get specific course"
else
    print_result 1 "Get specific course"
fi
echo ""

# Test 9: Get Learning Objectives for Module
echo -e "${YELLOW}Test 9: Get Learning Objectives for Module${NC}"
LO_RESPONSE=$(curl -s -X GET "$API_BASE/modules/$MODULE_ID/objectives" \
    -H "Authorization: Bearer $TOKEN")
echo "Response: $LO_RESPONSE"
if echo "$LO_RESPONSE" | grep -q "module_id"; then
    print_result 0 "Get learning objectives"
else
    print_result 1 "Get learning objectives"
fi
echo ""

# Test 10: Add Learning Objective
echo -e "${YELLOW}Test 10: Add Learning Objective${NC}"
ADD_LO_RESPONSE=$(curl -s -X POST "$API_BASE/modules/$MODULE_ID/objectives" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Understand the basic concepts of machine learning"
    }')
echo "Response: $ADD_LO_RESPONSE"
if echo "$ADD_LO_RESPONSE" | grep -q "Understand the basic concepts"; then
    print_result 0 "Add learning objective"
    OBJECTIVE_ID=$(echo "$ADD_LO_RESPONSE" | python3 -c "import sys, json; objs = json.load(sys.stdin)['objectives']; print(objs[0]['objective_id'] if objs else '')" 2>/dev/null)
else
    print_result 1 "Add learning objective"
fi
echo ""

# Test 11: Update Learning Objective
if [ -n "$OBJECTIVE_ID" ]; then
    echo -e "${YELLOW}Test 11: Update Learning Objective${NC}"
    UPDATE_LO_RESPONSE=$(curl -s -X PUT "$API_BASE/modules/$MODULE_ID/objectives" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"objective_id\": \"$OBJECTIVE_ID\",
            \"text\": \"Master the fundamental concepts of machine learning\"
        }")
    echo "Response: $UPDATE_LO_RESPONSE"
    if echo "$UPDATE_LO_RESPONSE" | grep -q "Master the fundamental"; then
        print_result 0 "Update learning objective"
    else
        print_result 1 "Update learning objective"
    fi
    echo ""
fi

# Test 12: Upload File to Course
echo -e "${YELLOW}Test 12: Upload File to Course${NC}"
# Create a test file
echo "This is a test document for ML course" > /tmp/test_ml_doc.txt
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/courses/$COURSE_ID/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test_ml_doc.txt")
echo "Response: $UPLOAD_RESPONSE"
if echo "$UPLOAD_RESPONSE" | grep -q "file_id"; then
    print_result 0 "Upload file to course"
    FILE_PATH=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['file_path'])" 2>/dev/null)
    echo "File uploaded to: $FILE_PATH"
    
    # Verify file exists in SME directory
    if [ -f "$FILE_PATH" ]; then
        echo -e "${GREEN}✓ File exists in SME directory${NC}"
    else
        echo -e "${RED}✗ File NOT found in SME directory: $FILE_PATH${NC}"
    fi
else
    print_result 1 "Upload file to course"
fi
rm -f /tmp/test_ml_doc.txt
echo ""

# Test 13: Get Course Files
echo -e "${YELLOW}Test 13: Get Course Files${NC}"
FILES_RESPONSE=$(curl -s -X GET "$API_BASE/courses/$COURSE_ID/files" \
    -H "Authorization: Bearer $TOKEN")
echo "Response: $FILES_RESPONSE"
if echo "$FILES_RESPONSE" | grep -q "file_id"; then
    print_result 0 "Get course files"
else
    print_result 1 "Get course files"
fi
echo ""

# Test 14: Delete Learning Objective
if [ -n "$OBJECTIVE_ID" ]; then
    echo -e "${YELLOW}Test 14: Delete Learning Objective${NC}"
    DELETE_LO_RESPONSE=$(curl -s -X DELETE "$API_BASE/modules/$MODULE_ID/objectives/$OBJECTIVE_ID" \
        -H "Authorization: Bearer $TOKEN")
    echo "Response: $DELETE_LO_RESPONSE"
    if echo "$DELETE_LO_RESPONSE" | grep -q "module_id"; then
        print_result 0 "Delete learning objective"
    else
        print_result 1 "Delete learning objective"
    fi
    echo ""
fi

# Test 15: Duplicate Email Signup (Should Fail)
echo -e "${YELLOW}Test 15: Duplicate Email Signup (Should Fail)${NC}"
DUP_RESPONSE=$(curl -s -X POST "$API_BASE/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"TestPass123!\",
        \"first_name\": \"Duplicate\",
        \"last_name\": \"User\"
    }")
echo "Response: $DUP_RESPONSE"
if echo "$DUP_RESPONSE" | grep -q "already registered"; then
    print_result 0 "Duplicate email validation"
else
    print_result 1 "Duplicate email validation"
fi
echo ""

# Test 16: Invalid Login (Should Fail)
echo -e "${YELLOW}Test 16: Invalid Login (Should Fail)${NC}"
INVALID_LOGIN=$(curl -s -X POST "$API_BASE/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"WrongPassword\"
    }")
echo "Response: $INVALID_LOGIN"
if echo "$INVALID_LOGIN" | grep -q "Incorrect"; then
    print_result 0 "Invalid login validation"
else
    print_result 1 "Invalid login validation"
fi
echo ""

# Test 17: Unauthorized Access (Should Fail)
echo -e "${YELLOW}Test 17: Unauthorized Access (Should Fail)${NC}"
UNAUTH_RESPONSE=$(curl -s -X GET "$API_BASE/courses")
echo "Response: $UNAUTH_RESPONSE"
if echo "$UNAUTH_RESPONSE" | grep -q "Not authenticated\|detail"; then
    print_result 0 "Unauthorized access validation"
else
    print_result 1 "Unauthorized access validation"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}Total Tests: $((TESTS_PASSED + TESTS_FAILED))${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
