/**
 * Utility to clear browser console logs
 * This can be run from the browser console with:
 * 
 * 1. Open browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Paste and run this code:
 * 
 * fetch('/utils/clearConsole.js')
 *   .then(response => response.text())
 *   .then(text => {
 *     const script = document.createElement('script');
 *     script.textContent = text;
 *     document.head.appendChild(script);
 *     console.clear();
 *     console.log('Console logs cleared!');
 *   });
 */

(function() {
  // Override console methods to prevent new logs
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;
  
  // Clear the console
  console.clear();
  
  // Create a button to restore console functionality
  const restoreButton = document.createElement('button');
  restoreButton.textContent = 'Restore Console Logs';
  restoreButton.style.position = 'fixed';
  restoreButton.style.bottom = '10px';
  restoreButton.style.right = '10px';
  restoreButton.style.zIndex = '9999';
  restoreButton.style.padding = '8px 16px';
  restoreButton.style.backgroundColor = '#4CAF50';
  restoreButton.style.color = 'white';
  restoreButton.style.border = 'none';
  restoreButton.style.borderRadius = '4px';
  restoreButton.style.cursor = 'pointer';
  
  // Add click handler to restore console
  restoreButton.addEventListener('click', function() {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
    
    console.log('Console logging restored!');
    restoreButton.remove();
  });
  
  // Add the button to the page
  document.body.appendChild(restoreButton);
  
  // Override console methods to do nothing
  console.log = function() {};
  console.error = function() {};
  console.warn = function() {};
  console.info = function() {};
  console.debug = function() {};
  
  // Show a message that console is disabled
  originalConsoleLog('Console logging disabled. Click the "Restore Console Logs" button to re-enable.');
})(); 