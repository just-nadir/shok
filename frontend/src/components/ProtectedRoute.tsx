import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthMe, ApiError } from '../services/api';

interface ProtectedRouteProps {
  role: 'driver' | 'admin';
  children: React.ReactNode;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let cancelled = false;

    getAuthMe()
      .then((session) => {
        if (cancelled) return;
        if (session.role === role) {
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 = not authenticated or session expired
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setAuthState('unauthenticated');
        } else {
          // Network error or server error — treat as unauthenticated
          setAuthState('unauthenticated');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <span className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    const loginPath = role === 'admin' ? '/admin/login' : '/driver/login';
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}
