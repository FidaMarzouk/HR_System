import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaChevronLeft, FaChevronRight, FaRobot, FaUsers, FaSitemap, FaUserPlus, FaSitemap as FaDepartment } from 'react-icons/fa';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';

const EmployeePage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [activeTab, setActiveTab] = useState('employees'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); 
  };

  const filteredEmployees = employees.filter(employee => {
    if (!searchQuery.trim()) return true;
    
    // Remove extra spaces and convert to lowercase for comparison
    const query = searchQuery.toLowerCase().replace(/\s+/g, ' ').trim();
    // Also create a version with spaces removed for matching fields that might not have spaces
    const queryNoSpaces = query.replace(/\s/g, '');
    
    // Helper function to check if a string contains the query with or without spaces
    const checkField = (field) => {
      if (!field) return false;
      const fieldStr = String(field).toLowerCase();
      const fieldNoSpaces = fieldStr.replace(/\s/g, '');
      return fieldStr.includes(query) || fieldNoSpaces.includes(queryNoSpaces);
    };
    
    // Check skills array
    const skillsMatch = employee.skills && Array.isArray(employee.skills) && 
      employee.skills.some(skill => checkField(skill));
    
    // Check department name if it exists
    const departmentMatch = employee.departmentId && 
      typeof employee.departmentId === 'object' && 
      employee.departmentId.name && 
      checkField(employee.departmentId.name);
    
    // Check all relevant fields
    return (
      checkField(`${employee.firstName} ${employee.lastName}`) ||
      checkField(employee.firstName) ||
      checkField(employee.lastName) ||
      checkField(employee.role) ||
      checkField(employee.position) ||
      checkField(employee.email) ||
      checkField(employee.personalEmail) ||
      checkField(employee.phone) ||
      skillsMatch ||
      departmentMatch
    );
  });

  const filteredDepartments = departments.filter(department => {
    if (!departmentSearchQuery.trim()) return true;
    
    // Remove extra spaces and convert to lowercase for comparison
    const query = departmentSearchQuery.toLowerCase().replace(/\s+/g, ' ').trim();
    // Also create a version with spaces removed for matching fields that might not have spaces
    const queryNoSpaces = query.replace(/\s/g, '');
    
    // Helper function to check if a string contains the query with or without spaces
    const checkField = (field) => {
      if (!field) return false;
      const fieldStr = String(field).toLowerCase();
      const fieldNoSpaces = fieldStr.replace(/\s/g, '');
      return fieldStr.includes(query) || fieldNoSpaces.includes(queryNoSpaces);
    };
    
    // Check if department name matches
    const nameMatch = checkField(department.name);
    
    // Check if manager name matches (if manager exists)
    const managerMatch = department.managerId && 
      typeof department.managerId === 'object' &&
      (checkField(department.managerId.firstName) || 
       checkField(department.managerId.lastName) ||
       checkField(`${department.managerId.firstName} ${department.managerId.lastName}`));
    
    // Check if any employee name matches
    const employeeMatch = department.employees && 
      Array.isArray(department.employees) &&
      department.employees.some(emp => {
        if (typeof emp === 'object') {
          return checkField(emp.firstName) || 
                 checkField(emp.lastName) || 
                 checkField(`${emp.firstName} ${emp.lastName}`);
        }
        return false;
      });
    
    return nameMatch || managerMatch || employeeMatch;
  });

  const handleDepartmentSearchChange = (e) => {
    setDepartmentSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  // Handle view employees details
  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  // Handle view department details
  const handleViewDepartmentDetails = (department) => {
    setSelectedDepartment(department);
    setDepartmentModalOpen(true);
  };
  
  // Fetch Employees
  const fetchEmployees = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/users", {
        withCredentials: true
      });

      setEmployees(response.data.users || []);
    } catch (error) {
      console.error("Error fetching employees:", error.response?.data || error.message);
    }
  };
  // Fetch Departments & Managers
  const fetchDepartmentsAndManagers = async () => {
      try {
        const deptRes = await axios.get("http://localhost:8080/api/departments", {
          withCredentials: true
        });
  
        setDepartments(deptRes.data);
      } catch (error) {
        console.error("Error fetching data:", error.response?.data || error.message);
      }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartmentsAndManagers();
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#e6b23b'; // Yellow-orange
      case 'manager':
        return '#33adb4'; // Teal
      case 'employee':
        return '#31638a'; // Blue
      default:
        return '#878285'; // Default gray
    }
  };
  
  const employeesPerPage = 5;
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  const departmentsPerPage = 5;
  const indexOfLastDepartment = currentPage * departmentsPerPage;
  const indexOfFirstDepartment = indexOfLastDepartment - departmentsPerPage;
  const currentDepartments = filteredDepartments.slice(indexOfFirstDepartment, indexOfLastDepartment);
  const totalDepartmentPages = Math.ceil(filteredDepartments.length / departmentsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalDepartmentPages));
  };

  const handleEmployeeNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="p-3 bg-[#1a1a1a] flex flex-col rounded-xl border border-[#333333] shadow-lg">

      {/* Tabs */}
      <div className="flex mb-6 border-b border-[#333] text-lg font-medium">
        <button
          className={`flex items-center px-4 py-3 ${
            activeTab === 'employees'
              ? 'text-[#33adb4] border-b-2 border-[#33adb4]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('employees')}
        >
          <FaUsers className="mr-2" />
          Employees
        </button>
        <button
          className={`flex items-center px-4 py-3 ${
            activeTab === 'departments'
              ? 'text-[#33adb4] border-b-2 border-[#33adb4]'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('departments')}
        >
          <FaSitemap className="mr-2" />
          Departments
        </button>
      </div>

      {/* Employee Section */}
      {activeTab === 'employees' && (
        <div className="w-full">
        {/* Header*/}
        <div className="flex items-center justify-between flex-wrap gap-1 mb-4">
          <div className="flex items-center">
            <FaRobot className="text-[#33adb4] text-2xl mr-2" />
            <span className="text-[#33adb4] text-2xl font-semibold">Employee Management</span>
          </div>
        </div>
        {/* Search Bar */}
        <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#33adb4] focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
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
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Role</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Phone</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Position</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Hire Date</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Salary</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Allowed Leaves</th>
                  <th className="py-3 px-3 text-[#33adb4] text-sm font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentEmployees.map((employee) => (
                  employee._id ? (
                    <tr key={employee._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                      {/* Profile Picture */}
                      <td className="py-4 px-3 text-sm">
                        <div className="h-12 w-12 rounded-full border-2 border-[#33adb4] overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                          <img 
                            src={employee.profilePicture ? `http://localhost:8080${employee.profilePicture}` : "/default-avatar.png"} 
                            alt="Profile"
                            className="h-12 w-12 object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-white font-medium">{employee.firstName} {employee.lastName}</td>
                      <td className="py-4 px-3 text-sm text-gray-300">{employee.email}</td>
                      <td className="py-4 px-3 text-sm">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium" 
                          style={{ 
                            backgroundColor: getRoleColor(employee.role) + '33',
                            color: getRoleColor(employee.role),
                            border: `1px solid ${getRoleColor(employee.role)}`
                          }}
                        >
                          {employee.role}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-300">{employee.phone}</td>
                      <td className="py-4 px-3 text-sm text-gray-300">{employee.position}</td>
                      <td className="py-4 px-3 text-sm text-gray-300">{new Date(employee.hireDate).toLocaleDateString()}</td>
                      <td className="py-4 px-3 text-sm text-gray-300">{employee.salary}DT</td>
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
                  ) : null
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 px-4 text-gray-300">
          <div className="text-sm">
            Showing {filteredEmployees.length > 0 ? indexOfFirstEmployee + 1 : 0} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} 
            of {filteredEmployees.length} {searchQuery.trim() ? "matching" : ""} employees
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
                onClick={handleEmployeeNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-2 rounded-lg ${
                  currentPage === totalPages || totalPages === 0
                    ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                    : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
                }`}
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          </div>
      )}

      {/* Department Section */}
      {activeTab === 'departments' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-1 mb-4">
            <div className="flex items-center">
              <FaDepartment className="text-[#33adb4] text-2xl mr-2" />
              <span className="text-[#33adb4] text-2xl font-semibold">Department Management</span>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search departments..."
                value={departmentSearchQuery}
                onChange={handleDepartmentSearchChange}
                className="w-full p-3 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#33adb4] focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Department Table */}
          <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
            <table className="table-auto w-full text-left border-separate border-spacing-y-1">
              <thead className="bg-[#2c2c2c] sticky top-0">
                <tr>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Department Name</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Department Head</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Total Employees</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDepartments.map((dept) => (
                  dept._id ? (
                    <tr key={dept._id} className="bg-[#2a2a2a] hover:bg-[#333] transition-colors">
                      <td className="py-4 px-4 text-sm text-white font-medium">{dept.name}</td>
                      <td className="py-4 px-4 text-sm text-gray-300">
                        {dept.managerId ? `${dept.managerId.firstName} ${dept.managerId.lastName}` : "No Manager Assigned"}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">
                        <span className="px-2 py-1 bg-[#31638a33] text-[#31638a] rounded-full border border-[#31638a]">
                          {dept.employees ? dept.employees.length : 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-center">
                        <button 
                          onClick={() => handleViewDepartmentDetails(dept)}
                          className="px-3 py-1 bg-[#31638a] text-white rounded text-xs flex items-center hover:bg-[#264e6e] transition-colors mx-auto"
                        >
                          <FaEye className="mr-1" /> View Details
                        </button>
                      </td>
                    </tr>
                  ) : null
                ))}
              </tbody>
            </table>
          </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4 px-4 text-gray-300">
                    <div className="text-sm">
                      Showing {filteredDepartments.length > 0 ? indexOfFirstDepartment + 1 : 0} to {Math.min(indexOfLastDepartment, filteredDepartments.length)} 
                      of {filteredDepartments.length} {departmentSearchQuery.trim() ? "matching" : ""} departments
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
                          {[...Array(totalDepartmentPages)].map((_, index) => (
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
                          disabled={currentPage === totalDepartmentPages || totalDepartmentPages === 0}
                          className={`p-2 rounded-lg ${
                            currentPage === totalDepartmentPages || totalDepartmentPages=== 0
                              ? 'bg-[#333] text-gray-500 cursor-not-allowed'
                              : 'bg-[#31638a] text-white hover:bg-[#264e6e] transition-colors'
                          }`}
                        >
                          <FaChevronRight className="w-4 h-4" />
                        </button>
                      </div>
        </div>
        </>
      )}

      {/* Employee Details Modal */}
      {modalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
          <Card className="w-full max-w-[600px] max-h-[80vh] overflow-y-auto !bg-[#222] border !border-[#333] !text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#333] !bg-[#2d9d95]">
              <CardTitle className="text-2xl font-bold text-white">
                Employee Profile
              </CardTitle>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {/* Profile Picture Section */}
              <div className="flex justify-center items-center mt-4 col-span-1 md:col-span-2">
                {selectedEmployee.profilePicture ? (
                  <img
                    src={`http://localhost:8080${selectedEmployee.profilePicture}`}
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-[#333] shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center bg-[#333] rounded-full border-4 border-[#444] shadow-md">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">First Name</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Last Name</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Employee ID</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee._id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Department</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.departmentId?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Date Of Join</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Position</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.position}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Phone</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Email</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.email}</p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Skills</h3>
                <div className="flex flex-wrap gap-2 p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? (
                    selectedEmployee.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-[#2a2a2a] rounded-full text-sm border border-[#444] text-gray-300"
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
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Leave Information</h3>
                <div className="p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Leave Days Allowed</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedEmployee.leaveRequestAllowed}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Details Modal */}
      {departmentModalOpen && selectedDepartment && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
          <Card className="w-full max-w-[600px] max-h-[80vh] overflow-y-auto !bg-[#222] border !border-[#333] !text-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#333] !bg-[#2d9d95]">
              <CardTitle className="text-2xl font-bold text-white">
                Department Details
              </CardTitle>
              <button
                onClick={() => setDepartmentModalOpen(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 p-6">
              {/* Department Information */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Department Information</h3>
                <div className="p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-400">Department Name</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">{selectedDepartment.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">Total Employees</p>
                    <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">
                      {selectedDepartment.employees ? selectedDepartment.employees.length : 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manager Information */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Department Manager</h3>
                <div className="p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                  {selectedDepartment.managerId ? (
                    <>
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-400">Manager Name</p>
                        <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">
                          {`${selectedDepartment.managerId.firstName} ${selectedDepartment.managerId.lastName}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">Manager Email</p>
                        <p className="border border-[#444] rounded-md p-2 bg-[#2a2a2a] text-gray-300">
                          {selectedDepartment.managerId.email}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400">No manager assigned to this department</p>
                  )}
                </div>
              </div>

              {/* Employees in Department */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#33adb4]">Department Employees</h3>
                {selectedDepartment.employees && selectedDepartment.employees.length > 0 ? (
                  <div className="overflow-x-auto mt-1 rounded-lg bg-[#1a1a1a] border border-[#333]">
                    <table className="table-auto w-full text-left">
                      <thead className="bg-[#2a2a2a]">
                        <tr>
                          <th className="py-2 px-3 text-xs text-[#33adb4] font-semibold">Name</th>
                          <th className="py-2 px-3 text-xs text-[#33adb4] font-semibold">Email</th>
                          <th className="py-2 px-3 text-xs text-[#33adb4] font-semibold">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDepartment.employees.map((employee, index) => (
                          <tr key={employee._id || index} className="border-t border-[#333]">
                            <td className="py-2 px-3 text-sm text-gray-300">{`${employee.firstName} ${employee.lastName}`}</td>
                            <td className="py-2 px-3 text-sm text-gray-300">{employee.email}</td>
                            <td className="py-2 px-3 text-sm text-gray-300">{employee.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border border-[#333] rounded-lg bg-[#1a1a1a]">
                    <p className="text-gray-400">No employees in this department</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeePage;