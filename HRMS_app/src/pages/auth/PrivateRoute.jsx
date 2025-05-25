import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const PrivateRoute = ({ allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState({ authenticated: false, role: null });

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Make a request to the verify endpoint to check authentication status
        const response = await axios.get('http://localhost:8080/api/auth/verify', {
          withCredentials: true 
        });
        
        // If request succeeds, user is authenticated
        setAuth({
          authenticated: true,
          role: response.data.user.role
        });
      } catch (error) {
        console.error("Authentication verification failed:", error);
        // If request fails, user is not authenticated
        setAuth({ authenticated: false, role: null });
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  if (loading) {
    // Show loading indicator while verifying
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg border border-[#23A49B]/30">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-t-[#23A49B] border-[#23A49B]/30 rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Initializing system...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!auth.authenticated) {
    return <Navigate to="/" />;
  }

  // If authenticated and allowed, render the protected route
  return <Outlet />;
};

export default PrivateRoute;