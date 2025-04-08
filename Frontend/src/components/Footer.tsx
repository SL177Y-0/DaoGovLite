import React from 'react';
import { Github, Twitter, MessagesSquare } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-dao-deepBlue border-t border-dao-neonPurple/20 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
           
              <span className="font-syne font-bold text-white text-xl">DAOGovLite</span>
            </div>
            <p className="text-dao-lightPurple text-sm mb-4">
              A decentralized governance platform for transparent and secure decision-making on the blockchain.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-dao-lightBlue hover:text-dao-neonPurple transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-dao-lightBlue hover:text-dao-neonPurple transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-dao-lightBlue hover:text-dao-neonPurple transition-colors">
                <MessagesSquare size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-dao-lightPurple hover:text-white transition-colors">Home</a></li>
              <li><a href="/proposals" className="text-dao-lightPurple hover:text-white transition-colors">Proposals</a></li>
              <li><a href="/create-proposal" className="text-dao-lightPurple hover:text-white transition-colors">Create Proposal</a></li>
              <li><a href="/execution" className="text-dao-lightPurple hover:text-white transition-colors">Execution</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-medium mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-dao-lightPurple hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="text-dao-lightPurple hover:text-white transition-colors">Smart Contracts</a></li>
              <li><a href="#" className="text-dao-lightPurple hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#" className="text-dao-lightPurple hover:text-white transition-colors">Community</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-dao-neonPurple/20 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-dao-lightPurple text-sm">© 2025 DAOGovLite. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-dao-lightPurple text-sm hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-dao-lightPurple text-sm hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
