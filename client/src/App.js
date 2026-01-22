import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// User Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import MealCalendar from './pages/Meals/MealCalendar';
import Transactions from './pages/Transactions/Transactions';
import MonthlyReport from './pages/Reports/MonthlyReport';

// Manager Pages
import UsersList from './pages/Manager/UsersList';
import UserBalance from './pages/Manager/UserBalance';
import BreakfastManagement from './pages/Manager/BreakfastManagement';
import MonthSettings from './pages/Manager/MonthSettings';
import DailyMeals from './pages/Manager/DailyMeals';
import AllUsersReport from './pages/Manager/AllUsersReport';

// Admin Pages
import ManageUsers from './pages/Admin/ManageUsers';
import HolidayManagement from './pages/Admin/HolidayManagement';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="meals" element={<MealCalendar />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="reports/monthly" element={<MonthlyReport />} />

                {/* Manager Routes */}
                <Route path="manager/users" element={<ProtectedRoute requiredRole="manager"><UsersList /></ProtectedRoute>} />
                <Route path="manager/balance" element={<ProtectedRoute requiredRole="manager"><UserBalance /></ProtectedRoute>} />
                <Route path="manager/breakfast" element={<ProtectedRoute requiredRole="manager"><BreakfastManagement /></ProtectedRoute>} />
                <Route path="manager/month-settings" element={<ProtectedRoute requiredRole="manager"><MonthSettings /></ProtectedRoute>} />
                <Route path="manager/daily-meals" element={<ProtectedRoute requiredRole="manager"><DailyMeals /></ProtectedRoute>} />
                <Route path="manager/reports" element={<ProtectedRoute requiredRole="manager"><AllUsersReport /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="admin/users" element={<ProtectedRoute requiredRole="admin"><ManageUsers /></ProtectedRoute>} />
                <Route path="admin/holidays" element={<ProtectedRoute requiredRole="admin"><HolidayManagement /></ProtectedRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
