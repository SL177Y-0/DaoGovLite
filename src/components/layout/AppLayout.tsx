
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { Home, ListTodo, PlusCircle, Play, Wallet, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const AppLayout = () => {
  const { connected, address, connect, disconnect } = useWallet();
  
  // Format address for display
  const formatAddress = (addr: string) => {
    return addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen w-full flex bg-background">
        <Sidebar variant="inset" className="green-mist-glow">
          <SidebarHeader className="flex flex-col items-center justify-center pt-6 pb-2">
            <div className="p-1 rounded-full bg-green-mist/20 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-mist to-green-mist-darker flex items-center justify-center">
                <span className="text-xl font-bold text-background">D</span>
              </div>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-green-mist to-green-mist-lighter bg-clip-text text-transparent">
              DAOGovLite
            </h1>
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link to="/" className="text-sidebar-foreground">
                    <Home className="mr-2" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Proposals">
                  <Link to="/proposals" className="text-sidebar-foreground">
                    <ListTodo className="mr-2" />
                    <span>Proposals</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Create Proposal">
                  <Link to="/create" className="text-sidebar-foreground">
                    <PlusCircle className="mr-2" />
                    <span>Create Proposal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="mt-auto pb-4">
            {connected ? (
              <div className="px-3 py-2 mx-2 rounded-md bg-sidebar-accent/10">
                <div className="text-xs text-sidebar-foreground/70">Connected Wallet</div>
                <div className="text-sm text-sidebar-foreground font-medium">
                  {formatAddress(address || '')}
                </div>
                <button 
                  onClick={disconnect}
                  className="mt-2 w-full text-xs px-2 py-1 bg-sidebar-accent/20 text-sidebar-foreground rounded hover:bg-sidebar-accent/30 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="px-3">
                <button 
                  onClick={connect}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-mist/90 text-green-mist-foreground rounded hover:bg-green-mist/80 transition animate-pulse-glow"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
              </div>
            )}
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
