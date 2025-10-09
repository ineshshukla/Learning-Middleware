# Course Creation Integration - Summary

## Changes Made

### Backend Changes (Instructor API)

#### 1. Updated Schemas (`instructor/schemas.py`)
- **Removed** `courseid` from `CourseCreate` - now auto-generated
- **Added** `ModuleInput` schema for module creation during course setup
- **Updated** `CourseCreate` to include optional `modules` list

```python
class ModuleInput(BaseModel):
    """Module input for course creation"""
    title: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    """Course creation without courseid - will be auto-generated"""
    modules: Optional[List[ModuleInput]] = []
```

#### 2. Updated CRUD (`instructor/crud.py`)
- **Modified** `CourseCRUD.create()` to auto-generate course IDs
- Course IDs now follow pattern: `COURSE_XXXXXXXXXX` (10 random hex chars)

```python
courseid = f"COURSE_{uuid.uuid4().hex[:10].upper()}"
```

#### 3. Updated Routes (`instructor/routes.py`)
- **Modified** `POST /courses` endpoint to:
  - Accept course data without `courseid`
  - Create modules from the provided `modules` list
  - Auto-generate module IDs: `{courseid}_MOD_{index}`
  - Initialize learning objectives for each module
  - Return `CourseWithModules` response

### Frontend Changes (UI)

#### 1. New Course Creation Page (`ui/app/instructor/courses/create/page.tsx`)

**Features:**
- ✅ **Course Information Form**
  - Course Name (required)
  - Course Description (textarea)
  - Target Audience (dropdown with predefined options)
  - Prerequisites (textarea)

- ✅ **Dynamic Modules Section**
  - Add/remove modules dynamically
  - Each module has title and description
  - Minimum 1 module required
  - "Add Another Module" button

- ✅ **File Upload Section**
  - Multiple file upload support
  - Accepted formats: PDF, DOC, DOCX, TXT, PPT, PPTX
  - Shows file list with sizes
  - Remove individual files option

- ✅ **Two-Step Creation Process**
  1. Create course with modules
  2. Upload files and attach to course

**Target Audience Options:**
- Elementary School
- Middle School
- High School
- Undergraduate
- Graduate
- Professional Development
- General Public

#### 2. Updated Dashboard (`ui/app/(instructor)/dashboard/page.tsx`)
- Changed "Create New Course" button link from `/upload` to `/instructor/courses/create`

#### 3. Updated API Helper (`ui/lib/instructor-api.ts`)
- Added `ModuleInput` interface
- Updated `createCourse()` function to accept `modules` parameter
- Removed `courseid` requirement from function signature

## API Changes

### Before:
```json
POST /api/v1/instructor/courses
{
  "courseid": "CS101",  // Required - instructor provided
  "course_name": "Introduction to CS",
  "coursedescription": "...",
  "targetaudience": "Undergraduate",
  "prereqs": "None"
}
```

### After:
```json
POST /api/v1/instructor/courses
{
  "course_name": "Introduction to CS",
  "coursedescription": "...",
  "targetaudience": "Undergraduate",  
  "prereqs": "None",
  "modules": [  // New - optional
    {
      "title": "Module 1: Introduction",
      "description": "Course overview"
    },
    {
      "title": "Module 2: Core Concepts",
      "description": "Main content"
    }
  ]
}
```

### Response:
```json
{
  "courseid": "COURSE_A1B2C3D4E5",  // Auto-generated
  "instructorid": "INST_123456789ABC",
  "course_name": "Introduction to CS",
  "coursedescription": "...",
  "targetaudience": "Undergraduate",
  "prereqs": "None",
  "created_at": "2025-10-10T...",
  "updated_at": "2025-10-10T...",
  "modules": [
    {
      "moduleid": "COURSE_A1B2C3D4E5_MOD_1",
      "courseid": "COURSE_A1B2C3D4E5",
      "title": "Module 1: Introduction",
      "description": "Course overview",
      "order_index": 0,
      ...
    },
    ...
  ]
}
```

## File Upload Process

After course creation, files are uploaded individually:

```
POST /api/v1/instructor/courses/{courseid}/upload
Content-Type: multipart/form-data

file: [binary data]
```

## How to Use

### As an Instructor:

1. **Navigate to Dashboard**
   - Go to `/instructor/dashboard`

2. **Click "Create New Course"**
   - This opens `/instructor/courses/create`

3. **Fill in Course Details**
   - Enter course name (required)
   - Add description
   - Select target audience from dropdown (required)
   - List prerequisites

4. **Add Modules**
   - At least one module with a title is required
   - Click "Add Another Module" to add more
   - Each module can have title and description

5. **Upload Materials (Optional)**
   - Select one or more files (PDF, DOC, PPT, etc.)
   - Files will be uploaded after course creation

6. **Submit**
   - Click "Create Course"
   - System will:
     - Create course with auto-generated ID
     - Create all modules
     - Upload all files
     - Redirect to courses list

## Testing

### Test Course Creation:

1. **Start Backend:**
   ```bash
   cd instructor
   python3 main.py
   ```

2. **Access UI:**
   - Navigate to `http://localhost:3002` (or your Next.js port)
   - Login as instructor
   - Click dashboard, then "Create New Course"

3. **Test Data:**
   ```
   Course Name: Introduction to Machine Learning
   Description: Learn ML fundamentals
   Target Audience: Undergraduate
   Prerequisites: Python, Linear Algebra

   Modules:
   1. Title: Introduction to ML | Description: Overview and basics
   2. Title: Supervised Learning | Description: Classification and regression
   3. Title: Neural Networks | Description: Deep learning basics

   Files: Upload sample PDF/DOC files
   ```

## Backend Running Status

✅ **Instructor Backend**: Running on `http://localhost:8001`
✅ **Learner Backend**: Running on `http://localhost:8000`  
✅ **Next.js UI**: Running on `http://localhost:3002`

## Notes

- Course IDs are now system-generated, ensuring uniqueness
- Modules are created in the order they're added (order_index: 0, 1, 2...)
- File uploads happen after course creation for better error handling
- Learning objectives are automatically initialized for each module
- Target audience is now a controlled dropdown to ensure consistency
