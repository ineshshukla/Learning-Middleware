import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running for path:', request.nextUrl.pathname);
  
  // Check for instructor or learner authentication
  const instructorToken = request.cookies.get('instructor_token')?.value;
  const learnerToken = request.cookies.get('learner_token')?.value;
  const userRole = request.cookies.get('user_role')?.value; // 'learner' or 'instructor'
  
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/instructor/auth', '/learner/auth', '/'];
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath));
  
  // Allow access to public paths
  if (isPublicPath) {
    // Redirect authenticated users away from auth pages
    if (path === '/instructor/auth' && instructorToken) {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    }
    if (path === '/learner/auth' && learnerToken) {
      return NextResponse.redirect(new URL('/learner/explore', request.url));
    }
    
    // Redirect root path based on role if authenticated
    if (path === '/') {
      if (instructorToken && userRole === 'instructor') {
        return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
      } else if (learnerToken && userRole === 'learner') {
        return NextResponse.redirect(new URL('/learner/explore', request.url));
      }
    }
    
    return NextResponse.next();
  }
  
  // Protected instructor routes
  if (path.startsWith('/instructor') && path !== '/instructor/auth') {
    if (!instructorToken) {
      return NextResponse.redirect(new URL('/instructor/auth', request.url));
    }
  }
  
  // Protected learner routes
  if (path.startsWith('/learner') && path !== '/learner/auth') {
    if (!learnerToken) {
      return NextResponse.redirect(new URL('/learner/auth', request.url));
    }
  }
  
  // Handle old routes - redirect to new structure
  if (path === '/dashboard') {
    if (instructorToken) {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/instructor/auth', request.url));
  }
  
  if (path === '/courses') {
    if (instructorToken) {
      return NextResponse.redirect(new URL('/instructor/courses', request.url));
    }
    return NextResponse.redirect(new URL('/instructor/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
