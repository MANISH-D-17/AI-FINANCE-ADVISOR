import React from 'react';
import Navbar from './Navbar';
import { PageTransition } from '../ui/AnimatedContainer';

const PageWrapper = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-36 px-4 md:px-8 lg:px-16 pb-16 scroll-smooth">
        <PageTransition>
          <div className="max-w-[80rem] mx-auto">
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
};

export default PageWrapper;
