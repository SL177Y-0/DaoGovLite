import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an Ethereum address for display by showing first 6 and last 4 chars
 * @param address The full Ethereum address
 * @returns Shortened address in format "0x1234...5678"
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
