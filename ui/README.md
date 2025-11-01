
# UI Service - Learning Middleware Frontend

Next.js-based frontend providing interfaces for both learners and instructors.

## 🎯 Purpose

The UI service is the main user interface for the Learning Middleware platform, providing:
- **Learner Portal**: Course browsing, enrollment, module learning, quizzes
- **Instructor Portal**: Course creation, module management, analytics
- Modern, responsive design with real-time updates

## 🏗️ Architecture

```
ui/
├── app/                    # Next.js 15 app directory
│   ├── learner/           # Learner portal pages
│   │   ├── explore/       # Course browsing
│   │   ├── dashboard/     # Learner dashboard
│   │   └── course/        # Course and module views
│   ├── instructor/        # Instructor portal pages
│   │   ├── dashboard/     # Analytics dashboard
│   │   ├── courses/       # Course management
│   │   └── quiz/          # Quiz builder
│   └── api/               # API route handlers
├── components/            # Reusable React components
│   ├── ui/                # Base UI components (shadcn)
│   ├── learner/           # Learner-specific components
│   └── instructor/        # Instructor-specific components
├── lib/                   # Utilities and API clients
│   ├── learner-api.ts     # Learner service API client
│   ├── instructor-api.ts  # Instructor service API client
│   └── utils.ts           # Helper functions
└── public/                # Static assets
```

## 🚀 Quick Start

### Development Mode
```bash
cd ui
pnpm install
pnpm run dev
```
Access at: http://localhost:3000

### Production Build
```bash
pnpm build
pnpm start
```

## 🔌 API Integration

The UI connects to multiple backend services:

| Service | Environment Variable | Default |
|---------|---------------------|---------|
| Learner Service | `NEXT_PUBLIC_LEARNER_API_BASE_URL` | `http://localhost:5001` |
| Instructor Service | `NEXT_PUBLIC_INSTRUCTOR_API_BASE_URL` | `http://localhost:5002` |
| Orchestrator | `NEXT_PUBLIC_ORCHESTRATOR_API_BASE` | `http://localhost:8001` |

### Configuration (.env.local)
```bash
NEXT_PUBLIC_LEARNER_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_INSTRUCTOR_API_BASE_URL=http://localhost:5002
NEXT_PUBLIC_ORCHESTRATOR_API_BASE=http://localhost:8001
```

## 📚 Key Features

### Learner Features

#### 1. **Course Exploration** (`/learner/explore`)
- Browse available courses
- View course details and modules
- Enroll in courses

#### 2. **Learning Preferences Modal**
First time opening a module, learners set preferences:
- **Detail Level**: detailed, moderate, brief
- **Explanation Style**: examples-heavy, conceptual, practical, visual
- **Language**: simple, technical, balanced

These preferences are sent to SME service to generate personalized content.

#### 3. **Module Viewer** (`/learner/course/[courseid]/module/[moduleid]`)
Flow:
```
1. Check database for cached content
   ├─ Found? → Display immediately
   └─ Not found? → Show preferences modal
2. After preferences submitted:
   ├─ Save preferences to MongoDB
   ├─ Create empty content record (prevents form reappearing)
   ├─ Generate content via SME
   └─ Save content to PostgreSQL
3. Display personalized module content
4. User clicks "Continue to Quiz"
5. Check database for cached quiz
   ├─ Found? → Display immediately
   └─ Not found? → Generate via SME → Save to DB
6. Take quiz and submit
7. View results
```

#### 4. **Enhanced Markdown Rendering**
Features:
- Syntax highlighting for code blocks
- Mermaid diagram support
- Math equations (KaTeX)
- Tables, lists, headings

#### 5. **Progress Tracking**
- Module completion status
- Quiz scores
- Overall course progress

### Instructor Features

#### 1. **Course Management** (`/instructor/courses`)
- Create new courses
- Edit course details
- Add/remove modules
- Publish/unpublish courses

#### 2. **Module Creation**
For each module:
- Title and description
- Learning objectives (used by SME for content generation)
- Order/sequence

#### 3. **Course Materials Upload**
- Upload PDFs for RAG (used in quiz generation and chat)
- Materials stored in SME service's vector store

#### 4. **Analytics Dashboard**
- Learner progress tracking
- Quiz performance metrics
- Course enrollment stats

## 🎨 UI Components

### Base Components (`components/ui/`)
Built with shadcn/ui and Radix UI:
- `Button`, `Card`, `Input`, `Select`
- `Dialog`, `Alert`, `Badge`
- `Table`, `Tabs`, `Progress`

### Custom Components

#### Learner Components (`components/learner/`)
- **`LearningPreferencesModal`**: Collects learner preferences
- **`EnhancedMarkdown`**: Renders module content with features
- **`QuizQuestion`**: Quiz question display component

#### Instructor Components (`components/instructor/`)
- **`CourseCard`**: Display course in grid
- **`ModuleList`**: List modules with drag-to-reorder
- **`AnalyticsChart`**: Data visualization

## 🔐 Authentication

Uses JWT tokens stored in localStorage:

```typescript
// Login flow
1. User enters credentials
2. POST /api/learner/login or /api/instructor/login
3. Receive JWT token
4. Store in localStorage as 'learner_token' or 'instructor_token'
5. Include in all API requests via Authorization header
```

### API Client Example
```typescript
// lib/learner-api.ts
function getAuthHeader() {
  const token = localStorage.getItem('learner_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}
```

## 📡 API Client Functions

### Learner API (`lib/learner-api.ts`)

**Authentication:**
- `signupLearner(data)` - Create account
- `loginLearner(email, password)` - Get JWT token
- `getCurrentLearner()` - Get logged-in user

**Courses:**
- `getCourses()` - List all courses
- `getCourseModules(courseId)` - Get modules
- `enrollInCourse(courseId)` - Enroll

**Content:**
- `checkModuleContent(moduleId)` - Check cache
- `saveModuleContent(moduleId, courseId, content)` - Save to DB
- `generateModuleContent(...)` - Generate via SME

**Quizzes:**
- `checkModuleQuiz(moduleId)` - Check cache
- `saveModuleQuiz(moduleId, courseId, quizData)` - Save to DB
- `generateQuiz(content, moduleName, courseId)` - Generate via SME
- `submitQuiz(submission)` - Submit answers

**Preferences:**
- `updateLearningPreferences(courseId, prefs)` - Save to MongoDB
- `getLearningPreferences(courseId)` - Get from MongoDB

### Instructor API (`lib/instructor-api.ts`)

**Authentication:**
- `signupInstructor(data)`
- `loginInstructor(email, password)`

**Courses:**
- `createCourse(data)` - Create new course
- `getInstructorCourses()` - List instructor's courses
- `updateCourse(courseId, data)` - Update course

**Modules:**
- `createModule(courseId, data)` - Add module
- `updateModule(moduleId, data)` - Edit module
- `deleteModule(moduleId)` - Remove module

## 🐛 Debugging

### Check Browser Console
Look for prefixed logs:
- `[DEBUG]` - General debug info
- `[POLL]` - Content polling status
- `[GENERATE]` - Content generation
- `[SAVE]` - Database saves
- `[API]` - API call details
- `[ERROR]` - Errors

### Common Issues

**"Failed to fetch" errors:**
```bash
# Check if backend services are running
docker compose ps

# Check environment variables
cat .env.local

# Check browser console for CORS errors
```

**Content not appearing:**
```bash
# Check browser console for [GENERATE], [SAVE] logs
# Check learner service logs
docker compose logs -f learner

# Check orchestrator logs
docker compose logs -f learner-orchestrator
```

**Quiz timeout:**
- Quiz generation can take 2-3 minutes
- Frontend has 50-minute timeout to match backend
- Check SME service logs: `docker compose logs -f sme`

## 📊 State Management

Uses React hooks for state:
- `useState` - Local component state
- `useEffect` - Side effects and data fetching
- `useRouter` - Next.js navigation
- `useParams` - URL parameters

No global state management (Redux/Zustand) currently used.

## 🎨 Styling

- **Tailwind CSS** for utility classes
- **CSS Modules** for scoped styles
- **CSS Variables** for theming

### Color Scheme
```css
--primary: Slate
--accent: Blue
--success: Green
--error: Red
```

## 🧪 Testing Locally

```bash
# 1. Start backend services
cd ..
docker compose up -d

# 2. Start UI in dev mode
cd ui
pnpm dev

# 3. Test learner flow
Open http://localhost:3000
- Sign up as learner
- Browse courses
- Enroll
- Open module → Set preferences
- View generated content
- Take quiz

# 4. Test instructor flow
Open http://localhost:3000/instructor
- Sign up as instructor
- Create course
- Add modules with learning objectives
- Publish course
```

## 📦 Dependencies

Key packages:
```json
{
  "next": "15.x",
  "react": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "@radix-ui/*": "Latest",
  "lucide-react": "Latest",
  "react-markdown": "Latest",
  "rehype-katex": "Latest",
  "remark-gfm": "Latest",
  "mermaid": "Latest"
}
```

## 🚢 Deployment

### Docker Build
```bash
docker build -t lmw-ui .
docker run -p 3000:3000 lmw-ui
```

### Environment Variables for Production
```bash
NEXT_PUBLIC_LEARNER_API_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_INSTRUCTOR_API_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_ORCHESTRATOR_API_BASE=https://orchestrator.yourapp.com
```

## 📝 Code Style

- **TypeScript** for type safety
- **ESLint** for linting
- **Prettier** for formatting
- Component naming: PascalCase
- File naming: kebab-case
- Use async/await over promises

## 🔄 Data Flow Example

**Module Content Generation:**
```
UI Component (page.tsx)
  ↓ calls
lib/learner-api.ts → generateModuleContent()
  ↓ POST
Orchestrator → /api/orchestrator/sme/generate-module
  ↓ calls
SME Service → /generate-module (LLM generation)
  ↓ returns
Generated Content (Markdown)
  ↓ saved via
lib/learner-api.ts → saveModuleContent()
  ↓ POST
Learner Service → /api/learner/module/{id}/content
  ↓ stores in
PostgreSQL → GeneratedModuleContent table
```

## 📞 Support

For UI-specific issues:
- Check browser console
- Check Network tab for failed requests
- Verify environment variables
- Ensure backend services are running