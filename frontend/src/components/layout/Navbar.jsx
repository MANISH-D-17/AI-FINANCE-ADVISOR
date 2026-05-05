import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoIcon from '../ui/LogoIcon';

// Prefetch map: start downloading JS chunk on hover, before the user clicks
const prefetchMap = {
  '/dashboard':   () => import('../../pages/DashboardPage'),
  '/expenses':    () => import('../../pages/ExpensesPage'),
  '/budgets':     () => import('../../pages/BudgetsPage'),
  '/goals':       () => import('../../pages/GoalsPage'),
  '/insights':    () => import('../../pages/InsightsPage'),
  '/forecast':    () => import('../../pages/ForecastPage'),
  '/chat':        () => import('../../pages/ChatPage'),
  '/health-score':() => import('../../pages/HealthScorePage'),
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const authLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Budgets', path: '/budgets' },
    { name: 'Goals', path: '/goals' },
    { name: 'Insights', path: '/insights' },
    { name: 'Forecast', path: '/forecast' },
    { name: 'Chat', path: '/chat' },
  ];

  const links = authLinks;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
      <div className="max-w-[88rem] mx-auto bg-white/70 backdrop-blur-xl border border-black/5 px-8 py-3.5 rounded-full flex items-center justify-between shadow-2xl shadow-black/5">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <LogoIcon className="w-7 h-7 text-black group-hover:scale-110 transition-transform" />
          <span className="text-xl font-medium tracking-tight text-black">Finance Intelligence</span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-10">
          {links.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              onMouseEnter={() => prefetchMap[link.path]?.()}
              className={`
                text-[13px] font-black uppercase tracking-[0.2em] transition-all duration-300
                ${location.pathname === link.path 
                  ? 'text-black' 
                  : 'text-black/30 hover:text-black'}
              `}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <button 
              onClick={logout}
              className="bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
            >
              Terminate Session
            </button>
          ) : (
            <Link 
              to="/login"
              className="bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
            >
              Open Wallet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
