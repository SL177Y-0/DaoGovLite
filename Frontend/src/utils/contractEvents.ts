import { ethers } from 'ethers';
import logger from './logger';

/**
 * A utility to monitor blockchain events with error handling and automatic reconnection
 */
export class EventMonitor {
  private contract: ethers.Contract;
  private filters: any[] = [];
  private handlers: Map<string, (...args: any[]) => void> = new Map();
  private isListening: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(contract: ethers.Contract) {
    this.contract = contract;
  }

  /**
   * Add an event to monitor
   * @param eventFilter The event filter to listen for
   * @param handler The callback to execute when the event occurs
   * @param eventName Optional name for the event for logging
   */
  public addEvent(
    eventFilter: any, 
    handler: (...args: any[]) => void,
    eventName: string = 'unnamed'
  ): void {
    const eventKey = `${eventName}-${this.filters.length}`;
    this.filters.push(eventFilter);
    this.handlers.set(eventKey, handler);
    
    // If already listening, attach the new handler
    if (this.isListening && this.contract) {
      try {
        this.contract.on(eventFilter, handler);
        logger.debug(`Added handler for event ${eventName}`);
      } catch (err) {
        logger.error(`Error adding handler for event ${eventName}:`, err);
      }
    }
  }

  /**
   * Start listening for all registered events
   */
  public startListening(): void {
    if (this.isListening || !this.contract) return;
    
    this.isListening = true;
    let index = 0;
    
    for (const filter of this.filters) {
      const eventKey = Array.from(this.handlers.keys())[index];
      const handler = this.handlers.get(eventKey);
      
      if (handler) {
        try {
          this.contract.on(filter, handler);
          logger.debug(`Started listening for event ${eventKey}`);
        } catch (err) {
          logger.error(`Error attaching handler for event ${eventKey}:`, err);
        }
      }
      
      index++;
    }
  }

  /**
   * Stop listening for all events
   */
  public stopListening(): void {
    if (!this.isListening || !this.contract) return;
    
    let index = 0;
    
    for (const filter of this.filters) {
      const eventKey = Array.from(this.handlers.keys())[index];
      const handler = this.handlers.get(eventKey);
      
      if (handler) {
        try {
          this.contract.off(filter, handler);
          logger.debug(`Stopped listening for event ${eventKey}`);
        } catch (err) {
          logger.error(`Error removing handler for event ${eventKey}:`, err);
        }
      }
      
      index++;
    }
    
    this.isListening = false;
    
    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Handle connection errors and reconnect when needed
   */
  public handleConnectionError(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.stopListening();
    
    // Try to reconnect after a delay
    this.reconnectTimeout = setTimeout(() => {
      logger.debug('Attempting to reconnect event listeners');
      this.startListening();
    }, 5000);
  }

  /**
   * Clean up all listeners and timers
   */
  public cleanup(): void {
    this.stopListening();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.filters = [];
    this.handlers.clear();
  }
}

export default EventMonitor; 