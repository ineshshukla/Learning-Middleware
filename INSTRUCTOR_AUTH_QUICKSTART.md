# Quick Start Guide - Instructor Authentication

## Step 1: Start the Instructor Backend

```bash
cd /code/Research/iREL/lmw_Final/Learning-Middleware-iREL/instructor
python main.py
```

The instructor API will start on `http://localhost:8001`

## Step 2: Start the UI

```bash
cd /code/Research/iREL/lmw_Final/Learning-Middleware-iREL/ui
npm run dev
# or
pnpm dev
```

The UI will start on `http://localhost:3000`

## Step 3: Test the Flow

### For Instructors:
1. Open browser to `http://localhost:3000`
2. Click **"For Tutors"** button
3. You'll be redirected to `/instructor/auth`

#### Sign Up (First Time):
1. Click **"Sign Up"** tab
2. Fill in the form:
   - **Instructor ID**: `instructor_001` (choose any unique ID)
   - **Email**: `your.email@example.com`
   - **First Name**: `John`
   - **Last Name**: `Doe`
   - **Password**: `password123` (minimum 6 characters)
   - **Confirm Password**: `password123`
3. Click **"Create Account"**
4. You should see a success message
5. After 2 seconds, it will switch to the Login tab

#### Login:
1. Click **"Login"** tab (if not already there)
2. Enter:
   - **Instructor ID**: `instructor_001`
   - **Password**: `password123`
3. Click **"Login"**
4. You'll be redirected to `/instructor/dashboard`

### For Learners:
1. Open browser to `http://localhost:3000`
2. Click **"For Learners"** button
3. You'll be redirected to `/learner` → `/signin`
4. Use the existing Google OAuth flow

## What Changed?

### ✅ Removed:
- Google OAuth for instructors
- Global "Log In" / "Sign Up" buttons from landing page
- Auto-login logic from landing page

### ✅ Added:
- Custom instructor authentication page at `/instructor/auth`
- JWT token-based authentication for instructors
- Separate auth flows for instructors and learners
- API utility functions for instructor backend integration

### ✅ Updated:
- Middleware now supports both Google OAuth (learners) and JWT tokens (instructors)
- Sign out button handles both authentication types
- Landing page "For Tutors" button redirects to `/instructor/auth`

## Important Files

### New Files:
- `/ui/app/instructor/auth/page.tsx` - Instructor login/signup page
- `/ui/lib/instructor-api.ts` - API helper functions
- `/ui/INSTRUCTOR_AUTH_INTEGRATION.md` - Full documentation

### Modified Files:
- `/ui/app/page.tsx` - Landing page (removed Google OAuth, updated routing)
- `/ui/middleware.ts` - Authentication middleware
- `/ui/components/signout-button.tsx` - Sign out component
- `/ui/.env.local` - Added `NEXT_PUBLIC_INSTRUCTOR_API_URL`

## Troubleshooting

### Error: "Login failed"
**Solution:** Ensure the instructor backend is running on port 8001

```bash
cd instructor
python main.py
```

### Error: CORS issues
**Solution:** The instructor backend already has CORS enabled with `allow_origins=["*"]`. If you still see CORS errors, check your browser console for details.

### Can't access instructor dashboard
**Solution:** Make sure you logged in successfully and the `instructor_token` cookie is set. Check browser DevTools → Application → Cookies.

### Backend not starting
**Solution:** Check that PostgreSQL and MongoDB are running:
```bash
# PostgreSQL
sudo service postgresql status

# MongoDB  
sudo service mongod status
```

## Testing with cURL

### Signup:
```bash
curl -X POST http://localhost:8001/api/v1/instructor/signup \
  -H "Content-Type: application/json" \
  -d '{
    "instructorid": "test_instructor",
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "Instructor"
  }'
```

### Login:
```bash
curl -X POST http://localhost:8001/api/v1/instructor/login \
  -H "Content-Type: application/json" \
  -d '{
    "instructorid": "test_instructor",
    "password": "password123"
  }'
```

Response will include:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Get Instructor Info (with token):
```bash
TOKEN="your_access_token_here"
curl -X GET http://localhost:8001/api/v1/instructor/me \
  -H "Authorization: Bearer $TOKEN"
```

## Next Steps

After successful login, you can:
1. Create courses
2. Upload course materials
3. Manage modules and learning objectives
4. View analytics (when implemented)
5. Access all instructor features in the dashboard

For detailed API documentation, see `/ui/INSTRUCTOR_AUTH_INTEGRATION.md`
