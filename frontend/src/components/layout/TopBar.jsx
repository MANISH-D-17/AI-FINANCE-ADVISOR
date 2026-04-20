import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineUserCircle, HiOutlineBell } from 'react-icons/hi';

const TopBar = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between h-20 px-8 bg-white border-b border-gray-100">
      <h2 className="text-xl font-bold text-navy-dark">{title}</h2>
      
      <div className="flex items-center space-x-6">
        <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all duration-200 relative">
          <HiOutlineBell className="w-6 h-6" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center space-x-3 pl-6 border-l border-gray-100">
          <div className="text-right">
            <p className="text-sm font-semibold text-navy-dark">{user?.email.split('@')[0]}</p>
            <p className="text-xs text-gray-400">Regular User</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <HiOutlineUserCircle className="w-7 h-7" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
