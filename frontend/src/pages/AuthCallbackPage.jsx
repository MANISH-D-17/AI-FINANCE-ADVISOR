import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoIcon from '../components/ui/LogoIcon';

/**
 * AuthCallbackPage — handles redirect from Google OAuth server-side flow.
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Authenticating Profile...');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const isNew = searchParams.get('is_new') === 'true';

    if (!token) {
      setStatus('Authentication protocol failed.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    loginWithGoogle(token)
      .then(() => {
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setStatus('Failed to initiate session. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-8">
      <div className="relative">
        <LogoIcon className="w-12 h-12 text-black/10" />
        <div className="absolute inset-0 border-2 border-transparent border-t-black rounded-full animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-[11px] font-black text-black uppercase tracking-[0.3em]">{status}</p>
        <p className="text-[9px] font-medium text-black/30 uppercase tracking-widest">Protocol.Authorization_Active</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
