import React, { useState } from 'react';
import { X, Terminal } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/**
 * A component that provides a button to clear console logs
 * This is useful for development and debugging
 */
export const ConsoleControl: React.FC = () => {
  const [isConsoleDisabled, setIsConsoleDisabled] = useState(false);
  
  // Function to clear console logs
  const clearConsole = () => {
    // Clear the console
    console.clear();
    
    // Override console methods to do nothing
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;
    
    console.log = function() {};
    console.error = function() {};
    console.warn = function() {};
    console.info = function() {};
    console.debug = function() {};
    
    // Show a message that console is disabled
    originalConsoleLog('Console logging disabled. Click the button again to re-enable.');
    
    setIsConsoleDisabled(true);
  };
  
  // Function to restore console logs
  const restoreConsole = () => {
    // Reload the page to restore console functionality
    window.location.reload();
  };
  
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={isConsoleDisabled ? restoreConsole : clearConsole}
          >
            {isConsoleDisabled ? (
              <X className="h-4 w-4" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConsoleDisabled ? 'Restore console logs' : 'Clear console logs'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConsoleControl; 