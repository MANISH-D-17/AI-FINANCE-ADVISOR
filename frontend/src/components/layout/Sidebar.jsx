import React from 'react';
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

  return (
    <div className="flex flex-col w-64 h-screen bg-navy text-white transition-all duration-300">
      <div className="flex items-center justify-center h-20 border-b border-navy-light">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="bg-primary p-1.5 rounded-lg text-white">AI</span>
          <span className="tracking-tight text-xl font-semibold">CFO</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-gray-400 hover:bg-navy-light hover:text-white'}
            `}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-6 border-t border-navy-light">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <HiOutlineLogout className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
