import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AuthCallbackPage — handles redirect from Google OAuth server-side flow.
 * Route: /auth/callback?token=...&is_new=true|false
 *
 * Reads JWT from URL query param, stores it via AuthContext,
 * then redirects user to dashboard.
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const isNew = searchParams.get('is_new') === 'true';

    if (!token) {
      setStatus('Authentication failed — no token received.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Store token and update auth context
    loginWithGoogle(token)
      .then(() => {
        if (isNew) {
          navigate('/', { replace: true }); // TODO: redirect to /onboarding when that page exists
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        setStatus('Failed to complete sign-in. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1724',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      gap: '16px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid rgba(59,130,246,0.3)',
        borderTop: '3px solid #3b82f6',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{status}</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthCallbackPage;
