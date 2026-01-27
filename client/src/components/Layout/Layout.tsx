import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { IconType } from 'react-icons';
import {
  FiHome,
  FiUser,
  FiCalendar,
  FiFileText,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiCoffee,
  FiClipboard,
  FiUserCheck,
  FiSun,
  FiMoon,
  FiCreditCard,
  FiActivity,
  FiShield,
  FiDatabase,
  FiGrid,
  FiFlag,
  FiTool,
  FiDownload,
} from 'react-icons/fi';
import BDTIcon from '../Icons/BDTIcon';
import {
  RoleBadge,
  ManagerOnly,
  AdminOnly,
  SuperAdminOnly,
} from '../Auth/RoleBasedUI';

// ============================================
// Types
// ============================================

interface MenuItem {
  path: string;
  icon: IconType | React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
}

interface NavLinkProps {
  item: MenuItem;
}

// ============================================
// Component
// ============================================

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  // Main menu - visible to all users
  const menuItems: MenuItem[] = [
    { path: '/dashboard', icon: FiHome, label: 'ড্যাশবোর্ড' },
    { path: '/meals', icon: FiCalendar, label: 'মিল ক্যালেন্ডার' },
    { path: '/wallet', icon: FiCreditCard, label: 'ওয়ালেট' },
    { path: '/transactions', icon: BDTIcon, label: 'লেনদেন' },
    { path: '/reports/monthly', icon: FiFileText, label: 'মাসিক রিপোর্ট' },
    { path: '/profile', icon: FiUser, label: 'প্রোফাইল' },
  ];

  // Manager menu - visible to Manager, Admin, SuperAdmin
  const managerMenuItems: MenuItem[] = [
    { path: '/manager/daily-meals', icon: FiClipboard, label: 'দৈনিক মিল' },
    {
      path: '/manager/user-meals',
      icon: FiCalendar,
      label: 'ইউজার মিল ক্যালেন্ডার',
    },
    { path: '/manager/group-users', icon: FiGrid, label: 'গ্রুপের সদস্য' },
    {
      path: '/manager/lunch-statement',
      icon: FiDownload,
      label: 'লাঞ্চ স্টেটমেন্ট',
    },
    { path: '/manager/breakfast', icon: FiCoffee, label: 'নাস্তা ম্যানেজ' },
    { path: '/manager/balance', icon: BDTIcon, label: 'ব্যালেন্স ম্যানেজ' },
    { path: '/manager/users', icon: FiUsers, label: 'সকল ইউজার' },
    {
      path: '/manager/month-settings',
      icon: FiSettings,
      label: 'মাসের সেটিংস',
    },
    { path: '/manager/reports', icon: FiFileText, label: 'সব রিপোর্ট' },
  ];

  // Admin menu - visible to Admin, SuperAdmin
  const adminMenuItems: MenuItem[] = [
    {
      path: '/admin/financial',
      icon: FiCreditCard,
      label: 'আর্থিক ড্যাশবোর্ড',
    },
    { path: '/admin/users', icon: FiUserCheck, label: 'ইউজার ম্যানেজ' },
    { path: '/admin/groups', icon: FiUsers, label: 'গ্রুপ ম্যানেজ' },
    {
      path: '/admin/manager-activity',
      icon: FiClipboard,
      label: 'ম্যানেজার অ্যাক্টিভিটি',
    },
    { path: '/admin/holidays', icon: FiSun, label: 'ছুটি ম্যানেজ' },
    { path: '/admin/audit-logs', icon: FiActivity, label: 'অডিট লগ' },
    { path: '/admin/settings', icon: FiSettings, label: 'সিস্টেম সেটিংস' },
  ];

  // SuperAdmin menu - visible only to SuperAdmin
  const superAdminMenuItems: MenuItem[] = [
    { path: '/superadmin/metrics', icon: FiActivity, label: 'সিস্টেম মেট্রিক্স' },
    { path: '/superadmin/system', icon: FiDatabase, label: 'সিস্টেম সেটিংস' },
    { path: '/superadmin/roles', icon: FiShield, label: 'রোল ম্যানেজ' },
    { path: '/superadmin/feature-flags', icon: FiFlag, label: 'ফিচার ফ্ল্যাগ' },
    {
      path: '/superadmin/overrides',
      icon: FiSettings,
      label: 'ওভাররাইড ম্যানেজ',
    },
    {
      path: '/superadmin/data-control',
      icon: FiDatabase,
      label: 'ডাটা কন্ট্রোল',
    },
    { path: '/superadmin/config', icon: FiTool, label: 'সিস্টেম কনফিগ' },
  ];

  const isActive = (path: string): boolean => location.pathname === path;

  const NavLink: React.FC<NavLinkProps> = ({ item }) => {
    const IconComponent = item.icon;
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          isActive(item.path)
            ? 'bg-primary-100 text-primary-700 font-medium dark:bg-primary-900 dark:text-primary-100'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        <IconComponent className="w-5 h-5" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-gray-800 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? (
              <FiX className="w-6 h-6" />
            ) : (
              <FiMenu className="w-6 h-6" />
            )}
          </button>
          <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">
            মিল ম্যানেজমেন্ট
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <FiSun className="w-5 h-5" />
            ) : (
              <FiMoon className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 z-40 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
              মিল ম্যানেজমেন্ট
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {user?.name}
            </p>
            <RoleBadge role={user?.role || 'user'} size="sm" className="mt-2" />
          </div>
          <button
            onClick={toggleTheme}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors"
            title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
          >
            {theme === 'dark' ? (
              <FiSun className="w-5 h-5" />
            ) : (
              <FiMoon className="w-5 h-5" />
            )}
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          {/* User Menu */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">
              মূল মেনু
            </p>
            {menuItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>

          {/* Manager Menu */}
          <ManagerOnly>
            <div className="mb-4 pt-4 border-t dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">
                ম্যানেজার
              </p>
              {managerMenuItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </ManagerOnly>

          {/* Admin Menu */}
          <AdminOnly>
            <div className="mb-4 pt-4 border-t dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">
                এডমিন
              </p>
              {adminMenuItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </AdminOnly>

          {/* SuperAdmin Menu */}
          <SuperAdminOnly>
            <div className="pt-4 border-t dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">
                সুপার এডমিন
              </p>
              {superAdminMenuItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </SuperAdminOnly>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
          >
            <FiLogOut className="w-5 h-5" />
            <span>লগ আউট</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
