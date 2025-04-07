
import React from 'react';
import { Outlet } from 'react-router-dom';
import PageLayout from './PageLayout';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSidebar } from '@/components/ui/sidebar';

const RootLayout = () => {
  // Get sidebar state to adjust main content
  const { open } = useSidebar();
  
  return (
    <PageLayout>
      <div className="flex h-screen w-full bg-background">
        <Sidebar />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${open ? 'md:ml-64' : 'md:ml-16'}`}>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 md:p-6">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </PageLayout>
  );
};

export default RootLayout;
