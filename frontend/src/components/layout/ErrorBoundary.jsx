import React from 'react';
import LogoIcon from '../ui/LogoIcon';

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
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-12 text-black">
            <LogoIcon className="w-16 h-16 mx-auto" />
          </div>
          
          <h2 className="text-4xl font-medium text-black tracking-halo mb-4">
            Systemic Interruption
          </h2>
          
          <p className="text-black/40 font-medium max-w-md mx-auto mb-12 leading-relaxed">
            An unexpected architectural variance has occurred. Your financial data remains secure. Initialize a terminal reset to continue.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black/80 transition-all shadow-xl shadow-black/10"
          >
            Reset Architecture
          </button>
          
          <div className="mt-20 border-t border-black/5 pt-8 w-full max-w-xs">
            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">
              Error Code: {this.state.error?.name || 'Protocol.Variance'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
