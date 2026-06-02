import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight, HiOutlineCheckCircle } from 'react-icons/hi';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import LogoIcon from '../components/ui/LogoIcon';
import { motion } from 'framer-motion';

const FEATURES = [
  'AI-powered wealth strategy generation',
  'Real-time transaction categorization',
  'Smart budget limits & alerts',
  'Investment allocation planner',
];

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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden', backgroundColor: '#F5F5F5' }}>
      {/* LEFT PANEL — Branding */}
      <div style={{
        flex: '0 0 45%',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background accents */}
        <div style={{
          position: 'absolute', top: '-10rem', right: '-10rem',
          width: '30rem', height: '30rem',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8rem', left: '-8rem',
          width: '24rem', height: '24rem',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'white' }}>
            <LogoIcon style={{ width: '2rem', height: '2rem' }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Finance Intelligence
          </span>
        </div>

        {/* Main headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              fontSize: 'clamp(3rem, 5vw, 5.5rem)',
              fontWeight: 500,
              color: 'white',
              lineHeight: 0.88,
              letterSpacing: '-0.03em',
              marginBottom: '2rem',
            }}
          >
            Join the<br />Architecture.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 500, lineHeight: 1.6, maxWidth: '22rem', marginBottom: '2.5rem' }}
          >
            Establish your financial identity and unlock intelligent wealth management from day one.
          </motion.p>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
          >
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <HiOutlineCheckCircle style={{ color: 'rgba(255,255,255,0.4)', width: '1rem', height: '1rem', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom strip */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: '1.5rem' }} />
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
            © 2025 Finance Intelligence. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        overflowY: 'auto',
        backgroundColor: '#F5F5F5',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%', maxWidth: '26rem' }}
        >
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.6rem' }}>
              Create account
            </h2>
            <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.9rem', fontWeight: 500 }}>
              Establish your financial identity
            </p>
          </div>

          {/* Google Sign-Up */}
          <div style={{ marginBottom: '1.75rem' }}>
            <GoogleLoginButton
              label="Sign up with Google"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.2)', textTransform: 'uppercase', letterSpacing: '0.25em', whiteSpace: 'nowrap' }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.6rem' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <HiOutlineMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)', width: '1.2rem', height: '1.2rem' }} />
                <input
                  type="email"
                  required
                  className="input-field"
                  style={{ paddingLeft: '3rem', height: '3.25rem' }}
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.6rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <HiOutlineLockClosed style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)', width: '1.2rem', height: '1.2rem' }} />
                <input
                  type="password"
                  required
                  className="input-field"
                  style={{ paddingLeft: '3rem', height: '3.25rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.6rem' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <HiOutlineLockClosed style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.2)', width: '1.2rem', height: '1.2rem' }} />
                <input
                  type="password"
                  required
                  className="input-field"
                  style={{ paddingLeft: '3rem', height: '3.25rem' }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '3.25rem',
                backgroundColor: loading ? '#555' : '#0A0A0A',
                color: 'white',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                borderRadius: '9999px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
                transition: 'background-color 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  Create Architecture
                  <HiOutlineArrowRight style={{ width: '1rem', height: '1rem' }} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(0,0,0,0.4)', marginTop: '2rem', fontWeight: 500 }}>
            Already have an identity?{' '}
            <Link to="/login" style={{ color: '#0A0A0A', fontWeight: 800, textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
