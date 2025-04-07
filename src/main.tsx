
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App.tsx'
import './index.css'

// Font implementation - this simulates Next.js font handling
// In a real Next.js app, you would use Next's built-in font system
const loadFonts = () => {
  // Creating style element to add font variables
  const style = document.createElement('style');
  
  // Define CSS variables for font families
  style.textContent = `
    :root {
      --font-inter: 'Inter', sans-serif;
      --font-space-grotesk: 'Space Grotesk', monospace;
      --font-syne: 'Syne', sans-serif;
    }
  `;
  
  document.head.appendChild(style);
  
  // Load fonts using link elements (similar to how Next.js would)
  const fontLinks = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap'
  ];
  
  fontLinks.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
};

// Load fonts before rendering the app
loadFonts();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
