import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import apiClient from '../../api/client';

/**
 * GoogleLoginButton — Frontend-initiated OAuth flow.
 * Uses @react-oauth/google to get Google access_token,
 * then exchanges it for our own JWT via POST /auth/google/token.
 *
 * Styled to match the existing app dark theme (not the standard white Google button).
 */
export function GoogleLoginButton({ onSuccess, onError, label = 'Continue with Google' }) {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      setLoading(true);
      try {
        const res = await apiClient.post('/auth/google/token', {
          access_token: response.access_token,
        });
        const { access_token: token, user_id, email, full_name, profile_picture, is_new_user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ id: user_id, email, full_name, profile_picture }));
        onSuccess?.({ token, user_id, email, full_name, profile_picture, is_new_user });
      } catch (err) {
        console.error('Login exchange failed:', err);
        const msg = err.response?.data?.detail || err.message || 'Google login failed. Please try again.';
        onError?.(msg);
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      onError?.('Google sign-in was cancelled or failed.');
    },
  });

  return (
    <button
      type="button"
      onClick={() => !loading && login()}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        padding: '13px 20px',
        borderRadius: '12px',
        border: '1.5px solid rgba(0,0,0,0.12)',
        background: '#ffffff',
        color: '#1a1a1a',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.01em',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = '#f8f8f8';
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
      }}
    >
      {loading ? (
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          border: '2px solid rgba(0,0,0,0.15)',
          borderTop: '2px solid #4285F4',
          animation: 'spin 0.8s linear infinite',
        }} />
      ) : (
        <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      )}
      <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
        {loading ? 'Signing in…' : label}
      </span>
    </button>
  );
}

export default GoogleLoginButton;
