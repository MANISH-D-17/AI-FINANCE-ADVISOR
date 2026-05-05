import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import { FadeIn } from '../components/ui/AnimatedContainer';
import LogoIcon from '../components/ui/LogoIcon';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (data) => {
    await loginWithGoogle(data);
    toast.success('Account created! Welcome to Finance Intelligence.');
    navigate('/dashboard');
  };

  const handleGoogleError = (msg) => {
    toast.error(msg || 'Google sign-up failed.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    
    setLoading(true);
    try {
      await register(email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      const errorData = error.response?.data?.detail;
      const errorMsg = typeof errorData === 'string' 
        ? errorData 
        : (Array.isArray(errorData) ? errorData[0].msg : 'Registration failed. Try again.');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] px-4 overflow-hidden">
      <FadeIn direction="up" distance={40} className="max-w-md w-full relative z-10">
        <div className="glass-card border-none !p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-8">
              <div className="text-black">
                <LogoIcon className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-5xl font-medium text-black tracking-halo leading-tight mb-4">
              Join the<br/>Architecture
            </h1>
            <p className="text-black/60 font-medium tracking-tight">Establish your financial identity</p>
          </div>

          {/* Google Sign-Up */}
          <div className="mb-8">
            <GoogleLoginButton
              label="Sign up with Google"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-black/5" />
            <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] whitespace-nowrap">Core Registration</span>
            <div className="flex-1 h-px bg-black/5" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] px-1">Email Identifier</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 w-5 h-5" />
                <input
                  type="email"
                  required
                  className="input-field pl-12 h-14 !bg-transparent border-black/5 focus:border-black/20 font-medium text-black"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] px-1">Security Key</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 w-5 h-5" />
                <input
                  type="password"
                  required
                  className="input-field pl-12 h-14 !bg-transparent border-black/5 focus:border-black/20 font-medium text-black"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] px-1">Verify Key</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 w-5 h-5" />
                <input
                  type="password"
                  required
                  className="input-field pl-12 h-14 !bg-transparent border-black/5 focus:border-black/20 font-medium text-black"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-black text-white text-[13px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center mt-4 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/50"></div>
              ) : (
                'Create Architecture'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-black/40 mt-12 font-medium">
            Already have an identity?{' '}
            <Link to="/login" className="text-black font-black hover:underline underline-offset-4 decoration-black/20">
              Sign in
            </Link>
          </p>
        </div>
      </FadeIn>
    </div>
  );
};

export default RegisterPage;
