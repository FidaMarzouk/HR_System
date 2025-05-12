import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css'; // Base styles
import "../../../../src/datepicker.css";
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaChevronLeft, FaChevronRight, FaRobot, FaCalendarPlus,FaFilter,
  FaSort } from 'react-icons/fa';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '../../../components/ui/alert-dialog';
import { Card, CardContent } from '../../../components/ui/card';

const ManagerLeaveRequestPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [remainingDays, setRemainingDays] = useState(null);
   const [filteredRequests, setFilteredRequests] = useState([]);
   const [admin, setAdmin] = useState([]);
       // Filter states
       const [sortOrder, setSortOrder] = useState("newest");
       const [statusFilter, setStatusFilter] = useState("all");
       const [showSortDropdown, setShowSortDropdown] = useState(false);
       const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    useEffect(() => {
      // Initialize dates to current date whenever the create modal is opened
      if (isCreateModalOpen) {
        const today = new Date();
        const formattedToday = format(today, 'yyyy-MM-dd');
        
        setFormData(prevData => ({
          ...prevData,
          startDate: formattedToday,
          endDate: formattedToday
        }));
      }
    }, [isCreateModalOpen]);
    
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    adminId: ''
  });

  const [formErrors, setFormErrors] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    adminId: ''
  });

  const leaveTypes = [
    'Sick Leave',
    'Vacation Leave',
    'Maternity Leave',
    'Personal Leave',
    'Emergency Leave',
    'Unpaid Leave',
  ];
   // Status options for filter
   const statusOptions = [
    'all',
    'Pending', 
    'Manager Approved', 
    'Manager Rejected', 
    'Admin Approved', 
    'Admin Rejected',
  ];


  useEffect(() => {
    fetchLeaveRequests();
    fetchAdmin();
    fetchRemainingDays();
  }, []);

  const fetchAdmin = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/users/admin", {
        withCredentials: true 
      });
      if (response.data && response.data._id) {
        setAdmin(response.data); 
        setFormData(prev => ({ 
          ...prev,
          adminId: response.data._id 
        }));
      }
    } catch (err) {
      console.error("Error fetching admin:", err.response?.data || err.message);
    }
  };
  const fetchRemainingDays = async () => {
    try {
     
      const response = await axios.get("http://localhost:8080/api/users/remaining-leave-days", {
        withCredentials: true
      });
      setRemainingDays(response.data.remainingLeaveDays);
    } catch (err) {
      console.error("Error fetching remaining days:", err);
    }
  };
 
  // Validate form data
  const validateForm = () => {
    const errors = {};
    const startDateObj = new Date(formData.startDate);
    const endDateObj = new Date(formData.endDate);
    const today = new Date();
    
    // Normalize dates to start of day for fair comparison
    startDateObj.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
  
    if (startDateObj < today) {
      errors.startDate = "Start date cannot be in the past";
    }
    if (endDateObj < startDateObj) {
      errors.endDate = "End date must be after start date";
    }
    if (!formData.reason) {
      errors.reason = "Please select a reason";
    }
  
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      
      await axios.post(
        "http://localhost:8080/api/leave-requests/create",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },withCredentials: true, 
        }
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Leave request created successfully!",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });

      setIsCreateModalOpen(false);
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
        adminId: ''
      });
      setFormErrors({});
      fetchLeaveRequests();
      fetchRemainingDays();
      fetchAdmin();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to create leave request";
      
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: '#33adb4',
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  useEffect(() => {
    applyFilters();
  }, [leaveRequests, sortOrder, statusFilter]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      
      const response = await axios.get("http://localhost:8080/api/leave-requests", {
        withCredentials: true
      });

      if (Array.isArray(response.data)) {
        setLeaveRequests(response.data);
      } else {
        setError("Unexpected data format received");
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err.response?.data || err.message);
      setError("Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  };

    // Function to apply filters and sorting
    const applyFilters = () => {
      let filtered = [...leaveRequests];
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        filtered = filtered.filter(request => request.status === statusFilter);
      }
      
      // Apply sort order
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startDate);
        const dateB = new Date(b.createdAt || b.startDate);
        
        return sortOrder === "newest" 
          ? dateB - dateA // newest first
          : dateA - dateB; // oldest first
      });
      
      setFilteredRequests(filtered);
      // Reset to page 1 when filters change
      setCurrentPage(1);
    };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDecision = async () => {
    if (!selectedRequest) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No leave request selected. Please try again.",
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });
      return;
    }

    try {
      
      const url = actionType === "approve"
        ? `http://localhost:8080/api/leave-requests/manager/${selectedRequest._id}/approve`
        : `http://localhost:8080/api/leave-requests/manager/${selectedRequest._id}/reject`;

      await axios.put(
        url,
        {},
        {
          headers: {
           
            "Content-Type": "application/json",
          },  withCredentials: true
        }
      );

      setIsModalOpen(false);

      Swal.fire({
        icon: "success",
        title: `Leave Request ${actionType === 'approve' ? 'Approved' : 'Rejected'}`,
        text: `The leave request has been ${actionType}d successfully!`,
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });

      fetchLeaveRequests();

    } catch (err) {
      console.error("Error updating leave request:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "There was an issue processing the leave request. Please try again.",
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Manager Approved":
        return "#33adb4";
      case "Admin Approved":
        return "#31638a";
      case "Manager Rejected":
      case "Admin Rejected":
        return "#b91c1c";
      case "Pending":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };
  

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setActionType("");
  };
   // Handle sort dropdown toggle
   const toggleSortDropdown = () => {
    setShowSortDropdown(!showSortDropdown);
    // Close the other dropdown if open
    if (showStatusDropdown) setShowStatusDropdown(false);
  };
  
  // Handle status dropdown toggle
  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown);
    // Close the other dropdown if open
    if (showSortDropdown) setShowSortDropdown(false);
  };
  
  // Set sort order and close dropdown
  const handleSortChange = (order) => {
    setSortOrder(order);
    setShowSortDropdown(false);
  };
  
  // Set status filter and close dropdown
  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setShowStatusDropdown(false);
  };

   // Pagination calculations
   const indexOfLastRequest = currentPage * requestsPerPage;
   const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
   const currentRequests = Array.isArray(filteredRequests) 
     ? filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest) 
     : [];
   const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
 

  // Pagination controls
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

   // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (showSortDropdown || showStatusDropdown) {
          if (!event.target.closest('.dropdown-container')) {
            setShowSortDropdown(false);
            setShowStatusDropdown(false);
          }
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showSortDropdown, showStatusDropdown]);

  const renderResponsiveTableOrCards = () => {
   
  
    return (
      <>
           {/* Filter Controls */}
           <div className="flex flex-wrap gap-3 mb-4">
                {/* Sort Order Dropdown */}
                <div className="relative dropdown-container">
                  <button 
                    onClick={toggleSortDropdown}
                    className="px-3 py-2 bg-[#222] text-white rounded flex items-center transition-all hover:bg-[#333] border border-[#444] text-sm"
                  >
                    <FaSort className="mr-2 text-[#33adb4]" />
                    {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute mt-2 w-48 bg-[#222] rounded-md shadow-lg z-10 border border-[#444]">
                      <div className="py-1">
                        <button
                          onClick={() => handleSortChange("newest")}
                          className={`block px-4 py-2 text-sm w-full text-left ${
                            sortOrder === "newest" 
                            ? "bg-[#33adb4] text-white" 
                            : "text-gray-300 hover:bg-[#333]"
                          }`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => handleSortChange("oldest")}
                          className={`block px-4 py-2 text-sm w-full text-left ${
                            sortOrder === "oldest" 
                            ? "bg-[#33adb4] text-white" 
                            : "text-gray-300 hover:bg-[#333]"
                          }`}
                        >
                          Oldest First
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Status Filter Dropdown */}
                <div className="relative dropdown-container">
                  <button 
                    onClick={toggleStatusDropdown}
                    className="px-3 py-2 bg-[#222] text-white rounded flex items-center transition-all hover:bg-[#333] border border-[#444] text-sm"
                  >
                    <FaFilter className="mr-2 text-[#33adb4]" />
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute mt-2 w-60 bg-[#222] rounded-md shadow-lg z-10 border border-[#444] max-h-80 overflow-y-auto">
                      <div className="py-1">
                        {statusOptions.map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`block px-4 py-2 text-sm w-full text-left ${
                              statusFilter === status 
                              ? "bg-[#33adb4] text-white" 
                              : "text-gray-300 hover:bg-[#333]"
                            }`}
                          >
                            {status === "all" ? "All Statuses" : status}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
        
              {/* Filter Results Count */}
              <div className="mb-3 text-sm text-gray-400">
                Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
                {statusFilter !== 'all' && ` with status "${statusFilter}"`}
              </div>
        {/* For larger screens - Table view */}
        <div className="hidden md:block w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
          <table className="table-auto w-full text-left border-separate border-spacing-y-1">
            <thead className="bg-[#2c2c2c] sticky top-0">
              <tr>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Employee</th>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">From</th>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">To</th>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Reason</th>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Status</th>
                <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRequests.map((request) => (
                <tr key={request._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                  <td className="py-4 px-3 text-sm text-gray-300">{request.employeeId?.firstName} {request.employeeId?.lastName}</td>
                  <td className="py-4 px-3 text-sm text-gray-300">{formatDate(request.startDate)}</td>
                  <td className="py-4 px-3 text-sm text-gray-300">{formatDate(request.endDate)}</td>
                  <td className="py-4 px-3 text-sm text-gray-300">{request.reason}</td>
                  <td className="py-4 px-3 text-sm text-center">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium" 
                      style={{ 
                        backgroundColor: getStatusColor(request.status) + '33',
                        color: getStatusColor(request.status),
                        border: `1px solid ${getStatusColor(request.status)}`
                      }}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-sm text-center">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => {
                          if ((request.status === "Manager Rejected") || (request.status === "Pending")) {
                            setSelectedRequest(request);
                            setActionType("approve");
                            setIsModalOpen(true);
                          } else {
                            Swal.fire({
                              icon: "warning",
                              title: "Already Approved",
                              text: "This leave request has already been approved.",
                              customClass: {
                                popup: 'bg-[#1E1E1E] text-white border border-gray-700',
                                title: 'text-white',
                                content: 'text-gray-300',
                                confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
                              }
                            });
                          }
                        }}
                        disabled={request.createdBy === "Manager"}
                        className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                          request.createdBy === "Manager" 
                            ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                            : 'bg-[#33adb4] hover:bg-[#2a8c92]'
                        }`}
                      >
                        <FaCheckCircle className="mr-1" /> Approve
                      </button>
  
                      <button 
                        onClick={() => {
                          if ((request.status === "Manager Approved") || (request.status === "Pending")){
                            setSelectedRequest(request);
                            setActionType("reject");
                            setIsModalOpen(true);
                          } else {
                            Swal.fire({
                              icon: "warning",
                              title: "Already Rejected",
                              text: "This leave request has already been rejected.",
                              customClass: {
                                popup: 'bg-[#1E1E1E] text-white border border-gray-700',
                                title: 'text-white',
                                content: 'text-gray-300',
                                confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
                              }
                            });
                          }
                        }}
                        disabled={request.createdBy === "Manager"}
                        className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                          request.createdBy === "Manager" 
                            ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                            : 'bg-[#31638a] hover:bg-[#264e6e]'
                        }`}
                      >
                        <FaTimesCircle className="mr-1" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       
  
        {/* For mobile/smaller screens - Card view */}
        <div className="md:hidden space-y-4">
          {currentRequests.map((request) => (
            <div key={request._id} className="bg-[#2a2a2a] rounded-lg border border-[#333] overflow-hidden shadow">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-white font-medium">{request.employeeId?.firstName} {request.employeeId?.lastName}</h3>
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium" 
                    style={{ 
                      backgroundColor: getStatusColor(request.status) + '33',
                      color: getStatusColor(request.status),
                      border: `1px solid ${getStatusColor(request.status)}`
                    }}
                  >
                    {request.status}
                  </span>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[#33adb4]">From</p>
                    <p className="text-gray-300">{formatDate(request.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-[#33adb4]">To</p>
                    <p className="text-gray-300">{formatDate(request.endDate)}</p>
                  </div>
                  <div className="col-span-2 mt-1">
                    <p className="text-[#33adb4]">Reason</p>
                    <p className="text-gray-300">{request.reason}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-3 bg-[#222] flex justify-end space-x-2">
                <button 
                  onClick={() => {
                    if ((request.status === "Manager Rejected") || (request.status === "Pending")) {
                      setSelectedRequest(request);
                      setActionType("approve");
                      setIsModalOpen(true);
                    } else {
                      Swal.fire({
                        icon: "warning",
                        title: "Already Approved",
                        text: "This leave request has already been approved.",
                        customClass: {
                          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
                          title: 'text-white',
                          content: 'text-gray-300',
                          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
                        }
                      });
                    }
                  }}
                  disabled={request.createdBy === "Manager"}
                  className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                    request.createdBy === "Manager" 
                      ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                      : 'bg-[#33adb4] hover:bg-[#2a8c92]'
                  }`}
                >
                  <FaCheckCircle className="mr-1" /> Approve
                </button>
  
                <button 
                  onClick={() => {
                    if ((request.status === "Manager Approved") || (request.status === "Pending")){
                      setSelectedRequest(request);
                      setActionType("reject");
                      setIsModalOpen(true);
                    } else {
                      Swal.fire({
                        icon: "warning",
                        title: "Already Rejected",
                        text: "This leave request has already been rejected.",
                        customClass: {
                          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
                          title: 'text-white',
                          content: 'text-gray-300',
                          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
                        }
                      });
                    }
                  }}
                  disabled={request.createdBy === "Manager"}
                  className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                    request.createdBy === "Manager" 
                      ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                      : 'bg-[#31638a] hover:bg-[#264e6e]'
                  }`}
                >
                  <FaTimesCircle className="mr-1" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };
  
  // Then, in your return statement, replace the table section with:
  return (
    <div className="p-3 bg-[#1a1a1a] flex flex-col rounded-xl border border-[#333333] shadow-lg">
      {/* Header and Create Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <FaRobot className="text-[#33adb4] text-2xl mr-2" />
          <span className="text-[#33adb4] text-2xl font-semibold">Leave Requests</span>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-[#33adb4] text-white rounded flex items-center transition-all hover:bg-[#2a8c92] shadow-lg"
        >
          <FaCalendarPlus className="mr-2" />
          Create Leave Request
        </button>
      </div>
  
      {/* Responsive Leave Request Table/Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#33adb4]"></div>
        </div>
      ) : error ? (
        <div className="bg-[#2a2a2a] text-center p-6 rounded-lg border border-[#333]">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        renderResponsiveTableOrCards()
      )}
  
      {/* Responsive Pagination Controls */}
      {filteredRequests.length > 0 && (
             <div className="flex items-center justify-between mt-4 px-4 text-gray-300">
               <div className="text-sm">
                 Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, filteredRequests.length)} of {filteredRequests.length} requests
               </div>
               <div className="flex items-center space-x-2">
                 <button
                   onClick={handlePrevPage}
                   disabled={currentPage === 1}
                   className={`p-2 rounded-lg ${
                     currentPage === 1
                       ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                       : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
                   }`}
                 >
                   <FaChevronLeft className="w-4 h-4" />
                 </button>
                 
                 <div className="flex space-x-1">
                   {[...Array(totalPages)].map((_, index) => (
                     <button
                       key={index + 1}
                       onClick={() => handlePageChange(index + 1)}
                       className={`px-3 py-1 rounded-lg ${
                         currentPage === index + 1
                           ? 'bg-[#31638a] text-white'
                           : 'bg-[#333] text-gray-400 hover:bg-[#444] transition-colors'
                       }`}
                     >
                       {index + 1}
                     </button>
                   ))}
                 </div>
     
                 <button
                   onClick={handleNextPage}
                   disabled={currentPage === totalPages}
                   className={`p-2 rounded-lg ${
                     currentPage === totalPages
                       ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                       : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
                   }`}
                 >
                   <FaChevronRight className="w-4 h-4" />
                 </button>
               </div>
             </div>
           )}

      {/* Create Leave Request Modal */}
{/* Create Leave Request Modal */}
<AlertDialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
  <AlertDialogContent className="max-w-[700px] max-h-[90vh] p-0 overflow-hidden !bg-[#222] border !border-[#333] !text-white">
    <AlertDialogHeader className="px-6 py-4 !bg-[#33adb4]">
      <AlertDialogTitle className="text-2xl font-bold text-white">
        Create Leave Request
      </AlertDialogTitle>
    </AlertDialogHeader>

    <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-80px)]">
      <div className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-md border border-[#333] shadow-sm mb-4">
        <span className="text-sm font-medium text-gray-300">Total Remaining Leaves:</span>
        <span className="text-2xl font-semibold text-[#33adb4]">{remainingDays !== null ? remainingDays : '--'}</span>
      </div>

      <form onSubmit={handleCreateSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <div className="custom-datepicker-container relative">
              <DatePicker
                selected={formData.startDate ? new Date(formData.startDate) : null}
                onChange={(date) => {
                  handleInputChange({
                    target: {
                      name: 'startDate',
                      value: date ? format(date, 'yyyy-MM-dd') : ''
                    }
                  });
                }}
                dateFormat="dd/MM/yyyy"
                className={`w-full p-2 pl-9 bg-[#2a2a2a] border rounded-md text-white ${
                  formErrors.startDate ? 'border-red-500' : 'border-[#444]'
                }`}
                required
              />
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#33adb4]" />
              {formErrors.startDate && (
                <p className="text-red-500 text-sm mt-1">{formErrors.startDate}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <div className="custom-datepicker-container relative">
              <DatePicker
                selected={formData.endDate ? new Date(formData.endDate) : null}
                onChange={(date) => {
                  handleInputChange({
                    target: {
                      name: 'endDate',
                      value: date ? format(date, 'yyyy-MM-dd') : ''
                    }
                  });
                }}
                dateFormat="dd/MM/yyyy"
                className={`w-full p-2 pl-9 bg-[#2a2a2a] border rounded-md text-white ${
                  formErrors.endDate ? 'border-red-500' : 'border-[#444]'
                }`}
                required
              />
              <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#33adb4]" />
              {formErrors.endDate && (
                <p className="text-red-500 text-sm mt-1">{formErrors.endDate}</p>
              )}
            </div>
          </div>
        </div>

              <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reports To
              </label>
              {admin ? (
                <div className="flex items-center p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-white">
                  <input
                    type="hidden"
                    name="adminId"
                    value={formData.adminId}
                  />
                  <span>{admin.firstName} {admin.lastName}</span>
                </div>
              ) : (
                <div className="p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-gray-500">
                  Loading admin information...
                </div>
              )}
            </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Reason for Leave
          </label>
          <select
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            className={`w-full p-2 bg-[#2a2a2a] border rounded-md text-white ${
              formErrors.reason ? 'border-red-500' : 'border-[#444]'
            }`}
            required
          >
            <option value="">Select Reason</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {formErrors.reason && (
            <p className="text-red-500 text-sm mt-1">{formErrors.reason}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <AlertDialogCancel 
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </AlertDialogCancel>
          <button
            type="submit"
            className="px-4 py-2 bg-[#33adb4] hover:bg-[#2a8c92] text-white rounded-lg transition-colors flex items-center"
          >
            <FaCheckCircle className="mr-2" />
            Submit Request
          </button>
        </div>
      </form>
    </div>
  </AlertDialogContent>
</AlertDialog>

      {/* Approve/Reject Modal */}
      <AlertDialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <AlertDialogContent className="max-w-[600px] p-0 overflow-hidden !bg-[#222] border !border-[#333] !text-white">
          <AlertDialogHeader className="px-6 py-4 !bg-[#33adb4]">
            <AlertDialogTitle className="text-2xl font-bold text-white">
              {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </AlertDialogTitle>
          </AlertDialogHeader>

          {selectedRequest && (
            <Card className="m-6 border !border-[#333] !bg-[#1a1a1a] shadow-md">
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Employee</p>
                    <p className="text-base font-medium text-white">{`${selectedRequest.employeeId?.firstName} ${selectedRequest.employeeId?.lastName}`}</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Start Date</p>
                    <p className="text-base font-medium text-white">{formatDate(selectedRequest.startDate)}</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">End Date</p>
                    <p className="text-base font-medium text-white">{formatDate(selectedRequest.endDate)}</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Current Status</p>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium" 
                      style={{ 
                        backgroundColor: getStatusColor(selectedRequest.status) + '33',
                        color: getStatusColor(selectedRequest.status),
                        border: `1px solid ${getStatusColor(selectedRequest.status)}`
                      }}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="col-span-2 bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Reason</p>
                    <p className="text-base font-medium text-white">{selectedRequest.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="px-6 pb-6">
            <AlertDialogDescription className="text-gray-300 text-base">
              {actionType === 'approve' 
                ? 'Are you sure you want to approve this leave request?' 
                : 'Are you sure you want to reject this leave request?'}
            </AlertDialogDescription>

            <AlertDialogFooter className="mt-6 space-x-3">
              <AlertDialogCancel 
                onClick={handleCloseModal}
                className="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDecision}
                className={`px-4 py-2 rounded-lg flex items-center justify-center min-w-[120px] transition-colors ${
                  actionType === 'approve' 
                    ? 'bg-[#33adb4] hover:bg-[#2a8c92]' 
                    : 'bg-[#31638a] hover:bg-[#264e6e]'
                }`}
              >
                {actionType === 'approve' ? (
                  <>
                    <FaCheckCircle className="mr-2" />
                    Approve
                  </>
                ) : (
                  <>
                    <FaTimesCircle className="mr-2" />
                    Reject
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagerLeaveRequestPage;