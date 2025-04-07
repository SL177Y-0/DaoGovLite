
import React from 'react';
import { WalletProvider } from '@/context/WalletContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title }) => {
  // Set document title if provided
  React.useEffect(() => {
    if (title) {
      document.title = `${title} | DAOGovLite`;
    }
  }, [title]);

  return (
    <>
      <Toaster />
      <Sonner />
      <TooltipProvider>
        <WalletProvider>
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            {children}
          </div>
        </WalletProvider>
      </TooltipProvider>
    </>
  );
};

export default PageLayout;
