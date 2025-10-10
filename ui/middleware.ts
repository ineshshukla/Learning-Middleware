import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running for path:', request.nextUrl.pathname);
  
  // Get authentication tokens
  const instructorToken = request.cookies.get('instructor_token')?.value;
  const learnerToken = request.cookies.get('learner_token')?.value;
  const userRole = request.cookies.get('user_role')?.value; // 'learner' or 'instructor'
  
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/instructor/auth', '/learner/auth'];
  const isPublicPath = publicPaths.some(publicPath => path === publicPath);

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if user is authenticated (either instructor or learner token)
  const isAuthenticated = instructorToken || learnerToken;

  // Redirect to appropriate auth page if not authenticated
  if (!isAuthenticated) {
    if (path.startsWith('/instructor')) {
      return NextResponse.redirect(new URL('/instructor/auth', request.url));
    } else if (path.startsWith('/learner')) {
      return NextResponse.redirect(new URL('/learner/auth', request.url));
    }
    // Default to home for other paths
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && path === '/instructor/auth' && instructorToken) {
    return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
  }

  if (isAuthenticated && path === '/learner/auth' && learnerToken) {
    return NextResponse.redirect(new URL('/learner', request.url));
  }

  // Role-based access control
  // Protect instructor routes - require instructor token
  if (path.startsWith('/instructor') && !path.startsWith('/instructor/auth')) {
    if (!instructorToken || userRole !== 'instructor') {
      return NextResponse.redirect(new URL('/instructor/auth', request.url));
    }
  }
  
  // Protect learner routes - require learner token
  if (path.startsWith('/learner') && !path.startsWith('/learner/auth')) {
    if (!learnerToken || userRole !== 'learner') {
      return NextResponse.redirect(new URL('/learner/auth', request.url));
    }
  }

  // Handle old routes - redirect to new structure
  if (path === '/dashboard' && userRole === 'instructor') {
    return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
  }
  if (path === '/courses' && userRole === 'instructor') {
    return NextResponse.redirect(new URL('/instructor/courses', request.url));
  }
  if (path === '/signin') {
    return NextResponse.redirect(new URL('/learner/auth', request.url));
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
