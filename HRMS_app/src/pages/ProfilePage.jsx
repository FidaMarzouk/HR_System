import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@material-tailwind/react";
import { 
  User, Mail, Phone, Briefcase, Building, Calendar, 
  DollarSign, Award, Save, Upload, AlertCircle, UserCheck, Lock, Calendar as CalendarIcon
} from "lucide-react";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthdate: "",
    skills: [],
    profilePicture: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [changePassword, setChangePassword] = useState(false);
  const [submittedAge, setSubmittedAge] = useState(null); 
  const navigate = useNavigate();

  // Validation helper functions
  const isNameValid = (name) => /^[A-Za-z\s]+$/.test(name);
  const isPhoneValid = (phone) => /^\d+$/.test(phone);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Fetch user ID
        const userResponse = await fetch(`http://localhost:8080/api/users/me`, {
          method: "GET",
          credentials: "include",
        });

        let userId = null;
        if (userResponse.ok) {
          const userMeData = await userResponse.json();
          userId = userMeData.id;
        } else {
          const errorData = await userResponse.json();
          console.error("Error from /api/users/me:", errorData);
          setError(errorData.message || "Failed to fetch user ID");
          return;
        }
        console.log("Fetched user ID from /me:", userId);
        // Fetch profile data
        const profileResponse = await fetch(`http://localhost:8080/api/users/profile/${userId}`, {
          method: "GET",
          credentials: "include",
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUser({ ...profileData, id: userId });
          setFormData({
            firstName: profileData.firstName || "",
            lastName: profileData.lastName || "",
            phone: profileData.phone || "",
            birthdate: profileData.birthdate ? new Date(profileData.birthdate).toISOString().split('T')[0] : "",
            skills: profileData.skills || [],
            profilePicture: profileData.profilePicture || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
          });
        } else {
          const errorData = await profileResponse.json();
          console.error("Error from /api/users/profile:", errorData);
          setError(errorData.message || "Failed to load profile data");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setError("An error occurred while fetching your profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'firstName' && value && !isNameValid(value)) {
      setError("First name should only contain letters");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    if (name === 'lastName' && value && !isNameValid(value)) {
      setError("Last name should only contain letters");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    if (name === 'phone' && value && !isPhoneValid(value)) {
      setError("Phone number should only contain numbers");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (error) {
      setError("");
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
  
    const validationErrors = [];
  
    if (changePassword) {
      if (!formData.currentPassword) {
        validationErrors.push("Current password is required.");
      }
      if (formData.newPassword.length < 6) {
        validationErrors.push("Password must be at least 6 characters long.");
      }
      if (formData.newPassword !== formData.confirmPassword) {
        validationErrors.push("New passwords do not match.");
      }
    }
  
    if (validationErrors.length > 0) {
      setError(validationErrors.join("\n"));
      setIsLoading(false);
      setTimeout(() => setError(""), 5000);
      return;
    }
  
    try {
      const userId = user?.id;
  
      const data = new FormData();
      const age = calculateAge(formData.birthdate); // Calculate age only on submit
  
      const fieldsToAdd = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        birthdate: formData.birthdate,
        ...(age !== null ? { age } : {}),
        skills: formData.skills
      };
  
      if (changePassword && formData.currentPassword && formData.newPassword) {
        fieldsToAdd.currentPassword = formData.currentPassword;
        fieldsToAdd.password = formData.newPassword;
      }
  
      Object.keys(fieldsToAdd).forEach(key => {
        if (key === "skills") {
          data.append(key, JSON.stringify(fieldsToAdd[key]));
        } else {
          data.append(key, fieldsToAdd[key]);
        }
      });
  
      if (selectedFile) {
        data.append("profileImage", selectedFile);
      }
  
      const response = await fetch(`http://localhost:8080/api/users/profile/${userId}`, {
        method: "PUT",
        credentials: "include",
        body: data
      });
  
      if (response.ok) {
        const updatedUser = await response.json();
        setSubmittedAge(age);
        setUser(updatedUser);
        setSuccess("Profile updated successfully");
  
        setFormData(prevState => ({
          ...prevState,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setChangePassword(false);
  
        setTimeout(() => setSuccess(""), 5000);
      } else {
        const errorData = await response.json();
        console.error("Error from /api/users/profile update:", errorData);
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const detailedErrors = errorData.errors.map(err => err.msg).join("\n");
          setError(detailedErrors);
        } else {
          setError(errorData.message || "Failed to update profile");
        }
        setTimeout(() => setError(""), 9000);
      }
    } catch (error) {
      console.error("Update error:", error);
      setError("An error occurred. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-[#23A49B]">
          <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden p-6">
      {/* Animated circuit board background */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute bg-[#23A49B]/20 h-px"
            style={{
              top: `${Math.random() * 100}%`,
              left: 0,
              right: 0,
              animation: `pulse 3s ${Math.random() * 2}s infinite`
            }}
          />
        ))}
        {[...Array(15)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute bg-[#23A49B]/20 w-px"
            style={{
              left: `${Math.random() * 100}%`,
              top: 0,
              bottom: 0,
              animation: `pulse 3s ${Math.random() * 2}s infinite`
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#23A49B]/20 to-transparent blur-3xl" />
        
        <div className="relative bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-[#23A49B]/30 overflow-hidden p-8">
          <Typography variant="h3" className="text-white mb-6 flex items-center gap-3">
            <UserCheck className="text-[#23A49B]" />
            User Profile Configuration
          </Typography>

          {error && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 mb-6 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
              <Save className="text-green-400" />
              <p className="text-green-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 pb-6 border-b border-gray-700">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#23A49B]/30 group-hover:border-[#23A49B] transition-colors">
                  {(formData.profilePicture || selectedFile) ? (
                    <img 
                      src={selectedFile ? URL.createObjectURL(selectedFile) : (
                        formData.profilePicture.startsWith('http') 
                          ? formData.profilePicture 
                          : `http://localhost:8080${formData.profilePicture}`
                      )} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <label className="cursor-pointer text-white text-sm flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6" />
                    <span>Upload</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <Typography variant="h5" className="text-white mb-2">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography className="text-gray-400">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                </Typography>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {user?.department && (
                    <span className="px-3 py-1 bg-[#23A49B]/20 text-[#23A49B] rounded-full text-xs">
                      {user.department}
                    </span>
                  )}
                  {submittedAge !== null && (
                    <span className="px-3 py-1 bg-[#23A49B]/20 text-[#23A49B] rounded-full text-xs">
                      Age: {submittedAge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                  <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full bg-gray-900/50 border ${
                        formData.firstName && !isNameValid(formData.firstName) 
                          ? 'border-red-500' 
                          : 'border-[#23A49B]/30'
                      } rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors`}
                      placeholder="First Name"
                      required
                    />
                    {formData.firstName && !isNameValid(formData.firstName) && (
                      <p className="text-red-400 text-xs mt-1">First name should only contain letters</p>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full bg-gray-900/50 border ${
                      formData.lastName && !isNameValid(formData.lastName) 
                        ? 'border-red-500' 
                        : 'border-[#23A49B]/30'
                    } rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors`}
                    placeholder="Last Name"
                    required
                  />
                  {formData.lastName && !isNameValid(formData.lastName) && (
                    <p className="text-red-400 text-xs mt-1">Last name should only contain letters</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                  <input
                    type="email"
                    name="email"
                    value={user?.email}
                    className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                    placeholder="Email"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full bg-gray-900/50 border ${
                      formData.phone && !isPhoneValid(formData.phone) 
                        ? 'border-red-500' 
                        : 'border-[#23A49B]/30'
                    } rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors`}
                    placeholder="Phone Number"
                  />
                  {formData.phone && !isPhoneValid(formData.phone) && (
                    <p className="text-red-400 text-xs mt-1">Phone number should only contain digits</p>
                  )}
                </div>
              </div>
              
              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Date of Birth</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                  <input
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleInputChange}
                    className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="pt-4 border-t border-gray-700">
              <Typography variant="h6" className="text-white mb-4">
                Professional Information
              </Typography>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Position</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      name="position"
                      value={user?.position}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      placeholder="Position"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      value={user?.departmentId?.name || ""}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      placeholder="Department"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Non-editable fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Hire Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      value={user?.hireDate ? new Date(user.hireDate).toLocaleDateString() : ""}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Salary</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      value={user?.salary ? `${user.salary.toLocaleString()}DT` : ""}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Leave Days</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      value={`${user?.remainingLeaveDays || 0} / ${user?.leaveRequestAllowed || 0}`}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="space-y-4">
                <label className="text-sm text-gray-400">Skills</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.skills.map((skill, index) => (
                    <div 
                      key={index} 
                      className="px-3 py-1 bg-[#23A49B]/20 text-[#23A49B] rounded-full text-sm flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="w-4 h-4 rounded-full bg-[#23A49B]/30 hover:bg-[#23A49B] text-white flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                      placeholder="Add a skill"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-[#23A49B] text-white rounded-lg hover:bg-[#1d8c84] transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="text-white">
                  Password Settings
                </Typography>
                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  className="text-[#23A49B] hover:text-[#1d8c84] transition-colors"
                >
                  {changePassword ? "Cancel" : "Change Password"}
                </button>
              </div>
              
              {changePassword && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                        placeholder="Current Password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                        placeholder="New Password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#23A49B]" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full bg-gray-900/50 border border-[#23A49B]/30 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-[#23A49B] transition-colors"
                        placeholder="Confirm New Password"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-700">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#23A49B] text-white py-3 rounded-lg relative overflow-hidden group hover:shadow-[0_0_15px_rgba(35,164,155,0.5)] transition-shadow"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? "Updating..." : "Update Profile"}
                  <Save className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#23A49B] to-[#2c8f8a] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;