import { deleteCookie } from 'cookies-next';

/**
 * Clear all authentication state from the browser.
 * Removes auth cookies, localStorage, and sessionStorage.
 */
export function clearAuthState() {
  // Clear all auth cookies
  deleteCookie('instructor_token', { path: '/learn' });
  deleteCookie('learner_token', { path: '/learn' });
  deleteCookie('user_role', { path: '/learn' });
  deleteCookie('googleId', { path: '/learn' });

  // Clear all browser storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch (_) { /* ignore */ }
    try {
      sessionStorage.clear();
    } catch (_) { /* ignore */ }
  }
}

/**
 * Clear auth state and redirect to the appropriate login page.
 */
export function handleUnauthorized() {
  clearAuthState();
  if (typeof window !== 'undefined') {
    const isInstructor = window.location.pathname.startsWith('/instructor');
    window.location.href = isInstructor ? '/instructor/auth' : '/learner/auth';
  }
}

/**
 * Set up a global fetch interceptor that auto-logouts on 401 responses.
 * Call this once at app startup (e.g. in provider.tsx).
 * Login/signup endpoints are excluded so auth failures there show form errors instead.
 */
export function setupAuthInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      // Don't intercept login/signup/next-auth calls — let their own error handling run
      const isAuthEndpoint =
        url.includes('/login') ||
        url.includes('/signup') ||
        url.includes('/api/auth');

      if (!isAuthEndpoint) {
        handleUnauthorized();
      }
    }

    return response;
  };
}

