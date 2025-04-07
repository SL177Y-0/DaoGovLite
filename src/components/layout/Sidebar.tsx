
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar as SidebarContainer, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { Home, ListTodo, PlusCircle, Wallet } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

const Sidebar = () => {
  const { connected, address, connect, disconnect } = useWallet();
  const location = useLocation();
  const { open } = useSidebar();
  
  // Format address for display
  const formatAddress = (addr: string) => {
    return addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '';
  };

  // Check if a route is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarContainer 
      variant="inset" 
      className="purple-glow fixed h-full"
      data-state={open ? 'expanded' : 'collapsed'}
    >
      <SidebarHeader className="flex flex-col items-center justify-center pt-6 pb-2">
        <div className="p-1 rounded-full bg-light-purple/20 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-dark-purple flex items-center justify-center">
            <span className="text-xl font-bold font-heading text-white">D</span>
          </div>
        </div>
        <h1 className={`text-lg font-bold font-heading bg-gradient-to-r from-light-purple to-neon-purple bg-clip-text text-transparent transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
          DAOGovLite
        </h1>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Home"
              isActive={isActive('/')}
            >
              <Link to="/" className="text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-md transition-colors">
                <Home className="mr-2" />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Proposals"
              isActive={isActive('/proposals')}
            >
              <Link to="/proposals" className="text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-md transition-colors">
                <ListTodo className="mr-2" />
                <span>Proposals</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Create Proposal"
              isActive={isActive('/create')}
            >
              <Link to="/create" className="text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-md transition-colors">
                <PlusCircle className="mr-2" />
                <span>Create Proposal</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto pb-4">
        {connected ? (
          <div className={`px-3 py-2 mx-2 rounded-md bg-sidebar-accent/10 border border-sidebar-accent/20 ${!open && 'hidden md:block'}`}>
            <div className="text-xs text-sidebar-foreground/70">Connected</div>
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
          <div className={`px-3 ${!open && 'hidden md:block'}`}>
            <button 
              onClick={connect}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neon-purple text-white rounded hover:bg-neon-purple/80 transition animate-pulse-glow"
            >
              <Wallet className="w-4 h-4" />
              <span className={open ? 'block' : 'hidden'}>Connect</span>
            </button>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </SidebarContainer>
  );
};

export default Sidebar;
