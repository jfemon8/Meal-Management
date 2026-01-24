import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Auth Pages (not lazy loaded for better UX on first load)
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Lazy loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const MealCalendar = lazy(() => import('./pages/Meals/MealCalendar'));
const MealAuditLog = lazy(() => import('./pages/Meals/MealAuditLog'));
const Transactions = lazy(() => import('./pages/Transactions/Transactions'));
const MonthlyReport = lazy(() => import('./pages/Reports/MonthlyReport'));
const Wallet = lazy(() => import('./pages/Wallet/Wallet'));
const Settings = lazy(() => import('./pages/Settings/Settings'));

// Manager Pages
const UsersList = lazy(() => import('./pages/Manager/UsersList'));
const UserBalance = lazy(() => import('./pages/Manager/UserBalance'));
const BreakfastManagement = lazy(() => import('./pages/Manager/BreakfastManagement'));
const MonthSettings = lazy(() => import('./pages/Manager/MonthSettings'));
const DailyMeals = lazy(() => import('./pages/Manager/DailyMeals'));
const AllUsersReport = lazy(() => import('./pages/Manager/AllUsersReport'));
const UserMealCalendar = lazy(() => import('./pages/Manager/UserMealCalendar'));

// Admin Pages
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers'));
const HolidayManagement = lazy(() => import('./pages/Admin/HolidayManagement'));
const AuditLogs = lazy(() => import('./pages/Admin/AuditLogs'));

// SuperAdmin Pages
const SystemSettings = lazy(() => import('./pages/SuperAdmin/SystemSettings'));
const RoleManagement = lazy(() => import('./pages/SuperAdmin/RoleManagement'));

// Loading component
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 dark:border-primary-400"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">লোড হচ্ছে...</p>
        </div>
    </div>
);

function App() {
    const { user, loading } = useAuth() as any;

    if (loading) {
        return <PageLoader />;
    }

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="meals" element={<MealCalendar />} />
                    <Route path="meals/history" element={<MealAuditLog />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="reports/monthly" element={<MonthlyReport />} />

                    {/* Manager Routes */}
                    <Route path="manager/users" element={<ProtectedRoute requiredRole="manager"><UsersList /></ProtectedRoute>} />
                    <Route path="manager/balance" element={<ProtectedRoute requiredRole="manager"><UserBalance /></ProtectedRoute>} />
                    <Route path="manager/breakfast" element={<ProtectedRoute requiredRole="manager"><BreakfastManagement /></ProtectedRoute>} />
                    <Route path="manager/month-settings" element={<ProtectedRoute requiredRole="manager"><MonthSettings /></ProtectedRoute>} />
                    <Route path="manager/daily-meals" element={<ProtectedRoute requiredRole="manager"><DailyMeals /></ProtectedRoute>} />
                    <Route path="manager/user-meals" element={<ProtectedRoute requiredRole="manager"><UserMealCalendar /></ProtectedRoute>} />
                    <Route path="manager/reports" element={<ProtectedRoute requiredRole="manager"><AllUsersReport /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="admin/users" element={<ProtectedRoute requiredRole="admin"><ManageUsers /></ProtectedRoute>} />
                    <Route path="admin/holidays" element={<ProtectedRoute requiredRole="admin"><HolidayManagement /></ProtectedRoute>} />
                    <Route path="admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><AuditLogs /></ProtectedRoute>} />

                    {/* SuperAdmin Routes */}
                    <Route path="superadmin/system" element={<ProtectedRoute requiredRole="superadmin"><SystemSettings /></ProtectedRoute>} />
                    <Route path="superadmin/roles" element={<ProtectedRoute requiredRole="superadmin"><RoleManagement /></ProtectedRoute>} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Suspense>
    );
}

export default App;
