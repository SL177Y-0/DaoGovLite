
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dao-deepBlue p-4">
      <div className="text-center max-w-md glassmorphism rounded-xl p-10">
        <div className="w-20 h-20 mx-auto rounded-full bg-dao-neonPurple/20 flex items-center justify-center mb-6">
          <span className="text-4xl font-bold text-dao-neonPurple">404</span>
        </div>
        <h1 className="text-2xl font-syne font-bold mb-4 text-white">Page Not Found</h1>
        <p className="text-dao-lightPurple mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-dao-neonPurple text-white font-medium py-2 px-6 rounded-lg hover:bg-dao-neonPurple/80 transition-colors duration-200"
        >
          <Home size={18} />
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
