# UI Restructuring Guide - Learning Middleware iREL

## 📋 Overview

This document outlines the restructured UI architecture to properly separate **Learner** and **Instructor** roles, aligning with the backend microservices architecture.

---

## 🏗️ New Structure

### **Before (Inconsistent)**
```
/app
├── learner/          # Learner routes (nested)
├── dashboard/        # Instructor (root level)
├── courses/          # Instructor (root level)
├── upload/           # Instructor (root level)
├── editor/           # Instructor (root level)
└── ...               # Mixed routes
```

### **After (Organized)**
```
/app
├── page.tsx                    # Landing/redirect based on role
├── signin/                     # Authentication
│
├── learner/                    # 🎓 LEARNER ROUTES
│   ├── page.tsx               # Learner dashboard
│   ├── explore/               # Browse available courses
│   └── course/[id]/           # Course learning experience
│       ├── page.tsx           # Course overview
│       └── module/[moduleId]/ # Module content
│
├── instructor/                 # 👨‍🏫 INSTRUCTOR ROUTES
│   ├── dashboard/             # Instructor dashboard (copied from /dashboard)
│   ├── courses/               # Course management (copied from /courses)
│   │   └── [id]/history/      # Course version history
│   ├── course/[id]/           # Course details (copied from /course)
│   ├── upload/                # Course creation (copied from /upload)
│   ├── editor/                # Course editor (copied from /editor)
│   ├── quiz/                  # Quiz designer (copied from /quiz)
│   ├── assignment/            # Assignment designer (copied from /assignment)
│   └── library/               # Resource library (copied from /library)
│
└── shared/                     # 🔗 SHARED ROUTES (accessible by both)
    ├── profile/               # User profile
    └── chat/                  # AI chat assistant
```

---

## 🔑 Role-Based Access Control

### **Middleware (`middleware.ts`)**

The updated middleware now:
1. **Checks authentication** via `googleId` cookie
2. **Determines user role** via `user_role` cookie (`'learner'` or `'instructor'`)
3. **Redirects based on role**:
   - Learner → `/learner`
   - Instructor → `/instructor/dashboard`
4. **Protects routes**:
   - `/instructor/*` routes require `instructor` role
   - Old routes redirect to new structure

### **Expected Cookies**
```typescript
googleId: string      // User's Google ID (authentication)
user_role: string     // 'learner' | 'instructor' (authorization)
user_id: string       // User's database ID
```

---

## 🔄 Migration Status

### ✅ **Completed**
- [x] Created `/instructor` folder structure
- [x] Created `/shared` folder structure
- [x] Copied instructor pages to `/instructor/*`
- [x] Copied shared pages to `/shared/*`
- [x] Updated middleware with role-based routing
- [x] Created documentation

### 🚧 **TODO - Phase 1: Update Route References**

All internal navigation links need updating:

#### **1. Update Instructor Components**
Files to update (search for old routes and replace):
- `/instructor/dashboard/page.tsx` - Update nav links
- `/instructor/courses/page.tsx` - Update course links
- `/instructor/upload/page.tsx` - Update save/redirect paths
- `/instructor/editor/page.tsx` - Update navigation
- Components in `/components/`:
  - `app-header.tsx` - Update navigation links
  - `app-sidebar.tsx` - Update menu items
  - `header.tsx` - Update route references

**Find & Replace:**
```tsx
// OLD → NEW
'/dashboard'     → '/instructor/dashboard'
'/courses'       → '/instructor/courses'
'/course/'       → '/instructor/course/'
'/upload'        → '/instructor/upload'
'/editor'        → '/instructor/editor'
'/quiz'          → '/instructor/quiz'
'/assignment'    → '/instructor/assignment'
'/library'       → '/instructor/library'
'/profile'       → '/shared/profile'
'/chat'          → '/shared/chat'
```

#### **2. Update Learner Components**
Files already use `/learner/*` prefix - minimal changes needed:
- Verify links in `/learner/page.tsx`
- Update shared route references (`/profile` → `/shared/profile`)

#### **3. Update API Calls**
Ensure API endpoints remain unchanged:
- Backend APIs still at: `http://10.4.25.215:8000/api/*`
- Learner service: `http://localhost:8000/*`
- Instructor service: `http://localhost:8001/*`

### 🚧 **TODO - Phase 2: Authentication Updates**

Update signin flow to set `user_role` cookie:

**File:** `/app/signin/page.tsx`
```typescript
// After successful authentication, determine role and set cookie
const role = determineUserRole(userData); // 'learner' or 'instructor'
document.cookie = `user_role=${role}; path=/;`;
```

**File:** `/app/api/auth/signin/route.ts` (if using API route)
```typescript
response.cookies.set('user_role', role, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});
```

### 🚧 **TODO - Phase 3: Remove Old Routes**

Once migration is verified:
```bash
# Remove old instructor routes (after testing)
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
```

---

## 🔌 SME Integration Points

### **SME Services Overview**

Located in `/sme/` folder:

#### **1. Chat Service** (`/sme/chat/`)
- **Purpose:** RAG-based chatbot for Q&A
- **Tech:** FAISS vector store + vLLM
- **Main File:** `main.py`
- **Integration:** Use in `/shared/chat/page.tsx`

```python
# API endpoint example
POST /sme/chat
{
  "query": "What is machine learning?",
  "course_context": "Data Science 101"
}
```

#### **2. Learning Objectives Generator** (`/sme/lo_gen/`)
- **Purpose:** Generate learning objectives for modules
- **Tech:** Vector store retrieval + LLM generation
- **Main File:** `main.py` (633 lines)
- **Integration:** Use in `/instructor/upload/page.tsx` during course creation

```python
# Key functions
def generate_learning_objectives(module_name, course_context, num_objectives)
def extract_key_concepts(course_materials)
```

#### **3. Module Content Generator** (`/sme/module_gen/`)
- **Purpose:** Generate structured lesson content
- **Tech:** LO-based retrieval + content generation
- **Main File:** `main.py` (585 lines)
- **Integration:** Use in `/instructor/editor/page.tsx` for content generation

```python
# Key functions
def generate_module_content(module_name, learning_objectives, user_preferences)
def retrieve_context_for_objectives(vector_store, objectives)
```

### **Common SME Configuration**

All SME services use:
- **Config:** `/sme/conf/config.yaml`
- **Vector Store:** `/sme/data/vector_store/` (FAISS index)
- **Documents:** `/sme/data/docs/` (PDF textbooks)
- **vLLM Client:** Custom inference client

---

## 🎯 Next Steps for Integration

### **Phase 1: UI Navigation** (Immediate)
1. Update all `<Link>` components to use new routes
2. Update `useRouter().push()` calls
3. Test navigation flows for both roles

### **Phase 2: Authentication** (High Priority)
1. Implement role detection in signin flow
2. Set `user_role` cookie appropriately
3. Create role selection UI (if users can be both)

### **Phase 3: SME Integration** (Future)
1. **Chat Integration:**
   - Add SME chat API calls to `/shared/chat/page.tsx`
   - Stream responses using vLLM client

2. **LO Generation:**
   - Connect `/instructor/upload/page.tsx` to LO generator
   - Display generated objectives for review

3. **Module Generation:**
   - Integrate module gen in `/instructor/editor/page.tsx`
   - Allow AI-assisted content creation

### **Phase 4: Testing & Cleanup** (Final)
1. Test all routes with both roles
2. Verify middleware redirects
3. Remove old route folders
4. Update documentation

---

## 📝 Code Examples

### **Example: Updated Navigation Component**

```tsx
// components/instructor-nav.tsx
import Link from 'next/link';

export function InstructorNav() {
  return (
    <nav>
      <Link href="/instructor/dashboard">Dashboard</Link>
      <Link href="/instructor/courses">My Courses</Link>
      <Link href="/instructor/upload">Create Course</Link>
      <Link href="/instructor/library">Library</Link>
      <Link href="/shared/profile">Profile</Link>
      <Link href="/shared/chat">AI Assistant</Link>
    </nav>
  );
}
```

### **Example: Role-Based Layout**

```tsx
// app/instructor/layout.tsx
export default function InstructorLayout({ children }) {
  return (
    <div>
      <InstructorNav />
      <main>{children}</main>
    </div>
  );
}

// app/learner/layout.tsx
export default function LearnerLayout({ children }) {
  return (
    <div>
      <LearnerNav />
      <main>{children}</main>
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### **Issue: Redirects not working**
- Check `user_role` cookie is set
- Verify middleware matcher patterns
- Check browser console for redirect loops

### **Issue: 404 on old routes**
- Update all hardcoded route references
- Clear Next.js cache: `rm -rf .next`
- Restart dev server

### **Issue: SME services not responding**
- Check if SME services are running
- Verify vector store exists: `/sme/data/vector_store/`
- Check vLLM client configuration in `/sme/conf/config.yaml`

---

## 📚 Related Files

- **Middleware:** `/middleware.ts`
- **Backend Learner:** `/learner/routes.py`
- **Backend Instructor:** `/instructor/routes.py`
- **Backend Orchestrator:** `/learner-orchestrator/routes.py`
- **SME Services:** `/sme/*/main.py`

---

## ✅ Verification Checklist

Before going to production:

- [ ] All navigation links updated
- [ ] Role-based middleware tested
- [ ] Both learner and instructor flows work
- [ ] API integrations unchanged
- [ ] Old routes removed
- [ ] Documentation updated
- [ ] SME integration planned
- [ ] Error handling in place
- [ ] Mobile responsive verified
- [ ] Performance tested

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0
**Author:** GitHub Copilot
