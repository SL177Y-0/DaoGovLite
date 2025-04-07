
import React from 'react';
import { WalletProvider } from '@/context/WalletContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title }) => {
  // Set document title if provided
  React.useEffect(() => {
    if (title) {
      document.title = `${title} | DAOGovLite`;
    } else {
      document.title = "DAOGovLite | Decentralized Governance";
    }
  }, [title]);

  return (
    <>
      <Toaster />
      <Sonner />
      <TooltipProvider>
        <WalletProvider>
          <SidebarProvider defaultOpen={true}>
            <div className="main-container">
              {children}
            </div>
          </SidebarProvider>
        </WalletProvider>
      </TooltipProvider>
    </>
  );
};

export default PageLayout;
