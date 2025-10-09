# Instructor Authentication Integration

## Overview
This document describes the integration of the instructor backend authentication system with the UI, replacing Google OAuth for instructors.

## Changes Made

### 1. New Instructor Authentication Page
**Location:** `/ui/app/instructor/auth/page.tsx`

- Custom login/signup form for instructors
- Uses instructor backend API endpoints (`/api/v1/instructor/login` and `/api/v1/instructor/signup`)
- Stores JWT token in cookies for authentication
- Separate tabs for Login and Sign Up
- Form validation and error handling

### 2. Updated Landing Page
**Location:** `/ui/app/page.tsx`

**Changes:**
- Removed global "Log In" and "Sign Up" buttons from navigation
- Removed Google OAuth auto-login logic
- Updated "For Tutors" button to redirect to `/instructor/auth` instead of `/dashboard`
- "For Learners" button still uses Google OAuth via `/signin`

### 3. Updated Middleware
**Location:** `/ui/middleware.ts`

**Changes:**
- Added support for instructor token-based authentication
- Separate authentication checks for instructors (JWT token) and learners (Google OAuth)
- Public paths: `/`, `/signin`, `/instructor/auth`
- Protected `/instructor/*` routes - require instructor token
- Protected `/learner/*` routes - require Google OAuth
- Proper redirects based on authentication state and user role

### 4. Enhanced Sign Out Component
**Location:** `/ui/components/signout-button.tsx`

**Changes:**
- Detects user role (instructor vs learner)
- For instructors: clears instructor_token and redirects to `/instructor/auth`
- For learners: performs Google sign out and redirects to `/signin`
- Handles both authentication methods gracefully

### 5. Instructor API Utility
**Location:** `/ui/lib/instructor-api.ts`

**New file with helper functions:**
- `loginInstructor()` - Login with instructor credentials
- `signupInstructor()` - Create new instructor account
- `getCurrentInstructor()` - Get current instructor info
- `getInstructorCourses()` - Fetch all courses
- `getCourse()` - Get specific course details
- `createCourse()` - Create new course
- `uploadCourseFile()` - Upload course materials
- `getModuleObjectives()` - Get learning objectives
- `addModuleObjective()` - Add new learning objective

All API calls automatically include the JWT token from cookies.

### 6. Environment Variables
**Location:** `/ui/.env.local`

**Added:**
```env
NEXT_PUBLIC_INSTRUCTOR_API_URL=http://localhost:8001
```

**Note:** Update this URL to point to your instructor backend server.

## Authentication Flow

### Instructor Flow (New)
1. User clicks "For Tutors" on landing page → Redirects to `/instructor/auth`
2. User signs up or logs in with credentials
3. Backend returns JWT token
4. Token stored in `instructor_token` cookie, `user_role` set to "instructor"
5. User redirected to `/instructor/dashboard`
6. All subsequent requests include JWT token in Authorization header
7. Sign out clears token and redirects to `/instructor/auth`

### Learner Flow (Unchanged)
1. User clicks "For Learners" on landing page → Redirects to `/learner`
2. Middleware redirects to `/signin` (Google OAuth)
3. Google authentication via existing flow
4. `googleId` stored in cookie, `user_role` set to "learner"
5. User redirected to `/learner`
6. Sign out performs Google sign out and redirects to `/signin`

## Instructor Backend API Endpoints

### Authentication
- `POST /api/v1/instructor/signup` - Register new instructor
- `POST /api/v1/instructor/login` - Login and get JWT token
- `GET /api/v1/instructor/me` - Get current instructor info (requires auth)

### Courses
- `GET /api/v1/instructor/courses` - Get all instructor's courses
- `GET /api/v1/instructor/courses/{courseid}` - Get specific course
- `POST /api/v1/instructor/courses` - Create new course
- `POST /api/v1/instructor/courses/{courseid}/upload` - Upload course file
- `GET /api/v1/instructor/courses/{courseid}/files` - Get course files

### Modules & Learning Objectives
- `GET /api/v1/instructor/modules/{moduleid}/objectives` - Get objectives
- `POST /api/v1/instructor/modules/{moduleid}/objectives` - Add objective
- `PUT /api/v1/instructor/modules/{moduleid}/objectives` - Update objective
- `DELETE /api/v1/instructor/modules/{moduleid}/objectives/{objective_id}` - Delete objective

## Running the System

### 1. Start Instructor Backend
```bash
cd instructor
python main.py
```
The API will run on `http://localhost:8001`

### 2. Start UI
```bash
cd ui
npm run dev
# or
pnpm dev
```
The UI will run on `http://localhost:3000`

### 3. Update Environment Variables
If your instructor backend runs on a different host/port, update `.env.local`:
```env
NEXT_PUBLIC_INSTRUCTOR_API_URL=http://your-host:your-port
```

## Testing

### Test Instructor Signup
1. Go to `http://localhost:3000`
2. Click "For Tutors"
3. Click "Sign Up" tab
4. Fill in:
   - Instructor ID: `test_instructor_001`
   - Email: `test@example.com`
   - Password: `password123`
   - First Name: `John`
   - Last Name: `Doe`
5. Click "Create Account"
6. Should see success message and be redirected to login

### Test Instructor Login
1. Click "Login" tab
2. Enter credentials
3. Click "Login"
4. Should be redirected to `/instructor/dashboard`

### Test Protected Routes
1. Try accessing `/instructor/dashboard` without being logged in
2. Should be redirected to `/instructor/auth`
3. After login, should be able to access all `/instructor/*` routes

## Cookies Used

### Instructor Authentication
- `instructor_token` - JWT token from backend
- `instructor_id` - Instructor ID
- `user_role` - Set to "instructor"

### Learner Authentication (Existing)
- `googleId` - Google OAuth token
- `user_id` - User ID from learner backend
- `user_role` - Set to "learner"

## Security Considerations

1. **JWT Token Storage** - Tokens are stored in HTTP-only cookies (when possible) with proper expiration
2. **CORS** - Instructor backend has CORS enabled for the UI origin
3. **Password Requirements** - Minimum 6 characters (can be enhanced)
4. **Token Expiration** - Tokens expire after 30 minutes (configurable in backend)
5. **HTTPS** - In production, ensure all communication uses HTTPS

## Future Enhancements

1. **Refresh Tokens** - Implement token refresh mechanism
2. **Password Reset** - Add forgot password functionality
3. **Email Verification** - Verify instructor email addresses
4. **2FA** - Add two-factor authentication option
5. **Session Management** - Better session timeout handling
6. **Password Strength** - Enforce stronger password requirements
7. **Rate Limiting** - Add rate limiting to prevent brute force attacks

## Troubleshooting

### "Login failed" Error
- Check that instructor backend is running on correct port
- Verify `NEXT_PUBLIC_INSTRUCTOR_API_URL` in `.env.local`
- Check browser console for detailed error messages
- Verify instructor credentials exist in database

### Redirected to Auth Page After Login
- Check that JWT token is being stored in cookies
- Verify middleware is reading `instructor_token` cookie
- Check browser developer tools → Application → Cookies

### CORS Errors
- Ensure instructor backend CORS settings allow UI origin
- Check that `allow_origins=["*"]` or includes your UI URL

### Token Expired
- Tokens expire after 30 minutes by default
- User needs to log in again
- Consider implementing refresh token mechanism
