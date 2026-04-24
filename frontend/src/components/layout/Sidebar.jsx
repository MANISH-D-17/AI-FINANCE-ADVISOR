import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HiOutlineViewGrid, 
  HiOutlineCreditCard, 
  HiOutlineLightBulb, 
  HiOutlineTrendingUp, 
  HiOutlineChatAlt2, 
  HiOutlineShieldCheck,
  HiOutlineFlag,
  HiOutlineLogout
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: HiOutlineViewGrid },
  { name: 'Expenses', path: '/expenses', icon: HiOutlineCreditCard },
  { name: 'Savings Goals', path: '/goals', icon: HiOutlineFlag },
  { name: 'AI Insights', path: '/insights', icon: HiOutlineLightBulb },
  { name: 'Forecast', path: '/forecast', icon: HiOutlineTrendingUp },
  { name: 'AI Chat', path: '/chat', icon: HiOutlineChatAlt2 },
  { name: 'Health Score', path: '/health-score', icon: HiOutlineShieldCheck },
];

const Sidebar = () => {
  const { logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Spacer to push content when sidebar is collapsed */}
      <div className="w-20 flex-shrink-0 transition-all duration-300"></div>

      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed left-0 top-0 h-screen bg-navy text-white z-50 
          transition-all duration-300 ease-in-out shadow-2xl
          ${isHovered ? 'w-64' : 'w-20'}
          flex flex-col border-r border-white/5
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center h-20 border-b border-white/5 px-6 overflow-hidden">
          <div className="flex-shrink-0 bg-primary p-2 rounded-xl h-10 w-10 flex items-center justify-center font-black text-white">
            FI
          </div>
          <div className={`ml-4 transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-sm font-black flex flex-col uppercase leading-tight">
              <span className="text-primary text-[10px] tracking-widest">Finance</span>
              <span className="tracking-tighter">Intelligence</span>
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-8 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon className={`w-6 h-6 flex-shrink-0 ${isHovered ? 'mr-4' : 'mr-0'} transition-all duration-200`} />
              <span className={`
                transition-all duration-300 whitespace-nowrap
                ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}
              `}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="px-3 py-6 border-t border-white/5">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3.5 text-sm font-medium text-slate-400 rounded-2xl hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 overflow-hidden"
          >
            <HiOutlineLogout className={`w-6 h-6 flex-shrink-0 transition-all duration-200 ${isHovered ? 'mr-4' : 'mr-0'}`} />
            <span className={`
              transition-all duration-300 whitespace-nowrap
              ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}
            `}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

