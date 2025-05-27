import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight, FaRobot, FaUsers, FaSitemap, FaUserPlus, FaSitemap as FaDepartment } from 'react-icons/fa';
import {RefreshCw,User } from "lucide-react";

const EmployeePage = () => {
  const [employees, setEmployees] = useState([]);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
 
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState('employees'); 
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDepartmentSearchChange = (e) => {
    setDepartmentSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const [newEmployee, setNewEmployee] = useState({
    profilePicture: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    hireDate: "",
    role: "",
    position: "",
    salary: "",
    departmentId: "",
    managerId: "",
    skills: "",
    personalEmail: "",
  });
  
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

  const handleDelete = (id) => {
    setEmployeeToDelete(id);
    setShowDeleteModal(true);
  };
  
  const handleConfirmDelete = async () => {
    try {
  
      await axios.delete(`http://localhost:8080/api/users/${employeeToDelete}`, {
        withCredentials: true
      });
  
      setShowDeleteModal(false);
      await refreshAllEmployeeData();
      setSuccessMessage("Employee deleted successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting employee:", error.response?.data || error.message);
    }
  };
  
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors
  
    // Common validation function
    const validateFields = (employee) => {
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "position",
        "role",
        "salary",
        "hireDate",
        "personalEmail",
      ];
      const missingFields = requiredFields.filter((field) => !employee[field]);
      return missingFields.length > 0
        ? `Please fill in all required fields:\n• ${missingFields.join("\n• ")}`
        : null;
    };
  
    try {
      // Create FormData object
      const formData = new FormData();
      const employee = isEditing ? selectedEmployee : newEmployee;
  
      // Validate fields for both create and edit
      const validationError = validateFields(employee);
      if (validationError) {
        return setErrorMessage(validationError);
      }
  
      // Add fields to FormData
      Object.keys(employee).forEach((key) => {
        if (key !== "profilePicture" && employee[key]) {
          if (key === "departmentId") {
            const deptId =
              typeof employee[key] === "object"
                ? employee[key]._id
                : employee[key];
            formData.append(key, deptId);
          } else {
            formData.append(key, employee[key]);
          }
        }
      });
  
      // Add profile picture if selected
      if (selectedFile) {
        formData.append("profilePicture", selectedFile);
      }
  
      // Make the API call
      const response = await axios({
        method: isEditing ? "put" : "post",
        url: isEditing
          ? `http://localhost:8080/api/users/${selectedEmployee._id}`
          : "http://localhost:8080/api/users",
        data: formData,
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      // Handle success
      if (response.data.user || !isEditing) {
        await refreshAllEmployeeData();
        setSuccessMessage(
          isEditing
            ? "Employee details updated successfully!"
            : "New employee added successfully!"
        );
        fetchEmployees();
      }
  
      // Reset form state
      setNewEmployee({
        profilePicture: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        hireDate: "",
        role: "",
        position: "",
        salary: "",
        departmentId: "",
        managerId: "",
        skills: "",
        personalEmail: "",
      });
      setSelectedFile(null);
      setPreviewImage(null);
      setIsCreating(false);
      setIsEditing(false);
      setSelectedEmployee(null);
  
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error submitting employee form:", error);
  
      // Handle errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors.map((err) => err.msg);
        const uniqueErrors = [...new Set(validationErrors)];
        setErrorMessage(`Please correct the following issues:\n• ${uniqueErrors.join("\n• ")}`);
      } else if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("An error occurred while saving. Please try again.");
      }
    }
  };
  
  const handleEdit = (id) => {
    const employeeToEdit = employees.find((employee) => employee._id === id);
    if (employeeToEdit) {
      setSelectedEmployee({
        ...employeeToEdit,
        originalDepartmentId: employeeToEdit.departmentId?._id || employeeToEdit.departmentId
      });
      setIsEditing(true);
      
      if (employeeToEdit.profilePicture) {
        setPreviewImage(`http://localhost:8080${employeeToEdit.profilePicture}`);
      }
    }
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
  
    if (name === "profilePicture") {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
        setPreviewImage(URL.createObjectURL(file));
      }
      return;
    }
  
    if (isEditing) {
      setSelectedEmployee(prev => ({
        ...prev,
        [name]: value,
        ...(name === "departmentId" && {
          departmentId: value,
          managerId: departments.find(dept => dept._id === value)?.managerId || prev.managerId
        })
      }));
    } else {
      setNewEmployee(prev => ({
        ...prev,
        [name]: value,
        ...(name === "departmentId" && {
          departmentId: value,
          managerId: departments.find(dept => dept._id === value)?.managerId || ""
        })
      }));
    }
  };

  const handleCancel = () => {
    setErrorMessage(""); 
    setIsEditing(false); 
    setIsCreating(false); 
    setNewEmployee({}); 
    setSelectedEmployee(null); 
    setSelectedFile(null);
    setPreviewImage(null);
  };

  const [selectedDepartment, setSelectedDepartment] = useState({
    name: "",
    managerId: "",
    employees: [],
  });

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    managerId: ""
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartmentsAndManagers();
    fetchAvailableManagers();
    fetchAssignableEmployees(); 
  }, []);

  // Fetch Departments & Managers
  const fetchDepartmentsAndManagers = async () => {
    try {

      const deptRes = await axios.get("http://localhost:8080/api/departments", {
        withCredentials: true, 
      });

      setDepartments(deptRes.data);
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error.message);
    }
  };

  const fetchAssignableEmployees = async () => {
    try {
    
      const response = await axios.get(
        "http://localhost:8080/api/departments/assignable-employees",
        {
          withCredentials: true, 
        }
      );
  
      setAssignableEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching assignable employees:", error);
    }
  };


 const fetchAvailableManagers = async () => {
  try {
 
    const response = await axios.get(
      "http://localhost:8080/api/departments/available-managers", 
      {
        withCredentials: true, 
      }
    );

    setAvailableManagers(response.data.availableManagers || []);
  } catch (error) {
    console.error("Error fetching available managers:", error.response?.data || error.message);
  }
};
  
const refreshAllDepartmentData = async () => {
  await Promise.all([
    fetchDepartmentsAndManagers(),
    fetchAvailableManagers(),
    fetchAssignableEmployees()
  ]);
};

const refreshAllEmployeeData = async () => {
  await Promise.all([
    fetchDepartmentsAndManagers(),
    fetchEmployees(),
  ]);
};
  // Handle Create Department Form Change
  const handleDeptFormChange = (e) => {
    const { name, value } = e.target;
    setNewDepartment(prev => ({ ...prev, [name]: value }));
  };

  // Handle Department Creation
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    // Clear any previous errors
    setFormError("");
    
    try {
      
      // Form validation
      if (!newDepartment.name.trim()) {
        setFormError("Please enter a department name.");
        return;
      }
      
      const departmentData = {
        name: newDepartment.name.trim(),
        managerId: newDepartment.managerId || null,
        employeeIds: selectedEmployeeIds
      };
      
      await axios.post(
        "http://localhost:8080/api/departments",
        departmentData,
        {
          headers: {
            "Content-Type": "application/json"
          },withCredentials: true, 
        }
      );
      
      // Reset forms and fetch updated data
      setIsCreatingDept(false);
      setNewDepartment({ name: "", managerId: "" });
      setSelectedEmployeeIds([]);
      await refreshAllDepartmentData();
      setSuccessMessage("Department created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setFormError(error.response?.data?.message);
      console.error("Error creating department:", error.response?.data || error.message);
    }
  };
  
  // Handle Department Edit
  const handleEditDepartment = (dept) => {
    // Create a clean version of the department object for editing
    const cleanDept = {
      _id: dept._id,
      name: dept.name,
      managerId: dept.managerId ? dept.managerId._id : "",
      employees: dept.employees || []
    };
    
    setSelectedDepartment(cleanDept);
    setIsEditingDept(true);
    
    // Extract employee IDs from the department's employees array
    const employeeIds = dept.employees.map(emp => 
      typeof emp === 'object' ? emp._id : emp
    );
    
    setSelectedEmployeeIds(employeeIds);
  };
  
  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    // Clear any previous errors
    setFormError("");
    
    try {
      
      // Form validation
      if (!selectedDepartment.name.trim()) {
        setFormError("Please enter a department name.");
        return;
      }
      
      // Prepare data for the API
      const departmentData = {
        name: selectedDepartment.name.trim(),
        managerId: selectedDepartment.managerId || null,
        employeeIds: selectedEmployeeIds
      };
      
     
      // Make the API call
      await axios.put(
        `http://localhost:8080/api/departments/${selectedDepartment._id}`,
        departmentData,
        {
          headers: {
            "Content-Type": "application/json"
          },withCredentials: true, 
        }
      );
      
      // Reset form and state
      setIsEditingDept(false);
      setSelectedDepartment({ name: "", managerId: "", employees: [] });
      setSelectedEmployeeIds([]);
      await refreshAllDepartmentData();
      setSuccessMessage("Department updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setFormError(error.response?.data?.message || "An error occurred while updating the department");
      console.error("Error updating department:", error.response?.data || error.message);
    }
  };

  const handleEmployeeSelection = (employeeId, isChecked) => {
    if (isChecked) {
      setSelectedEmployeeIds(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployeeIds(prev => prev.filter(id => id !== employeeId));
    }
  };

  // Handle Delete Department
  const handleDeleteDepartment = async (id) => {
    try {
   
  
      await axios.delete(`http://localhost:8080/api/departments/${id}`, {
        withCredentials: true, 
      });
      await refreshAllDepartmentData();
      setSuccessMessage("Department deleted successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting department:", error.response?.data || error.message);
    }
  };
  
  const handleCancelDept = () => {
    setIsCreatingDept(false); 
    setIsEditingDept(false); 
    setNewDepartment({}); 
    setSelectedDepartment(null); 
    setSelectedEmployeeIds([]);
    setFormError(""); 
  };
  
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

  const handleEmployeeNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };
  
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalDepartmentPages));
  };

  return (
    <div className="p-3 bg-[#1a1a1a] flex flex-col rounded-xl border border-[#333333] shadow-lg ">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-[#23A49B] text-white rounded-md mb-4 border-l-4 border-[#33adb4] animate-fadeIn flex items-center">
          <FaRobot className="mr-2 text-xl" />
          {successMessage}
        </div>
      )}
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
          {/* Header and Add Employee Button */}
          <div className="flex items-center justify-between flex-wrap gap-1 mb-4">
            <div className="flex items-center">
              <FaRobot className="text-[#33adb4] text-2xl mr-2" />
              <span className="text-[#33adb4] text-2xl font-semibold">Employee Management</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-[#33adb4] text-white rounded flex items-center transition-all hover:bg-[#2a8c92] shadow-lg"
              >
                <FaUserPlus className="mr-2" />
                Add Employee
              </button>
              <button
                onClick={refreshAllEmployeeData}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] rounded-lg border border-gray-700 text-gray-300 transition-colors duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
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

          {/* Desktop/Tablet View */}
          <div className="hidden md:block">
            <div className="w-full overflow-y-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333]">
              <table className="table-auto w-full text-left border-separate border-spacing-y-1">
                <thead className="bg-[#2c2c2c] sticky top-0">
                  <tr>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold"></th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Name</th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Email</th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Role</th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Position</th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Hire Date</th>
                    <th className="py-3 px-3 text-[#33adb4] text-sm font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.map((employee) => (
                    employee._id ? (
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
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm text-white font-medium">
                          {employee.firstName} {employee.lastName}
                        </td>
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm text-gray-300">{employee.email}</td>
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm">
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
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm text-gray-300">{employee.position}</td>
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm text-gray-300">{new Date(employee.hireDate).toLocaleDateString()}</td>
                        <td className="py-3 lg:py-4 px-2 lg:px-3 text-xs lg:text-sm">
                          <div className="flex space-x-2">
                            <button 
                              className="px-2 py-1 bg-[#33adb4] text-white rounded text-xs hover:bg-[#2a8c92] transition-colors"
                              onClick={() => handleEdit(employee._id)}
                            >
                              Edit
                            </button>
                            <button 
                              className="px-2 py-1 bg-[#31638a] text-white rounded text-xs hover:bg-[#264e6e] transition-colors"
                              onClick={() => handleDelete(employee._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3 sm:space-y-4">
  {currentEmployees.map((employee) => (
    employee._id ? (
      <div 
        key={employee._id} 
        className="bg-gray-800 rounded-lg p-3 sm:p-4 shadow-md border border-gray-700"
      >
        <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-teal-500 overflow-hidden bg-gray-900 flex items-center justify-center">
            <img 
              src={employee.profilePicture ? `http://localhost:8080${employee.profilePicture}` : "/default-avatar.png"} 
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-sm sm:text-base font-semibold text-white">{employee.firstName} {employee.lastName}</div>
            <div className="text-xs sm:text-sm text-gray-300">{employee.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
          <div className="text-xs text-gray-400">Role</div>
          <span 
            className="px-2 py-1 rounded-full text-xs font-medium inline-block" 
            style={{ 
              backgroundColor: getRoleColor(employee.role) + '33',
              color: getRoleColor(employee.role),
              border: `1px solid ${getRoleColor(employee.role)}`
            }}
          >
            {employee.role}
          </span>

          <div className="text-xs text-gray-400">Position</div>
          <div className="text-xs sm:text-sm text-white">{employee.position}</div>

          <div className="text-xs text-gray-400">Hire Date</div>
          <div className="text-xs sm:text-sm text-white">{new Date(employee.hireDate).toLocaleDateString()}</div>
        </div>

        <div className="flex space-x-2">
          <button 
            className="flex-1 px-2 py-1 sm:px-3 sm:py-2 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 transition-colors"
            onClick={() => handleEdit(employee._id)}
          >
            Edit
          </button>
          <button 
            className="flex-1 px-2 py-1 sm:px-3 sm:py-2 bg-blue-800 text-white rounded text-xs hover:bg-blue-900 transition-colors"
            onClick={() => handleDelete(employee._id)}
          >
            Delete
          </button>
        </div>
      </div>
    ) : null
  ))}
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
          {/* Header and Add Department Button */}
          <div className="flex items-center justify-between flex-wrap gap-1 mb-4">
            <div className="flex items-center">
              <FaDepartment className="text-[#33adb4] text-2xl mr-2" />
              <span className="text-[#33adb4] text-2xl font-semibold">Department Management</span>
            </div>
            <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingDept(true)}
              className="px-4 py-2 bg-[#33adb4] text-white rounded flex items-center transition-all hover:bg-[#2a8c92] shadow-lg"
            >
              <FaDepartment className="mr-2" />
              Add Department
            </button>
            <button
            onClick={refreshAllDepartmentData }
            className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] rounded-lg border border-gray-700 text-gray-300 transition-colors duration-300"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
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
          <div className="w-full overflow-x-auto mt-1 rounded-lg bg-[#222] shadow-inner border border-[#333] scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal hover:scrollbar-thumb-teal-dark">
            <table className="table-auto w-full text-left border-separate border-spacing-y-1">
              <thead className="bg-[#2c2c2c] sticky top-0">
                <tr>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Department Name</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Department Head</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Total Employees</th>
                  <th className="py-3 px-4 text-[#33adb4] text-sm font-bold">Actions</th>
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
                          {dept.employees.length}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex space-x-2">
                          <button 
                            className="px-2 py-1 bg-[#33adb4] text-white rounded text-xs hover:bg-[#2a8c92] transition-colors"
                            onClick={() => handleEditDepartment(dept)}
                          >
                            Edit
                          </button>
                          <button 
                            className="px-2 py-1 bg-[#31638a] text-white rounded text-xs hover:bg-[#264e6e] transition-colors"
                            onClick={() => {
                              setDepartmentToDelete(dept._id);
                              setShowDeleteDeptModal(true);
                            }}
                          >
                            Delete
                          </button>
                        </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center backdrop-blur-sm z-50">
          <div className="bg-[#2a2a2a] p-6 rounded-lg w-full max-w-sm shadow-lg border border-[#444]">
            <div className="flex items-center justify-center text-[#e74c3c] mb-4">
              <FaRobot className="text-4xl" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-4 text-white">Confirm Deletion</h3>
            <p className="text-center mb-6 text-gray-300">Are you sure you want to delete this employee? This action cannot be undone.</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 bg-[#e74c3c] text-white rounded-lg hover:bg-[#c0392b] transition-colors flex-1"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                className="px-4 py-2 bg-[#444] text-white rounded-lg hover:bg-[#555] transition-colors flex-1"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteDeptModal && (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center backdrop-blur-sm z-50">
        <div className="bg-[#2a2a2a] p-6 rounded-lg w-[400px] shadow-lg border border-[#444]">
          <div className="flex items-center justify-center text-[#e74c3c] mb-4">
            <FaRobot className="text-4xl" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-4 text-white">Confirm Deletion</h3>
          <p className="text-center mb-6 text-gray-300">
            Are you sure you want to delete this department? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-4">
            <button
              className="px-4 py-2 bg-[#e74c3c] text-white rounded-lg hover:bg-[#c0392b] transition-colors flex-1"
              onClick={async () => {
                await handleDeleteDepartment(departmentToDelete);
                setShowDeleteDeptModal(false);
              }}
            >
              Yes, Delete
            </button>
            <button
              className="px-4 py-2 bg-[#444] text-white rounded-lg hover:bg-[#555] transition-colors flex-1"
              onClick={() => setShowDeleteDeptModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {/* user Form*/}
    {(isEditing || isCreating) && (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center backdrop-blur-sm z-50 p-2 sm:p-4">
        <form 
        className="bg-[#2a2a2a] p-3 sm:p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg border border-[#444] scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal hover:scrollbar-thumb-teal-dark"
          onSubmit={handleFormSubmit} noValidate
        >
          {errorMessage && (
            
            <div className="p-4 bg-[#e74c3c] text-white rounded-md mb-4 border-l-4 border-[#c0392b] animate-fadeIn">
              <div className="flex items-center mb-2">
                <FaRobot className="mr-2 text-xl" />
                <span className="font-semibold">Form Validation Error</span>
              </div>
              <div className="whitespace-pre-line pl-6">
                {errorMessage}
              </div>
            </div>
          )}
          <h3 className="text-xl font-semibold text-center mb-4 text-[#33adb4]">
            {isEditing ? 'Edit' : 'Add'} Employee
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Picture Upload */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold mb-1 text-gray-300">Profile Picture</label>
              <input 
                type="file" 
                name="profilePicture" 
                accept="image/png, image/jpeg" 
                onChange={handleFileChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
              
              {/* Show image preview if an image is selected */}
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Profile Preview" 
                  className="mt-2 h-24 w-24 object-cover rounded-full border-2 border-[#33adb4] mx-auto" 
                />
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">First Name</label>
              <div className="relative">
              <input 
                type="text" 
                name="firstName" 
                value={isEditing ? selectedEmployee?.firstName || "" : newEmployee?.firstName || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300"  
              />
              <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Last Name</label>
              <div className="relative">
              <input 
                type="text" 
                name="lastName" 
                value={isEditing ? selectedEmployee?.lastName || "" : newEmployee?.lastName || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
                <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Email</label>
              <div className="relative">
              <input 
                type="email" 
                name="email" 
                value={isEditing ? selectedEmployee?.email || "" : newEmployee?.email || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
              <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Personal Email */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Personal Email</label>
              <div className="relative">
              <input 
                type="email" 
                name="personalEmail" 
                value={isEditing ? selectedEmployee?.personalEmail || "" : newEmployee?.personalEmail || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
                <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Phone</label>
              <div className="relative">
              <input 
                type="tel" 
                name="phone" 
                value={isEditing ? selectedEmployee?.phone || "" : newEmployee?.phone || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
              <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Skills */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold mb-1 text-gray-300">Skills (comma-separated)</label>
              <input 
                type="text" 
                name="skills" 
                value={isEditing ? 
                  (Array.isArray(selectedEmployee?.skills) ? selectedEmployee?.skills.join(', ') : selectedEmployee?.skills || "") : 
                  (Array.isArray(newEmployee?.skills) ? newEmployee?.skills.join(', ') : newEmployee?.skills || "")} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
                placeholder="React, Node.js, MongoDB, etc."
              />
            </div>

            {/* Hire Date */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Hire Date <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                name="hireDate" 
                value={isEditing ? selectedEmployee?.hireDate?.slice(0, 10) || "" : newEmployee?.hireDate || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Role <span className="text-red-500">*</span></label>
              <select
                name="role"
                value={isEditing ? selectedEmployee?.role || "" : newEmployee?.role || ""}
                onChange={handleFormChange}
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300"
                disabled={isEditing}
              >
                <option value="">Select Role</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Position</label>
              <div className="relative">
              <input 
                type="text" 
                name="position" 
                value={isEditing ? selectedEmployee?.position || "" : newEmployee?.position || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
                <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Salary <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="salary" 
                value={isEditing ? selectedEmployee?.salary || "" : newEmployee?.salary || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Department <span className="text-red-500">*</span></label>
              <select
                name="departmentId"
                value={isEditing ? (selectedEmployee?.departmentId?._id || selectedEmployee?.departmentId || "") : newEmployee?.departmentId || ""}
                onChange={handleFormChange}
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={String(dept._id)}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Password</label>
              <div className="relative">

              <input 
                type="password" 
                name="password" 
                value={isEditing ? selectedEmployee?.password || "" : newEmployee?.password || ""} 
                onChange={handleFormChange} 
                className="p-2 border border-[#444] rounded w-full bg-[#333] text-gray-300" 
              />
                <span className="absolute top-2 right-2 text-red-500">*</span>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 mt-2">
              <button 
                type="submit" 
                className="w-full sm:w-1/2 px-4 py-2 bg-[#33adb4] text-white rounded-lg hover:bg-[#2a8c92] transition-colors shadow-md"
              >
                {isEditing ? 'Save Changes' : 'Add Employee'}
              </button>
              <button 
                type="button" 
                onClick={handleCancel} 
                className="w-full sm:w-1/2 px-4 py-2 bg-[#444] text-white rounded-lg hover:bg-[#555] transition-colors shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    )}

    {/* Department Form*/}
    {(isCreatingDept || isEditingDept) && (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center backdrop-blur-sm z-50 p-4">
        <div className="bg-[#2a2a2a] p-4 sm:p-6 rounded-lg shadow-lg border border-[#444] w-full max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-teal hover:scrollbar-thumb-teal-dark">
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-4 text-[#33adb4]">
            {isEditingDept ? "Edit Department" : "Add Department"}
          </h2>

          {/* Error Message */}
          {formError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs sm:text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formError}
              </div>
            </div>
          )}

          <form onSubmit={isEditingDept ? handleUpdateDepartment : handleCreateDepartment}>
            {/* Department Name */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-300">Department Name</label>
              <input
                type="text"
                name="name"
                value={isEditingDept ? selectedDepartment.name : newDepartment.name}
                onChange={isEditingDept 
                  ? (e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value }) 
                  : handleDeptFormChange}
                className="w-full p-2 text-xs sm:text-sm border border-[#444] rounded bg-[#333] text-gray-300"
              />
            </div>

            {/* Assign Manager */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-semibold mb-1 text-gray-300">Assign Manager</label>
              <select
                name="managerId"
                value={isEditingDept ? selectedDepartment.managerId?._id || selectedDepartment.managerId || "" : newDepartment.managerId || ""}
                onChange={isEditingDept 
                  ? (e) => setSelectedDepartment({ ...selectedDepartment, managerId: e.target.value }) 
                  : handleDeptFormChange}
                className="w-full p-2 text-xs sm:text-sm border border-[#444] rounded bg-[#333] text-gray-300"
              >
                <option value="">Select Manager</option>
                {availableManagers.length > 0 ? (
                  availableManagers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.firstName} {manager.lastName}
                      {manager.currentDepartment && ` (Current: ${manager.currentDepartment})`}
                    </option>
                  ))
                ) : (
                  <option disabled>No available managers</option>
                )}
              </select>
              <p className="text-xs text-amber-400 mt-1">
                Note: If manager currently manages another department, they will be reassigned.
              </p>
            </div>

            {/* Employee Selection Section */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-300">Assign Employees</label>
              <div className="max-h-60 overflow-y-auto border border-[#444] rounded p-2 bg-[#333]">
                {assignableEmployees.length > 0 ? (
                  assignableEmployees.map((employee) => (
                    <div key={employee._id} className="flex items-center mb-1 sm:mb-2 hover:bg-[#3a3a3a] p-1 rounded">
                      <input
                        type="checkbox"
                        id={`employee-${employee._id}`}
                        checked={selectedEmployeeIds.includes(employee._id)}
                        onChange={(e) => handleEmployeeSelection(employee._id, e.target.checked)}
                        className="mr-2 accent-[#33adb4] scale-75 sm:scale-100"
                      />
                      <label htmlFor={`employee-${employee._id}`} className="text-xs sm:text-sm flex-1">
                        <span className="text-gray-300">
                          {employee.firstName} {employee.lastName} - {employee.position}
                        </span>
                        {employee.departmentId && (
                          <span className="text-gray-500 ml-2 text-xs">
                            (Current: {typeof employee.departmentId === 'object' 
                              ? employee.departmentId.name 
                              : employee.departmentId})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-2 text-xs sm:text-sm">No employees available</p>
                )}
              </div>
              <p className="text-xs text-amber-400 mt-1">
                Note: Selected employees will be reassigned from their current departments.
              </p>
            </div>

            {/* Buttons*/}
            <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
              <button
                type="submit"
                className="w-full sm:w-1/2 px-4 py-2 bg-[#33adb4] text-white rounded-lg hover:bg-[#2a8c92] transition-colors shadow-md text-sm sm:text-base"
              >
                {isEditingDept ? "Save Changes" : "Add Department"}
              </button>

              <button
                type="button"
                onClick={handleCancelDept}
                className="w-full sm:w-1/2 px-4 py-2 bg-[#444] text-white rounded-lg hover:bg-[#555] transition-colors shadow-md text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
};
export default EmployeePage;