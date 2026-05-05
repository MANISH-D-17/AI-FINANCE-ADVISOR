import React from 'react';
import Navbar from './Navbar';
import { PageTransition } from '../ui/AnimatedContainer';

const PageWrapper = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-32 px-6 md:px-12 lg:px-20 pb-20 scroll-smooth">
        <PageTransition>
          <div className="max-w-[88rem] mx-auto">
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
};

export default PageWrapper;
