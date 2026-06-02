import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoIcon from '../ui/LogoIcon';

// Prefetch map: start downloading JS chunk on hover, before the user clicks
const prefetchMap = {
  '/dashboard':   () => import('../../pages/DashboardPage'),
  '/expenses':    () => import('../../pages/ExpensesPage'),
  '/budgets':     () => import('../../pages/BudgetsPage'),
  '/analytics':   () => import('../../pages/AnalyticsPage'),
  '/chat':        () => import('../../pages/ChatPage'),
  '/health-score':() => import('../../pages/HealthScorePage'),
  '/savings-planner':() => import('../../pages/SavingsPlannerPage'),
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const authLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Budgets', path: '/budgets' },
    { name: 'Planner', path: '/savings-planner' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Chat', path: '/chat' },
  ];

  const links = authLinks;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
      <div className="max-w-[76rem] mx-auto bg-white/70 backdrop-blur-xl border border-black/5 px-6 py-2.5 rounded-full flex items-center justify-between shadow-2xl shadow-black/5">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <LogoIcon className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
          <span className="text-base font-semibold tracking-tight text-black">Finance Intelligence</span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {links.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              onMouseEnter={() => prefetchMap[link.path]?.()}
              className={`
                text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-all duration-300
                ${location.pathname === link.path 
                  ? 'text-black font-bold' 
                  : 'text-black/40 hover:text-black'}
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
              className="bg-black text-white text-[9px] font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full hover:bg-gray-800 transition-all shadow-md shadow-black/5"
            >
              Terminate Session
            </button>
          ) : (
            <Link 
              to="/login"
              className="bg-black text-white text-[9px] font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full hover:bg-gray-800 transition-all shadow-md shadow-black/5"
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
