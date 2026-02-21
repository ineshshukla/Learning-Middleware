import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const basePath = '/learn';
  
  // Next.js already strips the basePath before middleware receives it
  // So we use the pathname as-is
  const path = request.nextUrl.pathname;
  
  console.log('Middleware running for path:', path);
  
  // Check for instructor or learner authentication
  const instructorToken = request.cookies.get('instructor_token')?.value;
  const learnerToken = request.cookies.get('learner_token')?.value;
  const userRole = request.cookies.get('user_role')?.value; // 'learner' or 'instructor'
  
  // Public paths that don't require authentication - ONLY the landing page and auth pages
  const publicPaths = ['/instructor/auth', '/learner/auth'];
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath));
  
  // Handle root path separately
  if (path === '/') {
    // Redirect authenticated users to their respective dashboards
    if (instructorToken && userRole === 'instructor') {
      return NextResponse.redirect(new URL(`${basePath}/instructor/dashboard`, request.url));
    } else if (learnerToken && userRole === 'learner') {
      return NextResponse.redirect(new URL(`${basePath}/learner/explore`, request.url));
    }
    // Allow unauthenticated users to see the landing page
    return NextResponse.next();
  }
  
  // Allow access to auth pages
  if (isPublicPath) {
    // Redirect authenticated users away from auth pages
    if (path === '/instructor/auth' && instructorToken) {
      return NextResponse.redirect(new URL(`${basePath}/instructor/dashboard`, request.url));
    }
    if (path === '/learner/auth' && learnerToken) {
      return NextResponse.redirect(new URL(`${basePath}/learner/explore`, request.url));
    }
    
    return NextResponse.next();
  }
  
  // Protected instructor routes
  if (path.startsWith('/instructor') && path !== '/instructor/auth') {
    if (!instructorToken) {
      return NextResponse.redirect(new URL(`${basePath}/instructor/auth`, request.url));
    }
    return NextResponse.next();
  }
  
  // Protected learner routes
  if (path.startsWith('/learner') && path !== '/learner/auth') {
    if (!learnerToken) {
      return NextResponse.redirect(new URL(`${basePath}/learner/auth`, request.url));
    }
    return NextResponse.next();
  }
  
  // ALL other routes not under /instructor or /learner are now protected
  // Determine which auth page to redirect to based on the route or default to instructor
  // Check if user has any authentication
  const isAuthenticated = instructorToken || learnerToken;
  
  if (!isAuthenticated) {
    // For unprotected root-level routes, redirect to instructor auth by default
    // You can customize this logic based on the route if needed
    return NextResponse.redirect(new URL(`${basePath}/instructor/auth`, request.url));
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
     * - static assets (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
}
