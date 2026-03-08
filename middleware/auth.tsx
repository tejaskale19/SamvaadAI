import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

// Higher-order component for protected routes
export function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithAuthComponent = (props: P) => {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        // Store the intended destination for redirect after login
        sessionStorage.setItem('redirectAfterLogin', router.asPath);
        router.push('/login');
      }
    }, [isLoading, isAuthenticated, router]);

    // Show loading state while checking auth
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      );
    }

    // Don't render the component if not authenticated
    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  // Copy display name for debugging
  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAuthComponent;
}

// Hook for checking authentication status
export function useRequireAuth(redirectUrl: string = '/login') {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', router.asPath);
      router.push(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, redirectUrl]);

  return { isAuthenticated, isLoading };
}

// Hook for redirecting authenticated users away from auth pages
export function useRedirectIfAuthenticated(redirectUrl: string = '/dashboard') {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check for stored redirect destination
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(storedRedirect || redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, redirectUrl]);

  return { isAuthenticated, isLoading };
}

// List of routes that require authentication
export const protectedRoutes = [
  '/dashboard',
  '/generate',
  '/localize',
  '/analytics',
  '/approve',
  '/history',
  '/settings',
];

// List of auth routes (redirect if already logged in)
export const authRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
];

// Check if a path is a protected route
export function isProtectedRoute(path: string): boolean {
  return protectedRoutes.some(route => path.startsWith(route));
}

// Check if a path is an auth route
export function isAuthRoute(path: string): boolean {
  return authRoutes.some(route => path.startsWith(route));
}
