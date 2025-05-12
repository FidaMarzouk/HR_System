import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import Swal from 'sweetalert2';

const CEO_LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState({
    filtered: [],
    all: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPageFiltered, setCurrentPageFiltered] = useState(1);
  const [currentPageAll, setCurrentPageAll] = useState(1);
  const requestsPerPage = 5;

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      // Fetch filtered leave requests for the first section
      const filteredResponse = await axios.get(
        "http://localhost:8080/api/leave-requests/superadmin/admin-leave-requests", 
        {   withCredentials: true }
      );
      
      // Fetch all leave requests for the table
      const allResponse = await axios.get(
        "http://localhost:8080/api/leave-requests", 
        {   withCredentials: true}
      );
      
      // Validate and set responses
      setLeaveRequests({
        filtered: Array.isArray(filteredResponse.data) ? filteredResponse.data : [],
        all: Array.isArray(allResponse.data) ? allResponse.data : []
      });
      
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch leave requests");
      setLeaveRequests({ filtered: [], all: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      
      await axios.put(`http://localhost:8080/api/leave-requests/superadmin/${requestId}/approve`, {}, {
        withCredentials: true
      });
      
      // Update filtered requests
      setLeaveRequests(prev => ({
        ...prev,
        filtered: prev.filtered.map(req => 
          req._id === requestId ? { ...req, status: 'CEO Approved' } : req
        )
      }));
      
      Swal.fire({
        title: 'Success!',
        text: 'Leave request approved successfully',
        icon: 'success',
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });
      
      // Refresh the data after approval
      fetchLeaveRequests();
    } catch (err) {
      console.error("Error approving request:", err);
      Swal.fire({
        title: 'Error!',
        text: err.response?.data?.message || 'Failed to approve request',
        icon: 'error',
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
        }
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
   
      
      await axios.put(`http://localhost:8080/api/leave-requests/superadmin/${requestId}/reject`, {}, {
        withCredentials: true
      });
      
      // Update filtered requests
      setLeaveRequests(prev => ({
        ...prev,
        filtered: prev.filtered.map(req => 
          req._id === requestId ? { ...req, status: 'CEO Rejected' } : req
        )
      }));
      
      Swal.fire({
        title: 'Rejected!',
        text: 'Leave request has been rejected',
        icon: 'info',
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-[#3baca5] hover:bg-[#2a7d78] text-white'
        }
      });
      
      // Refresh the data after rejection
      fetchLeaveRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
      Swal.fire({
        title: 'Error!',
        text: err.response?.data?.message || 'Failed to reject request',
        icon: 'error',
        customClass: {
          popup: 'bg-[#1E1E1E] text-white border border-gray-700',
          title: 'text-white',
          content: 'text-gray-300',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
        }
      });
    }
  };

  const getStatusBadge = (status) => {
    
    const lowercaseStatus = status.toLowerCase();
    const statusMappings = {
      'pending': {
        className: "bg-yellow-900/30 text-yellow-400 border border-yellow-600/30",
        icon: Clock,
        text: "Pending"
      },
      'approved': {
        className: "bg-green-900/30 text-green-400 border border-green-600/30",
        icon: CheckCircle,
        text: status
      },
      'ceo approved': {
        className: "bg-green-900/30 text-green-400 border border-green-600/30",
        icon: CheckCircle,
        text: status
      },
      'admin approved': {
        className: "bg-green-900/30 text-green-400 border border-green-600/30",
        icon: CheckCircle,
        text: status
      },
      'manager approved': {
        className: "bg-green-900/30 text-green-400 border border-green-600/30",
        icon: CheckCircle,
        text: status
      },
      'rejected': {
        className: "bg-red-900/30 text-red-400 border border-red-600/30",
        icon: XCircle,
        text: status
      },
      'ceo rejected': {
        className: "bg-red-900/30 text-red-400 border border-red-600/30",
        icon: XCircle,
        text: status
      },
      'admin rejected': {
        className: "bg-red-900/30 text-red-400 border border-red-600/30",
        icon: XCircle,
        text: status
      },
      'manager rejected': {
        className: "bg-red-900/30 text-red-400 border border-red-600/30",
        icon: XCircle,
        text: status
      }
    };

    const mapping = statusMappings[lowercaseStatus] || getDefaultStatusBadge(status);
    
    const Icon = mapping.icon;
    return (
      <div className={`px-2 py-1 rounded-full ${mapping.className} text-xs flex items-center gap-1 whitespace-nowrap`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[120px]">{mapping.text}</span>
      </div>
    );
  };
  
  const getDefaultStatusBadge = (status) => {
    return {
      className: "bg-gray-800 text-gray-400 border border-gray-700",
      icon: AlertTriangle,
      text: status || 'Unknown'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + (diffDays === 1 ? ' Day' : ' Days');
  };

  // Filter and sort filtered leave requests
  const filteredLeaveRequests = leaveRequests.filtered
    .filter(request => {
      if (filterStatus === "all") return true;
      
      const statusLower = request.status?.toLowerCase() || '';
      
      if (filterStatus === "pending" && statusLower === "pending") return true;
      if (filterStatus === "approved" && (
        statusLower === "approved" || 
        statusLower === "ceo approved" || 
        statusLower === "admin approved" ||
        statusLower === "manager approved"
      )) return true;
      if (filterStatus === "rejected" && (
        statusLower === "rejected" || 
        statusLower === "ceo rejected" || 
        statusLower === "admin rejected" ||
        statusLower === "manager rejected"
      )) return true;
      
      return false;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Pagination for filtered requests
  const indexOfLastFilteredRequest = currentPageFiltered * requestsPerPage;
  const indexOfFirstFilteredRequest = indexOfLastFilteredRequest - requestsPerPage;
  const currentFilteredRequests = filteredLeaveRequests.slice(
    indexOfFirstFilteredRequest, 
    indexOfLastFilteredRequest
  );
  const totalFilteredPages = Math.ceil(filteredLeaveRequests.length / requestsPerPage);

  // Pagination for all requests table
  const indexOfLastAllRequest = currentPageAll * requestsPerPage;
  const indexOfFirstAllRequest = indexOfLastAllRequest - requestsPerPage;
  const currentAllRequests = leaveRequests.all.slice(
    indexOfFirstAllRequest, 
    indexOfLastAllRequest
  );
  const totalAllPages = Math.ceil(leaveRequests.all.length / requestsPerPage);

  const getStatusColor = (status) => {
    if (!status) return "#6b7280"; // Default gray for missing status
    
    const statusColorMap = {
      "Manager Approved": "#23A49B",
      "Admin Approved": "#31638a",
      "CEO Approved": "#2a9d8f",
      "Admin Rejected": "#b91c1c",
      "CEO Rejected": "#e63946",
      "Manager Rejected": "#bc4749",
      "Pending": "#f59e0b",
      "default": "#6b7280"
    };
    return statusColorMap[status] || statusColorMap.default;
  };

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;
    
    // For small screens, show fewer page buttons
    const isSmallScreen = window.innerWidth < 640;
    const maxButtonsToShow = isSmallScreen ? 3 : 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);
    
    // Adjust start page if end page is at max
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxButtonsToShow + 1);
    }
    
    const pageButtons = [];
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 rounded ${
            currentPage === i 
              ? 'bg-[#3baca5] text-white' 
              : 'bg-[#2a2a2a] text-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex justify-center items-center space-x-2 mt-4 p-4 flex-wrap gap-y-2">
        <button 
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50 hidden sm:block"
        >
          First
        </button>
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50"
        >
          Prev
        </button>
        
        {pageButtons}
        
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50"
        >
          Next
        </button>
        <button 
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50 hidden sm:block"
        >
          Last
        </button>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 relative z-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#3baca5]" />
            Admin Leave Requests Management
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Manage and respond to leave requests from admin staff
          </p>
        </div>
        
        <button 
          onClick={fetchLeaveRequests}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] rounded-lg border border-gray-700 text-gray-300 transition-colors duration-300 text-sm w-full sm:w-auto justify-center sm:justify-start"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 bg-[#1E1E1E] p-3 sm:p-4 rounded-lg border border-gray-800">
        <div className="w-full sm:w-auto">
          <label className="text-sm text-gray-400 block mb-1 sm:mb-2">Filter by Status</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#232323] text-white border border-gray-700 rounded-lg px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-[#3baca5] w-full"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        
        <div className="w-full sm:w-auto">
          <label className="text-sm text-gray-400 block mb-1 sm:mb-2">Sort by Date</label>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-[#232323] text-white border border-gray-700 rounded-lg px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-[#3baca5] w-full"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
      
      {/* Content */}
      <div className="bg-[#1E1E1E] rounded-lg border border-gray-800 shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8 sm:p-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-[#3baca5]"></div>
          </div>
        ) : error ? (
          <div className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-300 mb-3 sm:mb-4">{error}</p>
            <button 
              onClick={fetchLeaveRequests}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#3baca5] hover:bg-[#2a7d78] rounded-lg text-white transition-colors duration-300 text-sm"
            >
              Try Again
            </button>
          </div>
        ) : currentFilteredRequests.length === 0 ? (
          <div className="p-4 sm:p-6 text-center">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-300 mb-1">No leave requests found</p>
            <p className="text-gray-500 text-sm">
              {filterStatus !== "all" 
                ? `There are no ${filterStatus} leave requests` 
                : "No leave requests have been submitted yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
            {currentFilteredRequests.map((request) => (
              <div 
                key={request._id} 
                className="p-3 sm:p-4 border border-gray-800 rounded-lg bg-[#232323] hover:bg-[#292929] transition-colors duration-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#3b7aca] to-[#2a5a7d] flex justify-center items-center text-white font-bold text-xs sm:text-sm">
                      {request.employeeId?.firstName?.charAt(0) || '?'}
                      {request.employeeId?.lastName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-sm sm:text-base">
                        {request.employeeId?.firstName || 'Unknown'} {request.employeeId?.lastName || 'User'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400">{request.employeeId?.role || 'Admin'}</p>
                    </div>
                  </div>
                  <div className="self-start sm:self-center">
                    {getStatusBadge(request.status || 'Pending')}
                  </div>
                </div>
                
                <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-400">Type</p>
                    <p className="text-white capitalize">{request.reason || 'Annual'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="text-white">
                      {calculateDuration(request.startDate, request.endDate)}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-400">Date</p>
                    <p className="text-white text-xs">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Requested On</p>
                    <p className="text-white">{formatDate(request.createdAt)}</p>
                  </div>
                </div>
                
                {request.reason && (
                  <div className="mt-3 p-2 sm:p-3 bg-[#1A1A1A] rounded-md">
                    <p className="text-gray-400 text-xs sm:text-sm mb-1">Reason:</p>
                    <p className="text-gray-300 text-xs sm:text-sm">{request.reason}</p>
                  </div>
                )}
                
                {(request.status === 'CEO Rejected' || request.status === 'Admin Rejected' || request.status === 'Manager Rejected') && request.rejectionReason && (
                  <div className="mt-3 p-2 sm:p-3 bg-red-900/20 border border-red-900/30 rounded-md">
                    <p className="text-red-400 text-xs sm:text-sm mb-1">Rejection Reason:</p>
                    <p className="text-gray-300 text-xs sm:text-sm">{request.rejectionReason}</p>
                  </div>
                )}
                
                {request.status === 'Pending' && (
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleApproveRequest(request._id)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#3baca5] hover:bg-[#2a7d78] text-white text-xs sm:text-sm transition-colors duration-200 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(request._id)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm transition-colors duration-200 flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination for Filtered Requests */}
      {!loading && !error && currentFilteredRequests.length > 0 && (
        renderPagination(currentPageFiltered, totalFilteredPages, setCurrentPageFiltered)
      )}
      
      {/* All Leave Requests Table Section */}
      <div className="bg-[#1E1E1E] rounded-lg border border-gray-800 shadow-md overflow-hidden">
        <h2 className="text-lg font-bold text-white p-3 sm:p-4 border-b border-gray-800">
          All Leave Requests
        </h2>
        
        {/* Responsive table container */}
        <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#3baca5]"></div>
            </div>
          ) : currentAllRequests.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-300">No leave requests available</p>
            </div>
          ) : (
            <table className="table-auto w-full text-left border-separate border-spacing-y-1 min-w-[600px]">
              <thead className="bg-[#2c2c2c] sticky top-0">
                <tr>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold">Employee</th>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold">Approved By</th>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold">From</th>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold">To</th>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold">Reason</th>
                  <th className="py-3 px-3 text-[#33adb4] text-xs sm:text-sm font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentAllRequests.map((request) => (
                  <tr key={request._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-white font-medium">
                      {request.employeeId?.firstName} {request.employeeId?.lastName}
                    </td>
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-gray-300">
                      {request.managerId?.firstName} {request.managerId?.lastName || 'N/A'}
                    </td>
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-gray-300">{formatDate(request.startDate)}</td>
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-gray-300">{formatDate(request.endDate)}</td>
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-gray-300 max-w-[120px] truncate">
                      {request.reason || 'N/A'}
                    </td>
                    <td className="py-3 sm:py-4 px-3 text-xs sm:text-sm text-center">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium inline-block whitespace-nowrap" 
                        style={{ 
                          backgroundColor: getStatusColor(request.status) + '33',
                          color: getStatusColor(request.status),
                          border: `1px solid ${getStatusColor(request.status)}`
                        }}
                      >
                        {request.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Pagination for All Requests */}
      {!loading && !error && currentAllRequests.length > 0 && (
        renderPagination(currentPageAll, totalAllPages, setCurrentPageAll)
      )}
    </div>
  );
};

export default CEO_LeaveRequests;