import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running for path:', request.nextUrl.pathname);
  const googleId = request.cookies.get('googleId')?.value;
  const userRole = request.cookies.get('user_role')?.value; // 'learner' or 'instructor'
  
  const path = request.nextUrl.pathname;

  // Redirect to signin if not authenticated
  if (!googleId && !path.startsWith('/signin')) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect authenticated users away from signin
  if (googleId && path.startsWith('/signin')) {
    // Redirect based on role
    if (userRole === 'learner') {
      return NextResponse.redirect(new URL('/learner', request.url));
    } else if (userRole === 'instructor') {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    }
    // Default fallback
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based access control
  if (googleId) {
    // Protect instructor routes
    if (path.startsWith('/instructor') && userRole !== 'instructor') {
      return NextResponse.redirect(new URL('/learner', request.url));
    }
    
    // Protect learner routes (optional - if you want strict separation)
    // Commenting out to allow instructors to access learner view
    // if (path.startsWith('/learner') && userRole !== 'learner') {
    //   return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    // }

    // Redirect root path based on role
    if (path === '/') {
      if (userRole === 'learner') {
        return NextResponse.redirect(new URL('/learner', request.url));
      } else if (userRole === 'instructor') {
        return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
      }
    }

    // Handle old routes - redirect to new structure
    if (path === '/dashboard' && userRole === 'instructor') {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    }
    if (path === '/courses' && userRole === 'instructor') {
      return NextResponse.redirect(new URL('/instructor/courses', request.url));
    }
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
