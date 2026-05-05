import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import NotificationToast from './components/notifications/NotificationToast';

// Pages - Lazy Loaded for Performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const HealthScorePage = lazy(() => import('./pages/HealthScorePage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));

import PageWrapper from './components/layout/PageWrapper';
import { useAuth } from './context/AuthContext';

// Silently prefetch all page chunks in the background after app load
const prefetchAllPages = () => {
  const pages = [
    () => import('./pages/ExpensesPage'),
    () => import('./pages/BudgetsPage'),
    () => import('./pages/GoalsPage'),
    () => import('./pages/InsightsPage'),
    () => import('./pages/ForecastPage'),
    () => import('./pages/ChatPage'),
    () => import('./pages/HealthScorePage'),
  ];
  pages.forEach(load => load());
};


const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const App = () => {
  // Prefetch all page chunks in background after initial load settles
  useEffect(() => {
    const timer = setTimeout(prefetchAllPages, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <NotificationToast />
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-black"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <PageWrapper title="Dashboard">
                <DashboardPage />
              </PageWrapper>
            } />
            <Route path="/expenses" element={
              <PageWrapper title="Expenses">
                <ExpensesPage />
              </PageWrapper>
            } />
            <Route path="/insights" element={
              <PageWrapper title="AI Insights">
                <InsightsPage />
              </PageWrapper>
            } />
            <Route path="/forecast" element={
              <PageWrapper title="Forecast">
                <ForecastPage />
              </PageWrapper>
            } />
            <Route path="/chat" element={
              <PageWrapper title="AI Chat">
                <ChatPage />
              </PageWrapper>
            } />
            <Route path="/health-score" element={
              <PageWrapper title="Health Score">
                <HealthScorePage />
              </PageWrapper>
            } />
            <Route path="/goals" element={
              <PageWrapper title="Savings Goals">
                <GoalsPage />
              </PageWrapper>
            } />
            <Route path="/budgets" element={
              <PageWrapper title="Budget Limits">
                <BudgetsPage />
              </PageWrapper>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;
