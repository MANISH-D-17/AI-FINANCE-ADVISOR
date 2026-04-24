import React from 'react';

/**
 * ErrorBoundary — catches unhandled React render errors.
 * Shows a graceful fallback UI with a retry button instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev; in production, send to error tracking service
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
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
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#f1f5f9' }}>
            Something went wrong
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', maxWidth: '400px', fontSize: '14px' }}>
            An unexpected error occurred. Your data is safe. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
