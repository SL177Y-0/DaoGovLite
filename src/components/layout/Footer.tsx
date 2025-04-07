
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background/80 backdrop-blur-md border-t border-border w-full">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-green-mist to-green-mist-lighter bg-clip-text text-transparent">
              DAOGovLite
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Decentralized Governance Unleashed
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-green-mist transition-colors">
              Home
            </Link>
            <Link to="/proposals" className="hover:text-green-mist transition-colors">
              Proposals
            </Link>
            <Link to="/create" className="hover:text-green-mist transition-colors">
              Create Proposal
            </Link>
          </div>
          
          <div className="mt-4 md:mt-0 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DAOGovLite. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
