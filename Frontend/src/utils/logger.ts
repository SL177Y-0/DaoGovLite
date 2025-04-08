// Simple logger with configurable log levels
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Set to DEBUG to see all logs, or higher level to reduce verbosity
// Use localStorage to allow dynamic adjustment during runtime
const getLogLevel = () => {
  const storedLevel = localStorage.getItem('log_level');
  if (storedLevel && LOG_LEVEL[storedLevel] !== undefined) {
    return LOG_LEVEL[storedLevel];
  }
  return LOG_LEVEL.DEBUG; // Default to DEBUG for maximum visibility
};

// Generate a timestamp for logs
const timestamp = () => {
  return new Date().toISOString().substring(11, 23); // HH:MM:SS.sss
};

// Format log messages
const formatMessage = (level: string, message: string, data?: any) => {
  const prefix = `[${timestamp()}][${level}]`;
  const style = level === 'DEBUG' ? 'color: gray' :
                level === 'INFO' ? 'color: blue' :
                level === 'WARN' ? 'color: orange' :
                'color: red';
  
  // Return formatted message and style for console logging
  return { 
    message: `${prefix} ${message}`, 
    style,
    rawMessage: message,
    timestamp: new Date().toISOString(),
    level,
    data
  };
};

// Track log history for debugging
const logHistory: any[] = [];
const MAX_LOG_HISTORY = 1000;

// Add to log history with size control
const addToHistory = (logEntry: any) => {
  logHistory.push(logEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
};

// Get log history
export const getLogHistory = () => logHistory;

// Clear log history
export const clearLogHistory = () => {
  logHistory.length = 0;
};

const logger = {
  debug: (message: string, ...data: any[]) => {
    if (getLogLevel() <= LOG_LEVEL.DEBUG) {
      const logEntry = formatMessage('DEBUG', message, data);
      console.debug(`%c${logEntry.message}`, logEntry.style, ...data);
      addToHistory(logEntry);
    }
  },
  
  info: (message: string, ...data: any[]) => {
    if (getLogLevel() <= LOG_LEVEL.INFO) {
      const logEntry = formatMessage('INFO', message, data);
      console.info(`%c${logEntry.message}`, logEntry.style, ...data);
      addToHistory(logEntry);
    }
  },
  
  warn: (message: string, ...data: any[]) => {
    if (getLogLevel() <= LOG_LEVEL.WARN) {
      const logEntry = formatMessage('WARN', message, data);
      console.warn(`%c${logEntry.message}`, logEntry.style, ...data);
      addToHistory(logEntry);
    }
  },
  
  error: (message: string, ...data: any[]) => {
    if (getLogLevel() <= LOG_LEVEL.ERROR) {
      const logEntry = formatMessage('ERROR', message, data);
      console.error(`%c${logEntry.message}`, logEntry.style, ...data);
      addToHistory(logEntry);
    }
  },
  
  // Group logs for better organization
  group: (label: string) => {
    console.group(label);
  },
  
  groupEnd: () => {
    console.groupEnd();
  },
  
  // Set log level dynamically
  setLogLevel: (level: string) => {
    if (LOG_LEVEL[level] !== undefined) {
      localStorage.setItem('log_level', level);
      console.log(`Log level set to ${level}`);
    }
  },
  
  // Helper to dump important state for debugging
  dumpState: (state: any) => {
    if (getLogLevel() <= LOG_LEVEL.DEBUG) {
      console.group('App State Dump');
      console.log(JSON.stringify(state, null, 2));
      console.groupEnd();
    }
  },
  
  // Log network requests
  logRequest: (method: string, url: string, data?: any) => {
    if (getLogLevel() <= LOG_LEVEL.DEBUG) {
      const logEntry = formatMessage('REQUEST', `${method} ${url}`, data);
      console.debug(`%c${logEntry.message}`, logEntry.style, data);
      addToHistory(logEntry);
    }
  },
  
  // Log network responses
  logResponse: (status: number, url: string, data?: any) => {
    const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'DEBUG';
    if (getLogLevel() <= LOG_LEVEL[level]) {
      const logEntry = formatMessage(level, `Response ${status} ${url}`, data);
      console[level.toLowerCase()](`%c${logEntry.message}`, logEntry.style, data);
      addToHistory(logEntry);
    }
  }
};

// Expose logger globally for console access
if (typeof window !== 'undefined') {
  (window as any).appLogger = logger;
  (window as any).getLogHistory = getLogHistory;
  (window as any).clearLogHistory = clearLogHistory;
  (window as any).setLogLevel = logger.setLogLevel;
}

export default logger; 