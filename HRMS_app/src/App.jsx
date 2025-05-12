import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login.jsx";
import PrivateRoute from "./pages/auth/PrivateRoute.jsx";
import AdminDashboard from "./pages/dashboards/Admin_Dashboard/AdminDashboard.jsx";
import ManagerDashboard from "./pages/dashboards/Manager_Dashboard/ManagerDashboard.jsx";
import EmployeeDashboard from "./pages/dashboards/Employee_Dashboard/EmployeeDashboard.jsx";
import CEODashboard from "./pages/dashboards/CEO_Dashboard/CEO_Dashboard.jsx";
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<h1 className="text-center text-2xl mt-20">Welcome to Dashboard</h1>} />

        {/* Protected Routes */}
        <Route path="/admin-dashboard" element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route index element={<AdminDashboard />} />
        </Route>
        <Route path="/manager-dashboard" element={<PrivateRoute allowedRoles={['manager']} />}>
          <Route index element={<ManagerDashboard />} />
        </Route>
        <Route path="/employee-dashboard" element={<PrivateRoute allowedRoles={['employee']} />}>
          <Route index element={<EmployeeDashboard />} />
        </Route>
        <Route path="/ceo-dashboard" element={<PrivateRoute allowedRoles={['superAdmin']} />}>
          <Route index element={<CEODashboard />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Unauthorized Page */}
        <Route path="/unauthorized" element={<h1 className="text-center text-red-500 text-2xl mt-20">Unauthorized Access</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
