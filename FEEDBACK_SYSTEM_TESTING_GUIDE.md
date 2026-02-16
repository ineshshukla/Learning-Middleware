# Module & Quiz Feedback System - Testing Guide

## ✅ Implementation Complete!

The comprehensive feedback and rating system has been successfully implemented with proper flow control. Here's what was built:

---

## 🎯 New Learning Flow

### **Before** (Old Flow):
```
Read Module → Click "Take Quiz" → Quiz Loads → Complete Quiz → Next Module
```

### **After** (New Flow with Feedback):
```
Read Module 
  ↓
Click "Take Quiz to Complete"
  ↓
🌟 MODULE FEEDBACK MODAL appears
  - Rate 1-5 stars
  - Optional text feedback
  - Can Submit or Skip
  ↓
Quiz generates (in background during feedback)
  ↓
Complete Quiz → See Results
  ↓
Click "Continue"
  ↓
🌟 QUIZ FEEDBACK MODAL appears
  - Rate 1-5 stars
  - Optional text feedback
  - Includes quiz score
  - Can Submit or Skip
  ↓
Next Module (with preferences if new module)
```

---

## 📦 What Was Built

### **1. Database Schema** ✅
- **ModuleFeedback table**: Stores learner ratings and feedback for modules
- **QuizFeedback table**: Stores learner ratings and feedback for quizzes
- Both tables include:
  - Rating (1-5 stars)
  - Optional text feedback (max 2000 chars)
  - Learner, course, module references
  - Timestamps for reporting

**Verify tables exist:**
```sql
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database \
  -c "SELECT COUNT(*) FROM ModuleFeedback;"

docker exec -it lmw_postgres psql -U lmw_user -d lmw_database \
  -c "SELECT COUNT(*) FROM QuizFeedback;"
```

### **2. Backend API** ✅
**New Endpoints:**
- `POST /module-feedback` - Submit module feedback
- `GET /module-feedback/{moduleid}` - Get learner's module feedback
- `GET /admin/module-feedback/course/{courseid}` - Get all module feedbacks for course
- `GET /admin/module-feedback/stats` - Get module feedback statistics

- `POST /quiz-feedback` - Submit quiz feedback
- `GET /quiz-feedback/{moduleid}` - Get learner's quiz feedback
- `GET /admin/quiz-feedback/course/{courseid}` - Get all quiz feedbacks for course
- `GET /admin/quiz-feedback/stats` - Get quiz feedback statistics

**View Swagger Docs:**
```
http://localhost:8002/docs
```
Scroll down to see the new feedback endpoints!

### **3. Frontend Components** ✅
- **FeedbackModal** ([ui/components/feedback-modal.tsx](../ui/components/feedback-modal.tsx))
  - Reusable modal with 5-star rating
  - Animated star hover effects
  - Optional text feedback
  - Submit and Skip buttons
  - Loading states
  - Glassmorphism design matching your theme

- **Integrated into Module Page** ([ui/app/learner/course/[courseid]/module/[moduleid]/page.tsx](../ui/app/learner/course/[courseid]/module/[moduleid]/page.tsx))
  - Module feedback triggers before quiz generation
  - Quiz feedback triggers after quiz completion, before next module
  - Quiz generates in background while learner fills feedback

---

## 🧪 How to Test

### **Step 1: Start Fresh**
```bash
cd /home/bhavyaahuja/code/iREL/LMW/Learning-Middleware-iREL
docker compose -f docker-compose.dev.yml restart learner ui
```

### **Step 2: Test Module Feedback Flow**

1. **Navigate to a module:**
   ```
   http://localhost:3000/learner/course/YOUR_COURSE_ID/module/YOUR_MODULE_ID
   ```

2. **Complete reading the module content**
   - Scroll through all pages
   - Click "Next" to see all content

3. **Click "Take Quiz to Complete"**
   - ✅ **MODULE FEEDBACK MODAL should appear**
   - Should show: "How was this module?"
   - Should show 5 stars for rating

4. **Test Star Rating:**
   - Hover over stars → they should turn orange
   - Click a star → it should stay orange
   - Change your mind → click different star

5. **Test Feedback Text (Optional):**
   - Type feedback in text area
   - Should see character counter (0/2000)

6. **Test Submit:**
   - Click "Submit Feedback"
   - Should show loading spinner
   - Modal should close
   - Quiz should appear (generated during feedback)

7. **Alternative: Test Skip:**
   - Click "Skip" instead
   - Modal should close immediately
   - Quiz should generate and appear

### **Step 3: Test Quiz Feedback Flow**

1. **Complete the quiz:**
   - Answer all questions
   - Click "Submit Quiz"
   - See quiz results

2. **Click "Continue"**
   - ✅ **QUIZ FEEDBACK MODAL should appear**
   - Should show: "How was the quiz?"
   - Should show 5 stars for rating

3. **Submit Quiz Feedback:**
   - Rate the quiz
   - Add optional text feedback
   - Click "Submit Feedback" or "Skip"
   - Should navigate to next module OR course page (if last module)

### **Step 4: Verify Backend Storage**

**Check Module Feedback:**
```sql
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c \
  "SELECT id, learnerid, courseid, moduleid, rating, LEFT(feedback_text, 50) as feedback, created_at 
   FROM ModuleFeedback 
   ORDER BY created_at DESC 
   LIMIT 5;"
```

**Check Quiz Feedback:**
```sql
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c \
  "SELECT id, learnerid, courseid, moduleid, rating, quiz_score, LEFT(feedback_text, 50) as feedback, created_at 
   FROM QuizFeedback 
   ORDER BY created_at DESC 
   LIMIT 5;"
```

**Get Feedback Statistics:**
```bash
# Module feedback stats
curl -s "http://localhost:8002/api/v1/learner/admin/module-feedback/stats" | jq .

# Quiz feedback stats
curl -s "http://localhost:8002/api/v1/learner/admin/quiz-feedback/stats" | jq .
```

---

## 🎨 UI Features

### **Feedback Modal Design:**
- ✅ Centered modal with backdrop blur
- ✅ Warm orange stars matching your color scheme (#ff9f6b)
- ✅ Animated hover effects (stars scale up)
- ✅ Loading states with spinner
- ✅ Disabled state when submitting
- ✅ Character counter for text feedback
- ✅ Skip button for quick progression
- ✅ Close button (X) in top-right

### **Modal States:**
- **Idle**: User can interact with stars and text
- **Submitting**: Shows loading spinner, all inputs disabled
- **Generating Quiz** (Module Feedback): "Submitting..." while quiz generates
- **Navigating** (Quiz Feedback): "Submitting..." while navigating to next module

---

## 🔍 What Changed in the Code

### **Database:**
- [database/migrations/create_module_feedback_table.sql](../database/migrations/create_module_feedback_table.sql)
- [database/migrations/create_quiz_feedback_table.sql](../database/migrations/create_quiz_feedback_table.sql)

### **Backend (learner service):**
- [learner/models.py](../learner/models.py) - Added ModuleFeedback and QuizFeedback models
- [learner/schemas.py](../learner/schemas.py) - Added feedback request/response schemas
- [learner/crud.py](../learner/crud.py) - Added ModuleFeedbackCRUD and QuizFeedbackCRUD classes
- [learner/routes.py](../learner/routes.py) - Added 8 new feedback endpoints

### **Frontend:**
- [ui/components/feedback-modal.tsx](../ui/components/feedback-modal.tsx) - New reusable modal component
- [ui/lib/learner-api.ts](../ui/lib/learner-api.ts) - Added submitModuleFeedback() and submitQuizFeedback()
- [ui/app/learner/course/[courseid]/module/[moduleid]/page.tsx](../ui/app/learner/course/[courseid]/module/[moduleid]/page.tsx) - Integrated feedback modals into learning flow

---

## 📊 Reporting & Analytics

### **Get All Feedbacks for a Course:**
```bash
# Module feedbacks
curl -s "http://localhost:8002/api/v1/learner/admin/module-feedback/course/YOUR_COURSE_ID?limit=100"

# Quiz feedbacks
curl -s "http://localhost:8002/api/v1/learner/admin/quiz-feedback/course/YOUR_COURSE_ID?limit=100"
```

### **Get Feedback Statistics:**
```bash
# Average ratings, distribution, etc.
curl -s "http://localhost:8002/api/v1/learner/admin/module-feedback/stats?courseid=YOUR_COURSE_ID" | jq .

# Returns:
# {
#   "total_feedbacks": 10,
#   "average_rating": 4.2,
#   "rating_distribution": {
#     "1": 0,
#     "2": 1,
#     "3": 2,
#     "4": 3,
#     "5": 4
#   }
# }
```

### **Export to CSV:**
```bash
# Module feedback
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c \
  "COPY (SELECT * FROM ModuleFeedback) TO STDOUT WITH CSV HEADER" > module_feedback.csv

# Quiz feedback
docker exec -it lmw_postgres psql -U lmw_user -d lmw_database -c \
  "COPY (SELECT * FROM QuizFeedback) TO STDOUT WITH CSV HEADER" > quiz_feedback.csv
```

---

## ⚠️ Important Notes

### **Skip Functionality:**
- Users can click "Skip" to bypass feedback
- No feedback is stored in database when skipped
- Flow continues normally (quiz generates or next module loads)

### **Upsert Behavior:**
- If learner submits feedback twice for same module/quiz, it UPDATES the existing feedback
- One feedback record per learner per module (enforced by UNIQUE constraint)

### **Quiz Generation Timing:**
- Quiz starts generating **while** learner fills out module feedback
- This provides seamless experience - quiz is ready when feedback is submitted
- If user skips, quiz generates immediately

### **API Authentication:**
- All `/module-feedback` and `/quiz-feedback` endpoints require learner authentication
- Admin endpoints (`/admin/*`) have NO authentication (should be protected in production)

---

## 🐛 Troubleshooting

### **Modal doesn't appear:**
1. Check browser console for errors
2. Verify flowState changes: Open React DevTools
3. Check that you clicked "Take Quiz to Complete" button

### **Feedback not saving:**
1. Check browser Network tab for failed POST requests
2. Check learner service logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f learner
   ```
3. Verify authentication token is valid

### **Quiz doesn't load after feedback:**
1. Check if quiz generation failed (see learner logs)
2. Verify SME service is running:
   ```bash
   docker compose -f docker-compose.dev.yml ps sme
   ```

---

## ✅ Success Criteria

The implementation is successful if:

1. ✅ After reading module content, clicking "Take Quiz" shows feedback modal
2. ✅ Can rate 1-5 stars with hover effects
3. ✅ Can submit feedback with or without text
4. ✅ Can skip feedback
5. ✅ Quiz appears after feedback submission/skip
6. ✅ After completing quiz, clicking "Continue" shows quiz feedback modal
7. ✅ Quiz feedback includes quiz score context
8. ✅ After quiz feedback, navigates to next module or course page
9. ✅ All feedbacks are stored in PostgreSQL with correct learner/course/module IDs
10. ✅ No TypeScript or runtime errors

---

## 🚀 Next Steps (Optional Enhancements)

1. **Add feedback trends chart** in instructor dashboard
2. **Show average module ratings** on course overview page
3. **Filter modules by rating** (show highly-rated content first)
4. **Email notifications** to instructors when module gets low rating
5. **Sentiment analysis** on text feedback
6. **Export feedback reports** as PDF

---

## 📝 Testing Checklist

- [ ] Module feedback modal appears after clicking "Take Quiz"
- [ ] Star rating works (hover effects, click to select)
- [ ] Text feedback is optional
- [ ] Submit button is disabled until rating is selected
- [ ] Skip button works and closes modal
- [ ] Quiz generates and appears after feedback
- [ ] Quiz feedback modal appears after quiz completion
- [ ] Quiz feedback shows quiz score context
- [ ] Backend stores module feedback in database
- [ ] Backend stores quiz feedback in database
- [ ] Can retrieve feedbacks via API endpoints
- [ ] Statistics endpoints return correct averages
- [ ] No console errors during entire flow

---

**Ready to test! Refresh your browser and start a module!** 🎉
