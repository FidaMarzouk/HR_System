import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import "../../../../src/datepicker.css";
import { FaCalendarAlt, FaCheckCircle, FaChevronLeft, FaChevronRight, FaRobot, FaCalendarPlus, FaEye } from 'react-icons/fa';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '../../../components/ui/alert-dialog';
import { Card, CardContent } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert.jsx';

const EmployeeLeaveRequestPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [manager, setManager] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingDays, setRemainingDays] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const requestsPerPage = 5;

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
    
  const leaveTypes = [
    'Sick Leave',
    'Vacation Leave',
    'Maternity Leave',
    'Personal Leave',
    'Emergency Leave',
    'Unpaid Leave',
  ];
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    managerId: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    managerId: ''
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchLeaveRequests();
    fetchManager();
  }, []);

  // Validate form data
  const validateForm = () => {
    const errors = {};
    const startDateObj = new Date(formData.startDate);
    const endDateObj = new Date(formData.endDate);
    const today = new Date();

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

  const fetchManager = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/users/manager", {
        withCredentials: true
      });
      
      if (response.data.length > 0) {
        setManager(response.data[0]);
        // Set the managerId in the form data
        setFormData(prevData => ({
          ...prevData,
          managerId: response.data[0]._id
        }));
      }
    } catch (err) {
      console.error("Error fetching manager:", err);
    }
  };

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
      console.error("Error fetching leave requests:", err);
      setError("Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await axios.post(
        "http://localhost:8080/api/leave-requests/create",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },  
          withCredentials: true
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
        managerId: manager ? manager._id : ''
      });
      setFormErrors({});
      
      // Refresh data
      fetchCurrentUser(); // This will update the remaining days
      fetchLeaveRequests();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to create leave request";
      
      Swal.fire({
        icon: "error",
        title: "Error",
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
  };

    // Get days difference between dates
    const getDaysDifference = (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include end date
      return diffDays;
    };

  // Pagination Logic
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = leaveRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(leaveRequests.length / requestsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper function to get status color
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
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[#1a1a1a] flex flex-col rounded-xl border border-[#333333] shadow-lg">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center">
          <FaRobot className="text-[#33adb4] text-2xl mr-2" />
          <span className="text-[#33adb4] text-xl md:text-2xl font-semibold">My Leave Requests</span>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 bg-[#33adb4] text-white rounded flex items-center justify-center transition-all hover:bg-[#2a8c92] shadow-lg"
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

      {/* Leave Request Table - Responsive container */}
      <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
        <table className="table-auto w-full text-left border-separate border-spacing-y-1">
          <thead className="bg-[#2c2c2c] sticky top-0">
            <tr>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold whitespace-nowrap">From</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold whitespace-nowrap">To</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold whitespace-nowrap">Reason</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Duration</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold whitespace-nowrap">Reports To</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center whitespace-nowrap min-w-[120px]">Status</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.length === 0 ? (
              <tr className="bg-[#2a2a2a]">
                <td colSpan="6" className="py-6 text-center text-gray-400">No leave requests found</td>
              </tr>
            ) : (
              currentRequests.map((request) => (
                <tr key={request._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                  <td className="py-4 px-3 text-sm text-gray-300">{formatDate(request.startDate)}</td>
                  <td className="py-4 px-3 text-sm text-gray-300">{formatDate(request.endDate)}</td>
                  <td className="py-4 px-3 text-sm text-gray-300 max-w-[150px] truncate">{request.reason}</td>    
                  <td className="py-4 px-3 text-sm text-gray-300 block sm:table-cell">
                      <div className="flex justify-between items-center sm:block">
                        <span className="sm:hidden text-[#33adb4] font-medium">Duration</span>
                        <span>{getDaysDifference(request.startDate, request.endDate)} days</span>
                      </div>
                    </td>
                  <td className="py-4 px-3 text-sm text-gray-300 whitespace-nowrap">
                    {request.managerId?.firstName} {request.managerId?.lastName}
                  </td>
                  <td className="py-4 px-3 text-sm text-center">
                    <div className="flex justify-center">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
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
                  <td className="py-4 px-3 text-sm text-center">
                    <button 
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsViewModalOpen(true);
                      }}
                      className="px-3 py-1 bg-[#31638a] text-white rounded text-xs hover:bg-[#264e6e] transition-colors"
                      aria-label="View details"
                    >
                      <FaEye className="mr-1 inline" /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls - More responsive layout */}
      {leaveRequests.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 text-gray-300 gap-2">
          <div className="text-xs sm:text-sm order-2 sm:order-1">
            Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, leaveRequests.length)} of {leaveRequests.length} requests
          </div>
          <div className="flex items-center space-x-1 order-1 sm:order-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                  : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
              }`}
              aria-label="Previous page"
            >
              <FaChevronLeft className="w-3 h-3" />
            </button>
            
            <div className="flex space-x-1">
              {/* Only show page numbers for small number of pages, otherwise show current page with ellipsis */}
              {totalPages <= 5 ? (
                [...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === index + 1
                        ? 'bg-[#31638a] text-white'
                        : 'bg-[#333] text-gray-400 hover:bg-[#444] transition-colors'
                    }`}
                    aria-label={`Page ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))
              ) : (
                <>
                  {/* First page */}
                  <button
                    onClick={() => handlePageChange(1)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === 1
                        ? 'bg-[#31638a] text-white'
                        : 'bg-[#333] text-gray-400 hover:bg-[#444] transition-colors'
                    }`}
                    aria-label="Page 1"
                  >
                    1
                  </button>
                  
                  {/* Ellipsis or second page */}
                  {currentPage > 3 && (
                    <span className="px-1 py-1 text-gray-500">...</span>
                  )}
                  
                  {/* Current page neighborhood */}
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    // Show current page and one page before/after (if they exist)
                    if (
                      (pageNumber === currentPage - 1 && pageNumber > 1) ||
                      (pageNumber === currentPage && pageNumber !== 1 && pageNumber !== totalPages) ||
                      (pageNumber === currentPage + 1 && pageNumber < totalPages)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-1 rounded-lg ${
                            currentPage === pageNumber
                              ? 'bg-[#31638a] text-white'
                              : 'bg-[#333] text-gray-400 hover:bg-[#444] transition-colors'
                          }`}
                          aria-label={`Page ${pageNumber}`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  {/* Ellipsis or second-to-last page */}
                  {currentPage < totalPages - 2 && (
                    <span className="px-1 py-1 text-gray-500">...</span>
                  )}
                  
                  {/* Last page */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === totalPages
                        ? 'bg-[#31638a] text-white'
                        : 'bg-[#333] text-gray-400 hover:bg-[#444] transition-colors'
                    }`}
                    aria-label={`Page ${totalPages}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${
                currentPage === totalPages
                  ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                  : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
              }`}
              aria-label="Next page"
            >
              <FaChevronRight className="w-3 h-3" />
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
                  {manager ? (
                    <div className="flex items-center p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-white">
                      <input
                        type="hidden"
                        name="managerId"
                        value={formData.managerId}
                      />
                      <span>{manager.firstName} {manager.lastName}</span>
                    </div>
                  ) : (
                    <div className="p-2 bg-[#2a2a2a] border border-[#444] rounded-md text-gray-500">
                      Loading manager information...
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

      {/* View Details Modal */}
      <AlertDialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <AlertDialogContent className="max-w-[600px] p-0 overflow-hidden !bg-[#222] border !border-[#333] !text-white">
          <AlertDialogHeader className="px-6 py-4 !bg-[#33adb4]">
            <AlertDialogTitle className="text-2xl font-bold text-white">
              Leave Request Details
            </AlertDialogTitle>
          </AlertDialogHeader>

          {selectedRequest && (
            <Card className="mx-6 my-4 border border-[#333] !bg-[#1a1a1a] shadow-md">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Start Date</p>
                    <p className="text-base font-medium text-white">{formatDate(selectedRequest.startDate)}</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">End Date</p>
                    <p className="text-base font-medium text-white">{formatDate(selectedRequest.endDate)}</p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Reports To</p>
                    <p className="text-base font-medium text-white">
                      {selectedRequest.managerId?.firstName} {selectedRequest.managerId?.lastName}
                    </p>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-lg">
                    <p className="text-sm font-semibold text-[#33adb4] mb-1">Status</p>
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
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
                    <p className="text-base font-medium text-white break-words">{selectedRequest.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="px-6 pb-6">
            <AlertDialogFooter className="mt-2">
              <AlertDialogCancel 
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-300 rounded-lg transition-colors"
              >
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeLeaveRequestPage;