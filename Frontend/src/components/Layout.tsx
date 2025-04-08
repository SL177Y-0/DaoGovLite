import React from 'react';
import { DAOSidebar } from './DAOSidebar';
import Footer from './Footer';
import { fontFamilies } from '@/lib/fonts';
import ConsoleControl from './ConsoleControl';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-dao-deepBlue" style={{ fontFamily: fontFamilies.inter }}>
      <DAOSidebar />
      <div id="main-content" className="flex-1 ml-16 flex flex-col transition-all duration-300 ease-in-out">
        <main className="flex-grow px-0">
          {children}
        </main>
        <Footer />
      </div>
      <ConsoleControl />
    </div>
  );
};

export default Layout;
