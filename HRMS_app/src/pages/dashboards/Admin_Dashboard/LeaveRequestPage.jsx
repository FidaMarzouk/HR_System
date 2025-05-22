import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css'; 
import "../../../../src/datepicker.css";
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaChevronLeft, 
  FaChevronRight, 
  FaRobot, 
  FaCalendarPlus,
  FaCalendarAlt,
  FaFilter,
  FaSort,
  FaSearch
} from 'react-icons/fa';
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

const LeaveRequestPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 9;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [remainingDays, setRemainingDays] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    superAdminId: "",
  });
  const [formErrors, setFormErrors] = useState({});

  
  // Filter states
  const [sortOrder, setSortOrder] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useState({
    employeeName: "",
    managerName: "",
    leaveType: "all"
  });
  // Leave types from the LeaveRequest model
  const leaveTypes = [
    'Sick Leave',
    'Vacation Leave',
    'Maternity Leave',
    'Personal Leave',
    'Emergency Leave',
    'Unpaid Leave',
    'Other'
  ];
  const showSwal = (icon, title, text) => {
    Swal.fire({
      icon,
      title,
      text,
      timer: 2000,
      background: '#1e262c',
      customClass: {
        popup: 'bg-[#1E1E1E] text-white border border-gray-700',
        title: 'text-white',
        content: 'text-gray-300',
        confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
      }
    });
  };
  // Status options for filter
  const statusOptions = [
    'all',
    'Pending', 
    'Manager Approved', 
    'Manager Rejected', 
    'Admin Approved', 
    'Admin Rejected',
    'CEO Approved',
    'CEO Rejected'
  ];

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

  useEffect(() => {
    fetchCurrentUser();
    fetchLeaveRequests();
    fetchSuperAdmin();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [leaveRequests, sortOrder, statusFilter, searchQuery, searchParams]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
     

      const response = await axios.get("http://localhost:8080/api/leave-requests", {
        withCredentials: true, 
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

  const fetchSuperAdmin = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/users/superadmin", {
        withCredentials: true,
      });
      if (response.data && response.data._id) {
        setSuperAdmin(response.data);
        setFormData(prev => ({
          ...prev,
          superAdminId: response.data._id
        }));
      }
    } catch (err) {
      console.error("Error fetching superadmin:", err.response?.data || err.message)
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/users/me', {
        withCredentials: true
      });
      
      if (response.data) {
        setCurrentUser(response.data);
        setRemainingDays(response.data.remainingLeaveDays);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };
  
  // Function to apply filters and sorting
  const applyFilters = () => {
    let filtered = [...leaveRequests];
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    
    // Apply leave type filter if not 'all'
    if (searchParams.leaveType !== 'all') {
      filtered = filtered.filter(request => request.reason === searchParams.leaveType);
    }
    
    // Apply search by employee name
    if (searchParams.employeeName.trim() !== "") {
      const query = searchParams.employeeName.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const fullName = `${request.employeeId?.firstName || ''} ${request.employeeId?.lastName || ''}`.toLowerCase();
        return fullName.includes(query);
      });
    }
    
    // Apply search by manager name
    if (searchParams.managerName.trim() !== "") {
      const query = searchParams.managerName.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const fullName = `${request.managerId?.firstName || ''} ${request.managerId?.lastName || ''}`.toLowerCase();
        return fullName.includes(query);
      });
    }
    
    // Apply general search query across all fields
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const employeeName = `${request.employeeId?.firstName || ''} ${request.employeeId?.lastName || ''}`.toLowerCase();
        const managerName = `${request.managerId?.firstName || ''} ${request.managerId?.lastName || ''}`.toLowerCase();
        const reason = (request.reason || '').toLowerCase();
        
        return employeeName.includes(query) || 
              managerName.includes(query) || 
              reason.includes(query);
      });
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
    try {
    
      const url = actionType === "approve"
        ? `http://localhost:8080/api/leave-requests/admin/${selectedRequest._id}/approve`
        : `http://localhost:8080/api/leave-requests/admin/${selectedRequest._id}/reject`;

      const response = await axios.put(
        url,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },withCredentials: true, 
        }
      );

      setIsModalOpen(false);

      Swal.fire({
        icon: "success",
        title: `Leave Request ${actionType === 'approve' ? 'Approved' : 'Rejected'}`,
        text: response.data.message || `The leave request has been ${actionType}d successfully!`,
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
        }
      });

      fetchLeaveRequests();

    } catch (err) {
      console.error("Error updating leave request:", err.response?.data || err.message);
      
      // Get the specific error message from the backend response
      const errorMessage = err.response?.data?.message || "There was an issue processing the leave request. Please try again.";
      
      Swal.fire({
        icon: "error",
        title: "Error",
        timer: 3000,
        text: errorMessage,
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
    
    // Clear error for this field when user changes it
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format dates to strip time components
    const startDateObj = new Date(formData.startDate);
    startDateObj.setHours(0, 0, 0, 0);
    
    const endDateObj = new Date(formData.endDate);
    endDateObj.setHours(0, 0, 0, 0);
    
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    } else if (startDateObj < today) {
      errors.startDate = "Start date cannot be in the past";
    }
    
    if (!formData.endDate) {
      errors.endDate = "End date is required";
    } else if (endDateObj < startDateObj) {
      errors.endDate = "End date must be after start date";
    }
    
    if (!formData.reason) {
      errors.reason = "Reason is required";
    }
    
    return errors;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateCreateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    try {
      
      const payload = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        superAdminId: formData.superAdminId
      };
      
      const response = await axios.post(
        "http://localhost:8080/api/leave-requests/create",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },withCredentials: true, 
        }
      );
      
      setIsCreateModalOpen(false);
      
      // Reset form after successful submission
      setFormData({
        startDate: "",
        endDate: "",
        reason: "",
        superAdminId: superAdmin ? superAdmin._id : ""
      });
      
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Leave request created successfully!",
        timer: 2000,
        background: '#1e262c',
        color: '#2dd4bf',
        showConfirmButton: false,
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-[#2dd4bf]',
          content: 'text-white'
      },
      });
      
      // Refresh leave requests list
      fetchLeaveRequests();
      
    } catch (err) {
      console.error("Error creating leave request:", err.response?.data || err.message);
      
      // Get specific error message from backend
      const errorMessage = err.response?.data?.message || "There was an issue creating the leave request. Please try again.";
      
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#33adb4] hover:bg-[#2a8c92] text-white'
        }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Manager Approved":
        return "#23A49B"; // Deep teal
      case "Manager Rejected":
        return "#D98872"; // Warm terracotta
        case "Admin Approved":
          return "#31638a"; // Muted blue
        case "Admin Rejected":
          return "#b91c1c"; // Strong red
          case "CEO Approved":
            return "#0D5C63"; // Brighter teal (primary brand color)
          case "CEO Rejected":
            return "#E17372";
      default:
        return "#6b7280";
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setActionType("");
  };

  const handleCreateLeaveRequest = () => {
    setIsCreateModalOpen(true);
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleAdvancedSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };
 
  const clearAllFilters = () => {
    setSearchQuery("");
    setSearchParams({
      employeeName: "",
      managerName: "",
      leaveType: "all"
    });
    setStatusFilter("all");
    setSortOrder("newest");
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

  // Get days difference between dates
  const getDaysDifference = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include end date
    return diffDays;
  };

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
              {/* Leave Balance Card */}
      <div className="w-full mb-4 bg-[#222] p-4 rounded-lg border border-[#333] shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Remaining Leave Balance:</span>
          <span className="text-xl font-semibold text-[#33adb4]">{remainingDays !== null ? remainingDays : '--'} days</span>
        </div>
      </div>
            {/* Search Bar */}
            <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by employee, manager, or leave type..."
            className="w-full py-2 px-4 pl-10 bg-[#222] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#33adb4] focus:border-transparent"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>
    
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
      {searchQuery && ` matching "${searchQuery}"`}
      {searchParams.employeeName && ` for employee "${searchParams.employeeName}"`}
      {searchParams.managerName && ` with manager "${searchParams.managerName}"`}
      {searchParams.leaveType !== 'all' && ` of type "${searchParams.leaveType}"`}
    </div>
    
        {/* Loading and Error States */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#33adb4]"></div>
          </div>
        ) : error ? (
          <div className="bg-[#2a2a2a] text-center p-6 rounded-lg border border-[#333]">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          /* Table */
          <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
            {/* Table for all screens with responsive adjustments */}
            <table className="table-auto w-full text-left border-separate border-spacing-y-1">
              <thead className="bg-[#2c2c2c] sticky top-0 hidden sm:table-header-group">
                <tr>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Employee</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">From</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">To</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Reason</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Duration</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Status</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map((request) => (
                  <tr 
                    key={request._id} 
                    className="bg-[#2a2a2a] hover:bg-[#333] transition-colors block sm:table-row mb-4 sm:mb-0 rounded-lg sm:rounded-none overflow-hidden"
                  >
                    {/* Employee - becomes header on mobile */}
                    <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">Employee</span>
                        <span>{request.employeeId?.firstName} {request.employeeId?.lastName}</span>
                      </div>
                    </td>
                    
                    {/* From date */}
                    <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">From</span>
                        <span>{formatDate(request.startDate)}</span>
                      </div>
                    </td>
                    
                    {/* To date */}
                    <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">To</span>
                        <span>{formatDate(request.endDate)}</span>
                      </div>
                    </td>
                    
                    {/* Reason */}
                    <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">Reason</span>
                        <span>{request.reason}</span>
                      </div>
                    </td>
                    {/* Duration */}
                      <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">Duration</span>
                        <span>{getDaysDifference(request.startDate, request.endDate)} days</span>
                      </div>
                    </td>
                    
                    {/* Status - centered on desktop */}
                    <td className="py-4 px-3 text-sm block sm:table-cell">
                      <div className="flex justify-between items-center sm:justify-center">
                        <span className="sm:hidden text-[#33adb4] font-medium">Status</span>
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
                    </td>
                    
                    {/* Actions - centered on both views */}
                    <td className="py-4 px-3 text-sm block sm:table-cell border-t sm:border-t-0 border-[#333] bg-[#222] sm:bg-transparent">
                      <div className="flex justify-end sm:justify-center space-x-2">
                        <button 
                          onClick={() => {
                            switch (request.status) {
                              case "Pending":
                                case "Manager Approved":
                                  case "Manager Rejected":
                                setSelectedRequest(request);
                                setActionType("approve");
                                setIsModalOpen(true);
                                break;
                              case "Admin Approved":
                                showSwal("warning", "Already Approved", "This leave request has already been approved.");
                                break;
                              case "Admin Rejected":
                                showSwal("info", "Request Already Rejected", "This leave request has already been rejected and cannot be approved.");
                                break;
                            }
                          }}
                          disabled={request.createdBy === "Admin"}
                          className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                            request.createdBy === "Admin" 
                              ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                              : 'bg-[#33adb4] hover:bg-[#2a8c92]'
                          }`}
                        >
                          <FaCheckCircle className="mr-1" /> Approve
                        </button>
    
                        <button 
                        onClick={() => {
                          switch (request.status) {
                            case "Pending":
                              case "Manager Approved":
                                case "Manager Rejected":                             
                              setSelectedRequest(request);
                              setActionType("reject");
                              setIsModalOpen(true);
                              break;
                            case "Admin Rejected":
                              showSwal("warning", "Already Rejected", "This leave request has already been rejected.");
                              break;
                            case "Admin Approved":
                              showSwal("info", "Request Already Approved", "This leave request has already been approved and cannot be rejected.");
                              break;
                          }
                        }}
                          disabled={request.createdBy === "Admin"}
                          className={`px-3 py-1 text-white rounded text-xs flex items-center transition-colors ${
                            request.createdBy === "Admin" 
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
        )}
    
        {/* Pagination Controls */}
        {filteredRequests.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 px-4 text-gray-300 gap-3">
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
              
              <div className="flex flex-wrap gap-1 justify-center">
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
                      <div className="relative">
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
                      </div>
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
                      <div className="relative">
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
                      </div>
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
                  {superAdmin ? (
                    <div className="flex items-center p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-white">
                      <input
                        type="hidden"
                        name="superAdminId"
                        value={formData.superAdminId}
                      />
                      <span>{superAdmin.firstName} {superAdmin.lastName}</span>
                    </div>
                  ) : (
                    <div className="p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-gray-500">
                      Loading super admin information...
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    <div className="col-span-1 sm:col-span-2 bg-[#2a2a2a] p-4 rounded-lg">
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

export default LeaveRequestPage;