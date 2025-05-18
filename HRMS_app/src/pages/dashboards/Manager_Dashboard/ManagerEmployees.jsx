import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { FaUserTie, FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa';
import {User } from "lucide-react";

const ManagerEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const employeesPerPage = 5;

  // Fetch employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        

        const response = await axios.get("http://localhost:8080/api/users", {
          withCredentials: true
        });
        setEmployees(response.data.employees || []);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setError("Failed to load employees.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Pagination logic
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = employees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(employees.length / employeesPerPage);

  // Handle pagination
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Handle view details
  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  return (
    <div className="p-3 bg-[#1a1a1a] flex flex-col rounded-xl border border-[#333333] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-1 mb-4">
        <div className="flex items-center">
          <FaUserTie className="text-[#33adb4] text-2xl mr-2" />
          <span className="text-[#33adb4] text-2xl font-semibold">Employees List</span>
        </div>
      </div>

      {/* Employee Table */}
      <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
        <table className="table-auto w-full text-left border-separate border-spacing-y-1">
          <thead className="bg-[#2c2c2c] sticky top-0">
            <tr>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold"></th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Name</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Email</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Phone</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Position</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Department</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Hire Date</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Allowed Leaves</th>
              <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.map((employee) => (
              <tr key={employee._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm">
                          <div className="h-12 w-12 rounded-full border-2 border-[#33adb4] overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                          {employee.profilePicture ? (
                              <img 
                                src={`http://localhost:8080${employee.profilePicture}`} 
                                alt="Profile"
                                className="h-12 w-12 object-cover"
                              />
                            ) : (
                              <User className="h-8 w-8 text-[#33adb4]" />
                            )}
                          </div>
                </td>
                <td className="py-4 px-3 text-sm text-gray-300">{`${employee.firstName} ${employee.lastName}`}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{employee.email}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{employee.phone}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{employee.position}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{employee.departmentId?.name || "N/A"}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{new Date(employee.hireDate).toLocaleDateString()}</td>
                <td className="py-4 px-3 text-sm text-gray-300">{employee.leaveRequestAllowed}</td>
                <td className="py-4 px-3 text-sm text-center">
                  <button 
                    onClick={() => handleViewDetails(employee)}
                    className="px-3 py-1 bg-[#31638a] text-white rounded text-xs flex items-center hover:bg-[#264e6e] transition-colors mx-auto"
                  >
                    <FaEye className="mr-1" /> View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 px-4 text-gray-300">
        <div className="text-sm">
          Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, employees.length)} of {employees.length} employees
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

{/* Employee Details Modal */}
{modalOpen && selectedEmployee && (
<div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
  <Card className="w-full max-w-md md:max-w-xl max-h-[80vh] overflow-y-auto !bg-[#222] border !border-[#333] !text-white shadow-xl">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#333] !bg-[#33adb4]">
      <CardTitle className="text-xl md:text-2xl font-bold text-white">
        Employee Profile
      </CardTitle>
      <button
        onClick={() => setModalOpen(false)}
        className="text-white hover:text-gray-200 text-2xl font-bold"
      >
        ×
      </button>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
      {/* Profile Picture Section */}
      <div className="flex justify-center items-center col-span-1 md:col-span-2">
        {selectedEmployee.profilePicture ? (
          <img
            src={`http://localhost:8080${selectedEmployee.profilePicture}`}
            alt="Profile"
            className="mt-2 h-24 w-24 object-cover rounded-full border-2 border-[#33adb4] mx-auto"
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center rounded-full border-4 border-[#33adb4] shadow-md">
            <User className="h-8 w-8 text-[#33adb4]" />
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#444] rounded-lg">
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">First Name</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{selectedEmployee.firstName}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Last Name</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{selectedEmployee.lastName}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Department</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{selectedEmployee.departmentId?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Date Of Join</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Position</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{selectedEmployee.position}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#444] rounded-lg">
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Phone</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 truncate">{selectedEmployee.phone}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33adb4]">Email</p>
            <p className="border border-[#444] rounded-md p-2 text-gray-300 break-all">{selectedEmployee.email}</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Skills</h3>
        <div className="flex flex-wrap gap-2 p-4 border border-[#444] rounded-lg">
          {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? (
            selectedEmployee.skills.map((skill, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-[#33adb4]/20 rounded-full text-sm border border-[#33adb4]/30 text-gray-300"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-gray-400">No skills listed</span>
          )}
        </div>
      </div>

      {/* Leave Information */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Leave Days Allowed</h3>
        <div className="p-4 border border-[#444] rounded-lg">
          <div>
            <p className="border border-[#444] rounded-md p-2 text-gray-300">{selectedEmployee.leaveRequestAllowed}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
)}
    </div>
  );
};

export default ManagerEmployees;