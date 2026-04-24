import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { access_token, user_id, email: userEmail } = response.data;

    const userData = { id: user_id, email: userEmail };
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password) => {
    const response = await apiClient.post('/auth/register', { email, password });
    const { access_token, user_id, email: userEmail } = response.data;

    const userData = { id: user_id, email: userEmail };
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  /**
   * loginWithGoogle — used by both:
   * 1. GoogleLoginButton (after successful POST /auth/google/token)
   * 2. AuthCallbackPage (after server-redirect OAuth flow)
   *
   * Accepts either a token string (from callback page) or a full data object.
   */
  const loginWithGoogle = async (tokenOrData) => {
    let token, userData;

    if (typeof tokenOrData === 'string') {
      // Called from AuthCallbackPage with just the JWT string
      token = tokenOrData;
      // Fetch user profile to get full_name, picture etc.
      try {
        localStorage.setItem('token', token);
        const profileRes = await apiClient.get('/auth/me');
        userData = {
          id: profileRes.data.id,
          email: profileRes.data.email,
          full_name: profileRes.data.full_name,
          profile_picture: profileRes.data.profile_picture,
        };
      } catch {
        userData = { id: null, email: null };
      }
    } else {
      // Called from GoogleLoginButton with full data object
      const { token: t, user_id, email, full_name, profile_picture } = tokenOrData;
      token = t;
      userData = { id: user_id, email, full_name, profile_picture };
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
