import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { io } from 'socket.io-client';
import {  
  SlidersHorizontal, 
  Home, 
  Users, 
  Clipboard, 
  Calendar, 
  CalendarDays,
  Bell, 
  ChevronRight,
  Activity,
  Grid,
  MessageCircle,
  Menu,
  LayoutDashboard,
  LineChart
} from "lucide-react";
import {FaSignOutAlt, FaRobot } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import EmployeePage from './ManagerEmployees';
import LeaveRequestPage from './ManagerLeaveRequestPage';
import RoboticLogoutModal from '../../auth/LogoutModal';
import AttendanceManager from '../../Attendance/AttendanceManager';
import ProfilePage from '../../ProfilePage';
import NotificationPage from '../../NotificationSystem';
import CalendarManager from '../../CalendarManager';
import ChatBot from '../../ChatBot';
import ChatComponent from '../../TeamChat';
import ManagerDashboardHomePage from '../Manager_Dashboard/ManagerDashboardHomepage';
import PersonalDashboard from '../Employee_Dashboard/EmployeeDashboardHomepage';
import { getSocket } from '../../../socketService';
import Footer from '../../../components/ui/footer';

// Circuit pattern for background
const CircuitPattern = () => (
  <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M20 40 L40 40 L40 20 L60 20 L60 40 L80 40" stroke="#3baca5" fill="none" strokeWidth="2"/>
        <path d="M20 60 L40 60 L40 80 L60 80 L60 60 L80 60" stroke="#3baca5" fill="none" strokeWidth="2"/>
        <circle cx="20" cy="40" r="3" fill="#3baca5"/>
        <circle cx="80" cy="40" r="3" fill="#3baca5"/>
        <circle cx="20" cy="60" r="3" fill="#3baca5"/>
        <circle cx="80" cy="60" r="3" fill="#3baca5"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  </div>
);

const ManagerDashboard = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [openSideBar, setOpenSideBar] = useState(true);
  const [activePage, setActivePage] = useState("Home");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const [expandedNavItems, setExpandedNavItems] = useState({Home: false });  
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    picture: '',
    role: 'Department Manager',
    id: ''
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if sidebar is open and click is outside sidebar
      if (
        showMenu && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    // Add event listener when sidebar is open
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  const toggleSubMenu = (navName) => {
    setExpandedNavItems(prev => ({
      ...prev,
      [navName]: !prev[navName]
    }));
  };
  
  const navigationList = [
    {
      name: "Home",
      icon: <Home className="w-5 h-5" />,
      description: "Dashboards",
      hasSubItems: true,
      subItems: [
        {
          name: "Main Dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
          description: "Company overview",
          onClick: () => setActivePage("MainDashboard")
        },
        {
          name: "Personal Stats",
          icon: <LineChart className="w-4 h-4" />,
          description: "Your personal stats",
          onClick: () => setActivePage("PersonalDashboard")
        }
      ]
    },
    {
      name: "Employees",
      icon: <Users className="w-5 h-5" />,
      description: "Manage team"
    },
    {
      name: "Leave Requests",
      icon: <Clipboard className="w-5 h-5" />,
      description: "Review time off requests"
    },
    {
      name: "Attendance",
      icon: <Calendar className="w-5 h-5" />,
      description: "Track team presence"
    },
    {
      name: "Calendar",
      icon: <CalendarDays className="w-5 h-5" />,
      description: "Event management"
    },
  ];
  
  const footerNavigation = [
    {
      name: "Chat",
      icon: (
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </div>
      ),
      onClick: () => setActivePage("Chat")
    },
    {
      name: "Notifications",
      icon: (
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </div>
      ),
      onClick: () => setActivePage("Notifications"),
    },
    {
      name: "Profile",
      icon: <SlidersHorizontal className="w-5 h-5" />,
      onClick: () => setActivePage("Profile")
    },
    { 
      name: "Logout", 
      icon: <FaSignOutAlt className="w-5 h-5" /> 
    },
  ];

  // Fetch unread notifications count
  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/notifications', {
        withCredentials: true
      });
      
      // Calculate unread notifications
      const notifications = Array.isArray(response.data) ? response.data : [];
      const unreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadNotifications(unreadCount);
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setUnreadNotifications(0);
    }
  };

  // Fetch unread messages count
  const fetchUnreadMessagesCount = async () => {
    try {
      // Use the dedicated endpoint for unread count
      const response = await axios.get('http://localhost:8080/api/chat/unread', {
        withCredentials: true
      });
      
      // The endpoint directly returns { unreadCount }
      setUnreadMessages(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      setUnreadMessages(0);
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/users/me', {
        withCredentials: true
      });
      
      if (response.data) {
        setUser({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          picture: response.data.picture || '',
          role: response.data.role || 'System Administrator',
          id: response.data._id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Initial data loading effect
  useEffect(() => {
    // Fetch user data first
    fetchUserData();
    
    // Fetch initial counts
    fetchUnreadNotificationCount();
    fetchUnreadMessagesCount();
    
    // Set up timer for current time
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Setup socket listeners for notifications
  useEffect(() => {
    const socket = getSocket();
  
    // Notification listeners
    socket.on('notification', () => {
      fetchUnreadNotificationCount();
    });
  
    socket.on('notificationUpdate', ({ type }) => {
      if (type === 'read' || type === 'readAll' || type === 'delete') {
        fetchUnreadNotificationCount();
      }
    });
  
    return () => {
      socket.off('notification');
      socket.off('notificationUpdate');
    };
  }, []);

  // Setup socket listeners for messages - depends on user.id
  useEffect(() => {
    // Only set up message listeners if we have a valid user ID
    if (!user.id) return;
    
    const socket = getSocket();
  
    socket.on('newMessage', (message) => {
      // Check if the message is for the current user
      if (message.receiver && message.receiver._id === user.id) {
        // Fetch latest count
        fetchUnreadMessagesCount();
      }
    });
  
    socket.on('messagesRead', () => {
      // Refresh count when messages are marked as read
      fetchUnreadMessagesCount();
    });
  
    return () => {
      socket.off('newMessage');
      socket.off('messagesRead');
    };
  }, [user.id]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Format current date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(currentTime);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };
  
  const handleLogoutConfirm = () => {
    navigate('/');
  };

  const toggleSideBar = () => {
    setOpenSideBar(!openSideBar);
  };

  const toggleMobileMenu = () => {
    setShowMenu(!showMenu);
  };

  const getHeaderGradient = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return "bg-gradient-to-r from-[#0c4a44] to-[#1c5a54]"; // Late night - dark teal
    if (hour < 12) return "bg-gradient-to-r from-[#23a49b] to-[#0e766c]"; // Morning - bright teal
    if (hour < 18) return "bg-gradient-to-r from-[#2d9d95] to-[#20756e]"; // Afternoon - medium teal
    return "bg-gradient-to-r from-[#1a7870] to-[#0a5a54]"; // Evening - deep teal
  };
  const SideNavbar = ({ handleLogout, openSideBar, activePage, setActivePage }) => (
    <div className="flex flex-col flex-grow overflow-y-auto mt-5 relative z-10">
      <div className="flex-grow overflow-y-auto">
        <ul className="px-1">
          {navigationList.map((item) => (
            <React.Fragment key={item.name}>
              <li
                className={`flex items-center space-x-2 p-3 my-1 rounded-lg transition-all duration-200 cursor-pointer
                  ${(activePage === item.name || 
                     (item.hasSubItems && item.subItems.some(sub => activePage === sub.name)))
                    ? "bg-gradient-to-r from-[#3baca5]/20 to-[#3baca5]/10 border-l-4 border-[#3baca5]" 
                    : "hover:bg-gray-800 border-l-4 border-transparent"}`}
                onClick={() => {
                  if (item.hasSubItems) {
                    toggleSubMenu(item.name);
                  } else {
                    setActivePage(item.name);
                    setShowMenu(false);
                  }
                }}
              >
                <div className={`${activePage === item.name || 
                  (item.hasSubItems && item.subItems.some(sub => activePage === sub.name))
                  ? "text-[#3baca5]" : "text-gray-400"} flex items-center justify-center w-8 h-8 flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className={`flex flex-col overflow-hidden ${!openSideBar && "md:hidden"}`}>
                  <span className={`font-medium text-base ${activePage === item.name || 
                    (item.hasSubItems && item.subItems.some(sub => activePage === sub.name))
                    ? "text-[#3baca5]" : "text-gray-300"} whitespace-nowrap`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
                    {item.description}
                  </span>
                </div>
                {item.hasSubItems && openSideBar && (
                  <div className="ml-auto mr-2">
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${expandedNavItems[item.name] ? 'rotate-90' : ''}`} />
                  </div>
                )}
                {(activePage === item.name || 
                  (item.hasSubItems && item.subItems.some(sub => activePage === sub.name))) && (
                  <div className="ml-auto mr-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-[#3baca5] rounded-full"></div>
                  </div>
                )}
              </li>
              
              {/* SubItems for navigation when sidebar is expanded */}
              {item.hasSubItems && expandedNavItems[item.name] && openSideBar && (
                <div className="ml-8 mb-2">
                  {item.subItems.map((subItem, subIndex) => (
                    <li
                      key={`${item.name}-${subIndex}`}
                      className={`flex items-center space-x-2 p-2 my-1 rounded-lg transition-all duration-200 cursor-pointer
                        ${activePage === subItem.name 
                          ? "bg-gradient-to-r from-[#3baca5]/10 to-transparent border-l-2 border-[#3baca5]" 
                          : "hover:bg-gray-800 border-l-2 border-transparent"}`}
                      onClick={() => {
                        subItem.onClick();
                        setShowMenu(false);
                      }}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 flex-shrink-0 ${activePage === subItem.name ? "text-[#3baca5]" : "text-gray-400"}`}>
                        {subItem.icon}
                      </div>
  
                      <div className="flex flex-col">
                        <span className={`font-medium text-sm ${activePage === subItem.name ? "text-[#3baca5]" : "text-gray-300"}`}>
                          {subItem.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {subItem.description}
                        </span>
                      </div>
  
                      {activePage === subItem.name && (
                        <div className="ml-auto">
                          <div className="w-1.5 h-1.5 bg-[#3baca5] rounded-full"></div>
                        </div>
                      )}
                    </li>
                  ))}
                </div>
              )}
              
              {/* SubItems icons when sidebar is collapsed */}
              {item.hasSubItems && expandedNavItems[item.name] && !openSideBar && (
                <>
                  {item.subItems.map((subItem, subIndex) => (
                    <li
                      key={`${item.name}-collapsed-${subIndex}`}
                      className={`flex items-center justify-center p-3 my-1 rounded-lg transition-all duration-200 cursor-pointer
                        ${activePage === subItem.name 
                          ? "bg-gradient-to-r from-[#3baca5]/20 to-[#3baca5]/10 border-l-4 border-[#3baca5]" 
                          : "hover:bg-gray-800 border-l-4 border-transparent"}`}
                      onClick={() => {
                        subItem.onClick();
                        setShowMenu(false);
                      }}
                      title={subItem.name}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 ${activePage === subItem.name ? "text-[#3baca5]" : "text-gray-400"}`}>
                        {subItem.icon}
                      </div>
                      
                      {activePage === subItem.name && (
                        <div className="absolute right-2">
                          <div className="w-1.5 h-1.5 bg-[#3baca5] rounded-full"></div>
                        </div>
                      )}
                    </li>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
  
      <div className="mt-auto border-t border-gray-700 pt-4">
        <ul className="px-1">
          {footerNavigation.map((item, index) => (
            <li
              key={index}
              className={`flex items-center space-x-2 p-3 my-1 rounded-lg transition-all duration-200 cursor-pointer
                ${activePage === item.name 
                  ? "bg-gradient-to-r from-[#3baca5]/20 to-[#3baca5]/10 border-l-4 border-[#3baca5]" 
                  : "hover:bg-gray-800 border-l-4 border-transparent"}`}
              onClick={() => {
                if (item.name === "Logout") {
                  handleLogout();
                } else {
                  if (item.onClick) item.onClick();
                  setShowMenu(false);
                }
              }}
            >
              <div className={`${activePage === item.name ? "text-[#3baca5]" : "text-gray-400"} flex items-center justify-center w-8 h-8 flex-shrink-0`}>
                {item.icon}
              </div>
              <span className={`font-medium text-base ${activePage === item.name ? "text-[#3baca5]" : "text-gray-300"} whitespace-nowrap ${!openSideBar && "md:hidden"}`}>
                {item.name}
              </span>
              {activePage === item.name && (
                <div className="ml-auto mr-2 flex-shrink-0">
                  <div className="w-2 h-2 bg-[#3baca5] rounded-full"></div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white w-full overflow-hidden">
      <RoboticLogoutModal 
        isOpen={showLogoutModal}
        onCancel={handleCancelLogout}
        onConfirm={handleLogoutConfirm}
      />
      
      <div className="w-full flex relative">
        {/* Mobile Menu Toggle Button */}
        <button 
          className="fixed top-4 left-4 z-50 h-10 w-10 flex items-center justify-center bg-[#1E1E1E] rounded-full shadow-lg text-[#3baca5] md:hidden"
          onClick={toggleMobileMenu}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={`transition-all duration-500 ease-in-out z-50 bg-[#1E1E1E] border-r border-gray-800 fixed top-0 left-0 flex flex-col gap-2 sm:gap-8 h-screen py-4
            ${showMenu ? "translate-x-0 w-64 px-4" : "-translate-x-full md:translate-x-0"} 
            ${openSideBar ? "md:w-64 md:px-4" : "md:w-20 md:px-2"}`
          }
        >
          <div className={`transition-all duration-500 ease-in-out flex gap-2 items-center 
            ${openSideBar ? "md:justify-between" : "md:justify-center"} cursor-pointer relative z-30`}>
            <div className="flex items-center">
              {(openSideBar || showMenu) ? (
                <img
                  src="https://www.enovarobotics.eu/wp-content/uploads/2020/03/logo-enova-02-314x100.png"
                  className="h-10 w-auto max-w-[180px] z-30 object-contain"
                  alt="Enova Robotics"
                />
              ) : (
                <img
                src="/src/assets/CollapsedLogo.png"
                className="h-12 w-12 z-30  object-contain"
                alt="Enova Robotics"
              />
              )}
            </div>
            
            {/* Mobile close button */}
            <button
              className="h-8 w-8 flex md:hidden justify-center items-center cursor-pointer text-gray-400"
              onClick={toggleMobileMenu}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            
            {/* Desktop toggle button */}
            <button
              className="h-8 w-8 hidden md:flex justify-center items-center cursor-pointer rounded-full bg-gray-800 hover:bg-gray-700 text-[#3baca5] transition-all duration-300 absolute -right-4"
              onClick={toggleSideBar}
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${openSideBar ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* User profile info in sidebar */}
          <div className={`flex items-center gap-3 p-3 mb-6 ${!openSideBar && "md:justify-center"} 
            border-b border-gray-800 pb-4`}>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-[#23A49B] to-[#2D8A83] text-white font-bold flex-shrink-0">
              {user.firstName ? user.firstName.charAt(0) : ''}
              {user.lastName ? user.lastName.charAt(0) : ''}
            </div>
            <div className={`flex flex-col overflow-hidden ${!openSideBar && "md:hidden"}`}>
              <span className="font-medium text-sm text-white whitespace-nowrap text-ellipsis overflow-hidden">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap text-ellipsis overflow-hidden">
                {user.role || "Manager"}
              </span>
            </div>
          </div>

          <SideNavbar 
            handleLogout={handleLogout} 
            openSideBar={openSideBar || showMenu}
            activePage={activePage}
            setActivePage={setActivePage}
          />
        </div>

        {/* Main content */}
        <div className={`transition-all duration-500 ease-in-out w-full md:ml-20 ${openSideBar ? "md:ml-64" : "md:ml-20"} flex-1 flex flex-col min-h-screen bg-[#121212]`}>
          {/* Header */}
          <div className={`${getHeaderGradient()} transition-all duration-1000 shadow-lg p-4 md:p-6 flex justify-between items-center relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-10">
              <CircuitPattern />
            </div>
            
            <div className="flex justify-between w-full items-center z-10 px-2 md:px-0">
              <div className="flex flex-col ml-10 md:ml-0">
                <span className="text-xl md:text-2xl font-bold text-white break-words max-w-[200px] md:max-w-[400px]">
                  {getGreeting()}, {user.firstName}!
                </span>
                <span className="text-xs md:text-sm font-normal text-gray-200 break-words max-w-[200px] md:max-w-[400px]">
                  {formattedDate}
                </span>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                {/* Quick action buttons - show only on desktop */}
                <div className="hidden md:flex gap-2">
                  <button 
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2A2A2A]/80 backdrop-blur-sm text-gray-400 hover:text-[#3baca5] transition-colors duration-300"
                    onClick={() => setActivePage("Calendar")}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button 
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2A2A2A]/80 backdrop-blur-sm text-gray-400 hover:text-[#3baca5] transition-colors duration-300"
                    onClick={() => setActivePage("Attendance")}
                  >
                    <Activity className="h-5 w-5" />
                  </button>
                  <button 
                                      className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2A2A2A]/80 backdrop-blur-sm text-gray-400 hover:text-[#3baca5] transition-colors duration-300"
                                      onClick={() => setActivePage("Chat")}
                                    >
                                      <MessageCircle className="h-5 w-5" />
                                      {unreadMessages > 0 && (
                                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                      </span>
                                    )}
                  </button>
                  <button 
                                      className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2A2A2A]/80 backdrop-blur-sm text-gray-400 hover:text-[#3baca5] transition-colors duration-300"
                                      onClick={() => setActivePage("Notifications")}
                                    >
                                      <Bell className="h-5 w-5" />
                                      {unreadNotifications> 0 && (
                                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                        {unreadNotifications}
                                      </span>
                                    )}
                 </button>
                </div>
                
                {/* User avatar - Clickable */}
                <div 
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-[#23A49B] to-[#2D8A83] flex justify-center items-center text-white font-bold shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActivePage("Profile")}
                  role="button"
                  aria-label="View Profile"
                >
                  {user.firstName ? user.firstName.charAt(0) : ''}
                  {user.lastName ? user.lastName.charAt(0) : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Page content with robotics-themed background */}
          <div className="flex-1 p-3 md:p-6 relative">
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
              <CircuitPattern />
            </div>
            {/* Home page with sub-pages */}
            {activePage === "MainDashboard" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                <ManagerDashboardHomePage />
              </div>
            )}

            {activePage === "PersonalDashboard" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                <PersonalDashboard personalView={true} />
              </div>
            )}

            {/* Initial redirect to main dashboard when "Home" is active */}
            {activePage === "Home" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                <ManagerDashboardHomePage />
              </div>
            )}
              
            {/* Employees page */}
            {activePage === "Employees" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                <EmployeePage />
              </div>
            )}
              {/* Leave Requests page */}
              {activePage === "Leave Requests" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                  <LeaveRequestPage />
                </div>
              )}
              
              {/* Attendance page */}
              {activePage === "Attendance" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                   <AttendanceManager />
                </div>
              )}
  
              {/* Calendar page */}
              {activePage === "Calendar" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                  <CalendarManager/>
                </div>
              )}
  
              {/* Profile page */}
              {activePage === "Profile" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                  <ProfilePage user={user} setUser={setUser} />
                </div>
              )}
                      
              {activePage === "Notifications" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                  <NotificationPage/>
                </div>
              )}
              
              {activePage === "Chat" && (
              <div className="p-3 md:p-6 mt-3 md:mt-5 bg-[#1E1E1E] rounded-lg shadow-xl border border-gray-800 relative z-10 overflow-x-auto">
                  <ChatComponent />
                </div>
              )}
              
              {/* ChatBot component */}
              <ChatBot />
            </div>
            
            <Footer />
          </div>
        </div>
      </div>
    );
};

export default ManagerDashboard;