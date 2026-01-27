import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useMealSummary } from "../../hooks/queries/useMeals";
import { useCurrentMonthSettings } from "../../hooks/queries/useMonthSettings";
import {
  FiCalendar,
  FiTrendingUp,
  FiUsers,
  FiAlertCircle,
  FiCoffee,
  FiDollarSign,
  FiClock,
  FiList,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiActivity,
} from "react-icons/fi";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import BDTIcon from "../../components/Icons/BDTIcon";
import { Skeleton } from "../../components/ui/skeleton";
import { Link } from "react-router-dom";
import { PERMISSIONS, RequirePermission } from "../../utils/permissions";
import LowBalanceWarning from "../../components/Wallet/LowBalanceWarning";
import api from "../../services/api";

interface UpcomingOffDay {
  date: string;
  type: "friday" | "saturday" | "holiday";
  reason: string;
  reasonEn: string;
  isAlsoHoliday?: boolean;
  holidayName?: string;
  holidayType?: string;
}

interface AdminDashboardStats {
  roleStats: {
    users: number;
    managers: number;
    admins: number;
    superadmins: number;
    total: number;
  };
  userStats: {
    inactive: number;
    newThisMonth: number;
    frozenBalances: number;
  };
  balanceStats: {
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
  };
  transactionSummary: {
    deposits: { amount: number; count: number };
    deductions: { amount: number; count: number };
    adjustments: { amount: number; count: number };
    refunds: { amount: number; count: number };
  };
  systemAlerts: Array<{
    type: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
    actionUrl?: string;
    priority: "low" | "normal" | "high";
  }>;
}

interface ManagerDashboardStats {
  todayMeals: {
    isHoliday: boolean;
    holidayName: string | null;
    isDefaultOff: boolean;
    lunch: { usersOn: number; usersOff: number; totalMeals: number };
    dinner: { usersOn: number; usersOff: number; totalMeals: number };
  };
  monthlyMeals: {
    grandTotalLunch: number;
    grandTotalDinner: number;
    grandTotal: number;
    lunchRate: number;
    dinnerRate: number;
    estimatedLunchCost: number;
    estimatedDinnerCost: number;
    userWise: Array<{
      _id: string;
      name: string;
      lunchCount: number;
      dinnerCount: number;
      totalCount: number;
    }>;
  };
  breakfastPending: {
    notFinalized: {
      count: number;
      totalCost: number;
      dates: Array<{ date: string; totalCost: number; description: string }>;
    };
    pendingDeductions: { count: number; amount: number };
  };
  deposits: {
    breakfast: { amount: number; count: number };
    lunch: { amount: number; count: number };
    dinner: { amount: number; count: number };
    total: { amount: number; count: number };
  };
  summary: {
    totalUsers: number;
    usersWithLowBalance: number;
    lowBalanceThreshold: number;
  };
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
      </div>
      <div
        className={`p-3 rounded-full ${color.replace("text-", "bg-").replace("600", "100")}`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, isManager, isAdmin } = useAuth();
  const [upcomingOffDays, setUpcomingOffDays] = useState<UpcomingOffDay[]>([]);
  const [offDaysLoading, setOffDaysLoading] = useState(true);
  const [managerStats, setManagerStats] =
    useState<ManagerDashboardStats | null>(null);
  const [managerStatsLoading, setManagerStatsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(
    null,
  );
  const [adminStatsLoading, setAdminStatsLoading] = useState(true);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: mealSummary, isLoading: mealSummaryLoading } = useMealSummary(
    year,
    month,
  );
  const { data: monthSettings, isLoading: monthSettingsLoading } =
    useCurrentMonthSettings();

  const isLoading = mealSummaryLoading || monthSettingsLoading;

  // Fetch upcoming OFF days
  useEffect(() => {
    const fetchUpcomingOffDays = async () => {
      try {
        const response = await api.get("/holidays/upcoming", {
          params: { days: 14 },
        });
        setUpcomingOffDays(response.data.offDays || []);
      } catch (error) {
        console.error("Failed to fetch upcoming off days:", error);
      } finally {
        setOffDaysLoading(false);
      }
    };
    fetchUpcomingOffDays();
  }, []);

  // Fetch manager dashboard stats (only for managers)
  useEffect(() => {
    const fetchManagerStats = async () => {
      if (!isManager) {
        setManagerStatsLoading(false);
        return;
      }
      try {
        const response = await api.get("/reports/manager-dashboard");
        setManagerStats(response.data);
      } catch (error) {
        console.error("Failed to fetch manager stats:", error);
      } finally {
        setManagerStatsLoading(false);
      }
    };
    fetchManagerStats();
  }, [isManager]);

  // Fetch admin dashboard stats (only for admins)
  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!isAdmin) {
        setAdminStatsLoading(false);
        return;
      }
      try {
        const response = await api.get("/reports/admin-dashboard");
        setAdminStats(response.data);
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setAdminStatsLoading(false);
      }
    };
    fetchAdminStats();
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            স্বাগতম, {user?.name}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: bn })}
          </p>
        </div>
      </div>

      {/* Low Balance Warning */}
      <LowBalanceWarning
        balances={user?.balances}
        threshold={user?.balanceWarning?.threshold || 100}
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={BDTIcon}
          title="নাস্তা ব্যালেন্স"
          value={`৳${user?.balances?.breakfast?.amount || 0}`}
          subtitle={
            user?.balances?.breakfast?.isFrozen ? "🔒 ফ্রিজ করা আছে" : undefined
          }
          color="text-blue-600"
        />
        <StatCard
          icon={BDTIcon}
          title="দুপুরের ব্যালেন্স"
          value={`৳${user?.balances?.lunch?.amount || 0}`}
          subtitle={
            user?.balances?.lunch?.isFrozen ? "🔒 ফ্রিজ করা আছে" : undefined
          }
          color="text-green-600"
        />
        <StatCard
          icon={BDTIcon}
          title="রাতের ব্যালেন্স"
          value={`৳${user?.balances?.dinner?.amount || 0}`}
          subtitle={
            user?.balances?.dinner?.isFrozen ? "🔒 ফ্রিজ করা আছে" : undefined
          }
          color="text-purple-600"
        />
      </div>

      {/* Manager Dashboard Widgets */}
      <RequirePermission permission={PERMISSIONS.VIEW_DAILY_MEALS}>
        {managerStatsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        ) : managerStats ? (
          <>
            {/* Today's Meal Count */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <FiCalendar className="text-green-500" />
                আজকের মিল স্ট্যাটাস
                {managerStats.todayMeals.isHoliday && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full ml-2">
                    {managerStats.todayMeals.holidayName || "ছুটি"}
                  </span>
                )}
                {managerStats.todayMeals.isDefaultOff &&
                  !managerStats.todayMeals.isHoliday && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full ml-2">
                      অটো অফ
                    </span>
                  )}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {managerStats.todayMeals.lunch.totalMeals}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    দুপুরের মিল
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {managerStats.todayMeals.lunch.usersOn}/
                    {managerStats.summary.totalUsers} জন অন
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {managerStats.todayMeals.dinner.totalMeals}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    রাতের মিল
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {managerStats.todayMeals.dinner.usersOn}/
                    {managerStats.summary.totalUsers} জন অন
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {managerStats.summary.totalUsers}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    মোট ইউজার
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {managerStats.summary.usersWithLowBalance}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    লো ব্যালেন্স
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    &lt;৳{managerStats.summary.lowBalanceThreshold}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Stats & Deposits Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Meal Summary */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <FiList className="text-primary-600" />
                  মাসিক মিল সামারি
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {managerStats.monthlyMeals.grandTotalLunch}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      দুপুর (৳{managerStats.monthlyMeals.estimatedLunchCost})
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {managerStats.monthlyMeals.grandTotalDinner}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      রাত (৳{managerStats.monthlyMeals.estimatedDinnerCost})
                    </p>
                  </div>
                </div>
                {/* Top consumers */}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  টপ কনজিউমার
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {managerStats.monthlyMeals.userWise
                    .slice(0, 5)
                    .map((u, idx) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {idx + 1}. {u.name}
                        </span>
                        <span className="font-medium text-primary-600 dark:text-primary-400">
                          {u.totalCount} মিল
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Deposits & Breakfast Pending */}
              <div className="space-y-4">
                {/* Total Deposits */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiDollarSign className="text-green-500" />
                    এই মাসে জমা
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ৳{managerStats.deposits.breakfast.amount}
                      </p>
                      <p className="text-xs text-gray-500">নাস্তা</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ৳{managerStats.deposits.lunch.amount}
                      </p>
                      <p className="text-xs text-gray-500">দুপুর</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        ৳{managerStats.deposits.dinner.amount}
                      </p>
                      <p className="text-xs text-gray-500">রাত</p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      মোট:{" "}
                      <span className="font-bold text-primary-600">
                        ৳{managerStats.deposits.total.amount}
                      </span>
                      <span className="text-xs ml-2">
                        ({managerStats.deposits.total.count} টি)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Breakfast Pending */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiCoffee className="text-yellow-500" />
                    নাস্তা পেন্ডিং
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {managerStats.breakfastPending.notFinalized.count}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        দিন ফাইনালাইজ বাকি
                      </p>
                      <p className="text-xs text-gray-500">
                        ৳{managerStats.breakfastPending.notFinalized.totalCost}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {managerStats.breakfastPending.pendingDeductions.count}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        কাটা বাকি
                      </p>
                      <p className="text-xs text-gray-500">
                        ৳
                        {managerStats.breakfastPending.pendingDeductions.amount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </RequirePermission>

      {/* Admin Dashboard Widgets */}
      {isAdmin && (
        <>
          {adminStatsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          ) : adminStats ? (
            <>
              {/* Role Statistics */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <FiShield className="text-indigo-500" />
                  ইউজার রোল পরিসংখ্যান
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                    <FiUsers className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {adminStats.roleStats.users}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ইউজার
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <FiUserCheck className="w-6 h-6 mx-auto text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {adminStats.roleStats.managers}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ম্যানেজার
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                    <FiShield className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {adminStats.roleStats.admins}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      এডমিন
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                    <FiShield className="w-6 h-6 mx-auto text-red-600 dark:text-red-400 mb-2" />
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {adminStats.roleStats.superadmins}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      সুপার এডমিন
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <FiUsers className="w-6 h-6 mx-auto text-gray-600 dark:text-gray-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {adminStats.roleStats.total}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      মোট সক্রিয়
                    </p>
                  </div>
                </div>
              </div>

              {/* User Stats & System Balance Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* User Stats */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiActivity className="text-cyan-500" />
                    ইউজার পরিসংখ্যান
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {adminStats.userStats.newThisMonth}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        এই মাসে নতুন
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {adminStats.userStats.inactive}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        নিষ্ক্রিয়
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {adminStats.userStats.frozenBalances}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ফ্রোজেন ব্যালেন্স
                      </p>
                    </div>
                  </div>
                </div>

                {/* System Balance */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiDollarSign className="text-green-500" />
                    সিস্টেম ব্যালেন্স
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ৳{adminStats.balanceStats.breakfast}
                      </p>
                      <p className="text-xs text-gray-500">নাস্তা</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ৳{adminStats.balanceStats.lunch}
                      </p>
                      <p className="text-xs text-gray-500">দুপুর</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        ৳{adminStats.balanceStats.dinner}
                      </p>
                      <p className="text-xs text-gray-500">রাত</p>
                    </div>
                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        ৳{adminStats.balanceStats.total}
                      </p>
                      <p className="text-xs text-gray-500">মোট</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Alerts */}
              {adminStats.systemAlerts.length > 0 && (
                <div className="card border-l-4 border-yellow-500">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiAlertCircle className="text-yellow-500" />
                    সিস্টেম অ্যালার্ট
                  </h2>
                  <div className="space-y-3">
                    {adminStats.systemAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          alert.type === "warning"
                            ? "bg-yellow-50 dark:bg-yellow-900/20"
                            : alert.type === "error"
                              ? "bg-red-50 dark:bg-red-900/20"
                              : alert.type === "success"
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-blue-50 dark:bg-blue-900/20"
                        }`}
                      >
                        <div
                          className={`mt-1 ${
                            alert.type === "warning"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : alert.type === "error"
                                ? "text-red-600 dark:text-red-400"
                                : alert.type === "success"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          <FiAlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              alert.type === "warning"
                                ? "text-yellow-800 dark:text-yellow-200"
                                : alert.type === "error"
                                  ? "text-red-800 dark:text-red-200"
                                  : alert.type === "success"
                                    ? "text-green-800 dark:text-green-200"
                                    : "text-blue-800 dark:text-blue-200"
                            }`}
                          >
                            {alert.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {alert.message}
                          </p>
                        </div>
                        {alert.actionUrl && (
                          <Link
                            to={alert.actionUrl}
                            className={`text-sm font-medium ${
                              alert.type === "warning"
                                ? "text-yellow-700 dark:text-yellow-300 hover:text-yellow-800"
                                : alert.type === "error"
                                  ? "text-red-700 dark:text-red-300 hover:text-red-800"
                                  : alert.type === "success"
                                    ? "text-green-700 dark:text-green-300 hover:text-green-800"
                                    : "text-blue-700 dark:text-blue-300 hover:text-blue-800"
                            }`}
                          >
                            দেখুন →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {/* Current Month Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <FiCalendar className="text-primary-600" />
          এই মাসের সারসংক্ষেপ
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center"
              >
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        ) : mealSummary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-600">
                {mealSummary.totalMeals}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                মোট মিল
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {mealSummary.totalDaysOn}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                মিল অন দিন
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                ৳{mealSummary.lunchRate}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                মিল রেট
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                ৳{mealSummary.totalCharge}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                মোট চার্জ
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            এই মাসের ডেটা পাওয়া যায়নি
          </p>
        )}
      </div>

      {/* Month Settings Info */}
      {monthSettingsLoading ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <FiTrendingUp className="text-primary-600" />
            মাসের সেটিংস
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : monthSettings ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <FiTrendingUp className="text-primary-600" />
            মাসের সেটিংস
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                শুরুর তারিখ
              </p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {format(new Date(monthSettings.startDate), "dd MMMM yyyy", {
                  locale: bn,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                শেষের তারিখ
              </p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {format(new Date(monthSettings.endDate), "dd MMMM yyyy", {
                  locale: bn,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                স্ট্যাটাস
              </p>
              <p
                className={`font-medium ${monthSettings.isFinalized ? "text-green-600" : "text-yellow-600"}`}
              >
                {monthSettings.isFinalized ? "ফাইনালাইজড" : "চলমান"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upcoming OFF Days */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <FiAlertCircle className="text-red-500" />
          আগামী ছুটির দিন
        </h2>
        {offDaysLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : upcomingOffDays.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            আগামী ১৪ দিনে কোনো ছুটি নেই
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingOffDays.slice(0, 5).map((day, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      day.type === "friday"
                        ? "bg-red-500"
                        : day.type === "saturday"
                          ? "bg-orange-500"
                          : "bg-purple-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {format(new Date(day.date), "EEEE, dd MMMM", {
                        locale: bn,
                      })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {day.reason}
                      {day.isAlsoHoliday && ` + ${day.holidayName}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    day.type === "friday"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : day.type === "saturday"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  }`}
                >
                  {day.type === "friday"
                    ? "শুক্রবার"
                    : day.type === "saturday"
                      ? "শনিবার"
                      : "ছুটি"}
                </span>
              </div>
            ))}
            {upcomingOffDays.length > 5 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                +{upcomingOffDays.length - 5} আরো ছুটি
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Links - Permission-Based */}
      <RequirePermission
        permission={[
          PERMISSIONS.VIEW_DAILY_MEALS,
          PERMISSIONS.MANAGE_BREAKFAST,
          PERMISSIONS.VIEW_ALL_BALANCES,
          PERMISSIONS.VIEW_ALL_REPORTS,
        ]}
        logic="any"
      >
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <FiUsers className="text-primary-600" />
            দ্রুত লিংক
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Daily Meals - Only if user can view daily meals */}
            <RequirePermission permission={PERMISSIONS.VIEW_DAILY_MEALS}>
              <Link
                to="/manager/daily-meals"
                className="bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30 rounded-lg p-4 text-center transition-colors"
              >
                <p className="font-medium text-primary-700 dark:text-primary-400">
                  দৈনিক মিল
                </p>
              </Link>
            </RequirePermission>

            {/* Breakfast Management - Only if user can manage breakfast */}
            <RequirePermission permission={PERMISSIONS.MANAGE_BREAKFAST}>
              <Link
                to="/manager/breakfast"
                className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg p-4 text-center transition-colors"
              >
                <p className="font-medium text-blue-700 dark:text-blue-400">
                  নাস্তা ম্যানেজ
                </p>
              </Link>
            </RequirePermission>

            {/* Balance Management - Only if user can update balances */}
            <RequirePermission permission={PERMISSIONS.UPDATE_BALANCES}>
              <Link
                to="/manager/balance"
                className="bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg p-4 text-center transition-colors"
              >
                <p className="font-medium text-green-700 dark:text-green-400">
                  ব্যালেন্স ম্যানেজ
                </p>
              </Link>
            </RequirePermission>

            {/* Reports - Only if user can view all reports */}
            <RequirePermission permission={PERMISSIONS.VIEW_ALL_REPORTS}>
              <Link
                to="/manager/reports"
                className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg p-4 text-center transition-colors"
              >
                <p className="font-medium text-purple-700 dark:text-purple-400">
                  সব রিপোর্ট
                </p>
              </Link>
            </RequirePermission>
          </div>
        </div>
      </RequirePermission>

      {/* Admin Quick Links */}
      {isAdmin && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <FiShield className="text-indigo-600" />
            এডমিন দ্রুত লিংক
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/admin/users"
              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 rounded-lg p-4 text-center transition-colors"
            >
              <FiUsers className="w-6 h-6 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
              <p className="font-medium text-indigo-700 dark:text-indigo-400">
                ইউজার ম্যানেজ
              </p>
            </Link>
            <Link
              to="/admin/holidays"
              className="bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 rounded-lg p-4 text-center transition-colors"
            >
              <FiCalendar className="w-6 h-6 mx-auto text-pink-600 dark:text-pink-400 mb-2" />
              <p className="font-medium text-pink-700 dark:text-pink-400">
                ছুটি ম্যানেজ
              </p>
            </Link>
            <Link
              to="/manager/month-settings"
              className="bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 rounded-lg p-4 text-center transition-colors"
            >
              <FiClock className="w-6 h-6 mx-auto text-cyan-600 dark:text-cyan-400 mb-2" />
              <p className="font-medium text-cyan-700 dark:text-cyan-400">
                মাস সেটিংস
              </p>
            </Link>
            <Link
              to="/manager/users"
              className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/30 rounded-lg p-4 text-center transition-colors"
            >
              <FiUserCheck className="w-6 h-6 mx-auto text-teal-600 dark:text-teal-400 mb-2" />
              <p className="font-medium text-teal-700 dark:text-teal-400">
                ইউজার তালিকা
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
