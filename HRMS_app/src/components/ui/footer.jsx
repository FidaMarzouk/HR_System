import React from 'react';

const Footer = () => {
  return (
    <div className="bg-gray-900 border-t border-gray-800 p-3 md:p-4 text-center text-xs text-gray-500">
      <p>© {new Date().getFullYear()} Enova Robotics • All Rights Reserved</p>
    </div>
  );
};

export default Footer;