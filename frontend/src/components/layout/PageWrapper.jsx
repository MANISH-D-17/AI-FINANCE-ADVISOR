import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const PageWrapper = ({ children, title }) => {
  return (
    <div className="flex h-screen bg-lightBg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;
