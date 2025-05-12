import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Power } from 'lucide-react';

const RoboticLogoutModal = ({ isOpen, onConfirm, onCancel }) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      // Call the logout endpoint to clear the auth cookie
      await axios.post('http://localhost:8080/api/auth/logout', {}, {
        withCredentials: true 
      });
      
      // Execute any additional cleanup
      onConfirm();
      
      // Redirect to login page
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent className="bg-gradient-to-b from-gray-900 to-gray-800 border-2 border-[#23A49B]/30 p-0 overflow-hidden w-full max-w-md sm:max-w-lg md:max-w-xl">
        {/* Decorative circuit lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-[#23A49B]" />
          <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-[#23A49B]" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-[#23A49B]" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-[#23A49B]" />
        </div>

        <AlertDialogHeader className="p-8 space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-1.5 bg-[#23A49B] rounded-full blur-lg opacity-70 animate-pulse" />
              <div className="relative bg-gray-900 rounded-full p-5 border-2 border-[#23A49B]">
                <Power className="w-10 h-10 text-[#23A49B]" />
              </div>
            </div>
          </div>
          
          <AlertDialogTitle className="text-3xl font-bold text-center text-white">
            System Shutdown Sequence
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center text-gray-300 space-y-3">
            <p className="font-mono text-lg">INITIATING LOGOUT PROTOCOL</p>
            <p className="text-base opacity-80">
              This action will terminate your current session and return you to the login interface.
              All unsaved changes will be lost.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-gray-900/50 p-6">
          <AlertDialogFooter className="flex space-x-6">
            <AlertDialogCancel 
              onClick={onCancel}
              className="flex-1 bg-transparent border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white py-3 text-lg"
            >
              <span className="relative z-10">ABORT SEQUENCE</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shine_1s_ease]" /> 
            </AlertDialogCancel>

            <AlertDialogAction 
              onClick={handleLogout}
              className="flex-1 bg-[#23A49B] hover:bg-[#23A49B]/80 text-white border-2 border-[#23A49B] group relative overflow-hidden py-3 text-lg"
            >
              <span className="relative z-10">CONFIRM SHUTDOWN</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shine_1s_ease]" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RoboticLogoutModal;