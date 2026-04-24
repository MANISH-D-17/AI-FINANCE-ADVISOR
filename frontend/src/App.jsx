import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import NotificationToast from './components/notifications/NotificationToast';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import InsightsPage from './pages/InsightsPage';
import ForecastPage from './pages/ForecastPage';
import ChatPage from './pages/ChatPage';
import HealthScorePage from './pages/HealthScorePage';
import GoalsPage from './pages/GoalsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

import PageWrapper from './components/layout/PageWrapper';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <NotificationToast />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
