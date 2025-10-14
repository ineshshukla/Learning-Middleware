# Learner Module Learning Flow - Complete Implementation Guide

## 🎯 Overview

This document describes the complete learner journey through course modules with personalized content generation, quizzes, and adaptive preferences.

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LEARNER JOURNEY FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Learner Explores Courses → 2. Enrolls with Initial Preferences
                                     ↓
                              3. Clicks "Continue Learning"
                                     ↓
                         4. Views Module List (Current + Previous Accessible)
                                     ↓
                              5. Clicks on Module
                                     ↓
                    6. AI Generates Personalized Module Content
                                     ↓
                         7. Learner Studies Module
                                     ↓
                              8. Takes Quiz
                                     ↓
                          9. Updates Preferences
                                     ↓
                        10. Next Module Generated
```

## 🗂️ File Structure

```
ui/
├── app/learner/
│   ├── explore/page.tsx              # Browse & enroll in courses
│   └── course/
│       └── [courseid]/
│           ├── page.tsx               # Module list view (✅ NEW)
│           └── module/
│               └── [moduleid]/
│                   └── page.tsx       # Module learning page (✅ NEW)
│
├── components/learner/
│   └── learning-preferences-modal.tsx # Preferences collection (✅ UPDATED)
│
└── lib/
    └── learner-api.ts                 # API client functions (✅ EXTENDED)
```

## 🔄 Complete User Flow

### Phase 1: Course Enrollment (Already Implemented)

**File**: `ui/app/learner/explore/page.tsx`

1. Learner browses available courses
2. Clicks "Enroll Now"
3. **Learning Preferences Modal** appears with 3 questions:
   - **Detail Level**: `detailed` | `moderate` | `brief`
   - **Explanation Style**: `examples-heavy` | `conceptual` | `practical` | `visual`
   - **Language**: `simple` | `balanced` | `technical`
4. Preferences saved to MongoDB via Orchestrator API
5. Learner enrolled in course

**APIs Used**:
- `PUT /api/orchestrator/preferences` - Save initial preferences
- `POST /api/v1/learner/auth/enroll` - Enroll in course

---

### Phase 2: Module List View (✅ NEW)

**File**: `ui/app/learner/course/[courseid]/page.tsx`

**Route**: `/learner/course/{courseid}`

**Features**:
- Displays all course modules
- Shows overall progress bar
- **Module Accessibility Logic**:
  - ✅ **First module**: Always accessible
  - ✅ **Current module**: Accessible
  - ✅ **Completed modules**: Accessible (marked with green checkmark)
  - ❌ **Future modules**: Locked (shown with lock icon)

**Visual Indicators**:
- 🟢 **Completed**: Green badge with CheckCircle icon
- 🔵 **Current**: Blue "Current" badge
- 🟡 **In Progress**: Yellow badge
- 🔒 **Locked**: Gray badge with Lock icon

**APIs Used**:
- `GET /api/v1/learner/auth/progress/{course_id}` - Get course progress
- `GET /api/v1/learner/auth/courses/{course_id}` - Get course modules

**Code Example**:
```typescript
const isModuleAccessible = (moduleIndex: number, moduleId: string): boolean => {
  if (moduleIndex === 0) return true; // First module always accessible
  if (courseProgress?.currentmodule === moduleId) return true;
  
  const moduleProgress = getModuleProgress(moduleId);
  if (moduleProgress?.status === "completed") return true;
  
  return false;
};
```

---

### Phase 3: Module Learning Page (✅ NEW)

**File**: `ui/app/learner/course/[courseid]/module/[moduleid]/page.tsx`

**Route**: `/learner/course/{courseid}/module/{moduleid}`

#### 3.1 Content Generation

**State**: `generating`

1. Get learner ID from session
2. Fetch module metadata (title, description)
3. Update module status to `in_progress`
4. **Generate personalized content** via SME:
   ```typescript
   const result = await generateModuleContent(
     courseid,
     learnerId,
     moduleName,
     learningObjectives
   );
   ```
5. Content rendered in Markdown format

**APIs Used**:
- `POST /api/orchestrator/sme/generate-module` - Generate module content
  - Uses learner's saved preferences
  - Calls SME service with user profile
  - Returns personalized Markdown content

**Visual**: Loading spinner with "Generating Personalized Content"

---

#### 3.2 Module Study

**State**: `module`

- Display generated content in Markdown format (uses `react-markdown`)
- Learner reads and studies the material
- **"Continue to Quiz"** button at bottom

**UI Components**:
- Card with BookOpen icon
- Prose-styled content area
- Navigation button

---

#### 3.3 Quiz Generation & Taking

**State**: `quiz`

1. Click "Continue to Quiz"
2. **Generate quiz** from module content:
   ```typescript
   const quizData = await generateQuiz(moduleContent, moduleName);
   ```
3. Display quiz questions with radio button options
4. Learner selects answers
5. Click "Submit Quiz"

**APIs Used**:
- `POST /api/orchestrator/sme/generate-quiz` - Generate quiz from content
- `POST /api/orchestrator/quiz/submit` - Submit answers and get score

**Quiz Structure**:
```typescript
interface Quiz {
  module_name: string;
  questions: Array<{
    questionNo: string;
    question: string;
    options: string[];
    correctAnswer?: string;
  }>;
}
```

---

#### 3.4 Quiz Result

**State**: `quiz-result`

- Show score: `X out of Y (Z%)`
- Display progress bar
- Status: `passed` | `failed`
- **"Continue"** button to update preferences

**Visual**:
- ✅ Green card for passed
- ⚠️ Yellow card for completed but low score

---

#### 3.5 Preference Update (Feedback)

**State**: `preferences`

1. **Learning Preferences Modal** opens (same as enrollment but `isUpdate=true`)
2. Modal title: "Update Your Learning Preferences"
3. Description: "Great job completing the module! Let's update your preferences..."
4. Same 3 questions as initial enrollment
5. Submit button: "Update & Continue"

**Purpose**: Collect feedback on module experience to improve next module

**APIs Used**:
- `PUT /api/orchestrator/preferences` - Update preferences

---

#### 3.6 Module Completion & Next Module

After preference update:

1. Mark module as `completed` (100%)
2. Call complete module endpoint:
   ```typescript
   const nextModuleInfo = await completeModule(learnerId, courseid, moduleid);
   ```
3. **Check response**:
   - ✅ **Course Complete**: Show congratulations screen
   - ➡️ **Next Module Available**: Navigate to next module
   - 🔙 **No Next Module**: Return to course page

**APIs Used**:
- `PUT /api/v1/learner/auth/progress/module/{module_id}` - Update progress
- `POST /api/orchestrator/module/complete` - Complete & get next module

**Navigation**:
```typescript
if (nextModuleInfo.is_course_complete) {
  setFlowState("completed");
} else if (nextModuleInfo.next_module_id) {
  router.push(`/learner/course/${courseid}/module/${nextModuleInfo.next_module_id}`);
}
```

---

## 🔌 API Endpoints Reference

### Learner Service (Port 8002)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/learner/auth/me` | Get current learner |
| GET | `/api/v1/learner/auth/courses` | Get all published courses |
| POST | `/api/v1/learner/auth/enroll` | Enroll in course |
| GET | `/api/v1/learner/auth/progress/{course_id}` | Get course progress |
| GET | `/api/v1/learner/auth/courses/{course_id}` | Get course with modules |
| PUT | `/api/v1/learner/auth/progress/module/{module_id}` | Update module progress |

### Orchestrator Service (Port 8001)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/orchestrator/preferences` | Save/update preferences |
| GET | `/api/orchestrator/preferences/{learner_id}/{course_id}` | Get preferences |
| POST | `/api/orchestrator/sme/generate-module` | Generate module content |
| POST | `/api/orchestrator/sme/generate-quiz` | Generate quiz |
| POST | `/api/orchestrator/quiz/submit` | Submit quiz answers |
| POST | `/api/orchestrator/module/complete` | Complete module, get next |

### SME Service (Port 8000)

Called internally by orchestrator:
- `/generate_module` - Generate personalized content
- `/generate_quiz` - Create quiz from content

---

## 📦 Data Flow

### 1. Preference Storage (MongoDB)

```json
{
  "_id": {
    "CourseID": "COURSE_123",
    "LearnerID": "uuid-456"
  },
  "preferences": {
    "DetailLevel": "moderate",
    "ExplanationStyle": "examples-heavy",
    "Language": "balanced"
  },
  "lastUpdated": "2025-10-15T..."
}
```

### 2. Module Progress (PostgreSQL)

```sql
-- learnermoduleprogress table
id | learnerid | moduleid | status | progress_percentage | started_at | completed_at
```

**Status Values**:
- `not_started` - Default
- `in_progress` - Learner opened module
- `completed` - Quiz passed & preferences updated

### 3. Course Content Progress (PostgreSQL)

```sql
-- coursecontent table
id | courseid | learnerid | currentmodule | status
```

**Current Module**: Tracks which module learner is on

---

## 🎨 UI Components

### 1. Learning Preferences Modal

**File**: `ui/components/learner/learning-preferences-modal.tsx`

**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (preferences: LearningPreferences) => Promise<void>;
  courseName: string;
  isUpdate?: boolean; // ✅ NEW: Changes title & button text
}
```

**States**:
- Initial enrollment: `isUpdate=false`
  - Title: "Personalize Your Learning Experience"
  - Button: "Save & Enroll in Course"
- After quiz: `isUpdate=true`
  - Title: "Update Your Learning Preferences"
  - Button: "Update & Continue"

---

## 🚀 Testing the Flow

### Step-by-Step Test

1. **Login as Learner**
   - Go to `/learner/auth`
   - Login with credentials

2. **Browse Courses**
   - Go to `/learner/explore`
   - Switch to "Available Courses" tab

3. **Enroll in Course**
   - Click "Enroll Now" on any course
   - Fill out 3 preference questions
   - Click "Save & Enroll in Course"

4. **View Modules**
   - Switch to "My Courses" tab
   - Click "Continue Learning"
   - See module list with first module unlocked

5. **Start First Module**
   - Click on Module 1
   - Wait for AI content generation
   - Read generated content

6. **Take Quiz**
   - Click "Continue to Quiz"
   - Answer all questions
   - Submit quiz

7. **Update Preferences**
   - See quiz results
   - Click "Continue"
   - Update preferences in modal
   - Click "Update & Continue"

8. **Next Module**
   - Automatically navigates to Module 2
   - Process repeats...

---

## ⚙️ Environment Variables

**File**: `ui/.env.local`

```env
NEXT_PUBLIC_LEARNER_API_URL=http://localhost:8002
NEXT_PUBLIC_ORCHESTRATOR_API_URL=http://localhost:8001
```

---

## 🐛 Troubleshooting

### Issue: "Failed to generate module content"

**Cause**: SME service not running or unreachable

**Solution**:
```bash
docker logs -f lmw_sme
# Check if SME service is running on port 8000
curl http://localhost:8000/health
```

### Issue: "Module locked" / Can't access module

**Cause**: Previous module not completed

**Solution**: 
- Complete previous modules first
- Check `learnermoduleprogress` table
- Ensure `status='completed'` for previous module

### Issue: Preferences not saving

**Cause**: Orchestrator or MongoDB connection issue

**Solution**:
```bash
docker logs -f lmw_learner_orchestrator
# Check MongoDB connection
docker exec -it lmw_mongodb mongosh
> use lmw
> db.coursecontent_pref.find()
```

### Issue: Quiz not generating

**Cause**: Module content empty or SME service error

**Solution**:
- Verify module content was generated
- Check SME service logs
- Ensure quiz generation endpoint is working

---

## 📈 Future Enhancements

1. **Progress Tracking**:
   - Time spent on each module
   - Analytics dashboard

2. **Quiz Features**:
   - Retry quiz option
   - Explanations for wrong answers
   - Adaptive difficulty

3. **Content Features**:
   - Bookmark sections
   - Note-taking
   - Video content integration

4. **Preference Refinement**:
   - More granular preferences
   - ML-based preference prediction
   - A/B testing different content styles

---

## ✅ Summary

This implementation provides a complete learner journey with:

- ✅ **Personalized Content**: AI-generated based on preferences
- ✅ **Adaptive Learning**: Preferences update after each module
- ✅ **Progressive Unlocking**: Only current + completed modules accessible
- ✅ **Quiz Assessment**: Knowledge verification after each module
- ✅ **Feedback Loop**: Continuous preference refinement
- ✅ **Clean UX**: Smooth flow from enrollment to completion

**Key Technologies**:
- React/Next.js for UI
- FastAPI for backend services
- PostgreSQL for structured data
- MongoDB for preferences/content
- LLM (via SME) for content generation
