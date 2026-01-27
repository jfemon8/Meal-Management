import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminDashboard } from '../../hooks/queries/useReports';
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiInfo,
  FiRefreshCw,
  FiArrowRight,
  FiCoffee,
  FiSun,
  FiMoon,
  FiPieChart,
  FiActivity,
  FiShield,
  FiUserPlus,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import BDTIcon from '../../components/Icons/BDTIcon';

// ============================================
// Types
// ============================================

interface RoleStats {
  total: number;
  users: number;
  managers: number;
  admins: number;
  superadmins: number;
}

interface UserStats {
  inactive: number;
  newThisMonth: number;
  frozenBalances: number;
}

interface BalanceStats {
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

interface TransactionType {
  amount: number;
  count: number;
}

interface TransactionSummary {
  deposits: TransactionType;
  deductions: TransactionType;
  adjustments: TransactionType;
  refunds: TransactionType;
}

interface SystemAlert {
  type: 'warning' | 'info';
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  actionUrl?: string;
}

interface DashboardData {
  roleStats: RoleStats;
  userStats: UserStats;
  balanceStats: BalanceStats;
  transactionSummary: TransactionSummary;
  systemAlerts?: SystemAlert[];
  generatedAt: string;
}

interface StatCardProps {
  icon: IconType;
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  iconColor?: string;
}

interface BalanceCardProps {
  icon: IconType;
  title: string;
  amount: number;
  color: string;
}

interface TransactionCardProps {
  title: string;
  amount: number;
  count: number;
  icon: IconType;
  color: string;
  isPositive: boolean;
}

interface AlertStyles {
  bg: string;
  border: string;
  icon: string;
  iconBg: string;
}

// ============================================
// Component
// ============================================

const FinancialDashboard: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 dark:text-gray-400">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            ডাটা লোড করতে সমস্যা হয়েছে
          </h2>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  const dashboardData = data as DashboardData;
  const { roleStats, userStats, balanceStats, transactionSummary, systemAlerts } = dashboardData;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('bn-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    title,
    value,
    subtitle,
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </div>
  );

  const BalanceCard: React.FC<BalanceCardProps> = ({ icon: Icon, title, amount }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <span className="text-gray-600 dark:text-gray-400 text-sm">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-800 dark:text-white">
          {formatCurrency(amount)}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-sm">৳</span>
      </div>
    </div>
  );

  const TransactionCard: React.FC<TransactionCardProps> = ({
    title,
    amount,
    count,
    icon: Icon,
    isPositive,
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p className="font-medium text-gray-800 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{count} টি লেনদেন</p>
        </div>
      </div>
      <div
        className={`text-right font-semibold ${
          isPositive
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isPositive ? '+' : '-'}
        {formatCurrency(amount)} ৳
      </div>
    </div>
  );

  const getAlertStyles = (alert: SystemAlert): AlertStyles => {
    if (alert.type === 'warning') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    };
  };

  const getPriorityBadge = (priority: string): React.ReactNode => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            জরুরি
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            সাধারণ
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            কম
          </span>
        );
    }
  };

  const netFlow =
    transactionSummary.deposits.amount +
    transactionSummary.adjustments.amount +
    transactionSummary.refunds.amount -
    transactionSummary.deductions.amount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">আর্থিক ড্যাশবোর্ড</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            সিস্টেম-ওয়াইড আর্থিক সারসংক্ষেপ
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </button>
      </div>

      {/* System Alerts */}
      {systemAlerts && systemAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <FiAlertTriangle className="w-5 h-5 text-amber-500" />
            সিস্টেম অ্যালার্ট
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systemAlerts.map((alert, index) => {
              const styles = getAlertStyles(alert);
              return (
                <div
                  key={index}
                  className={`${styles.bg} ${styles.border} border rounded-xl p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                      {alert.type === 'warning' ? (
                        <FiAlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                      ) : (
                        <FiInfo className={`w-5 h-5 ${styles.icon}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                          {alert.title}
                        </h3>
                        {getPriorityBadge(alert.priority)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                      {alert.actionUrl && (
                        <Link
                          to={alert.actionUrl}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
                        >
                          দেখুন
                          <FiArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FiUsers className="w-5 h-5 text-primary-500" />
          ইউজার পরিসংখ্যান
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={FiUsers} title="মোট সক্রিয়" value={roleStats.total} />
          <StatCard icon={FiUserCheck} title="ইউজার" value={roleStats.users} />
          <StatCard icon={FiUserCheck} title="ম্যানেজার" value={roleStats.managers} />
          <StatCard icon={FiShield} title="এডমিন" value={roleStats.admins} />
          <StatCard icon={FiShield} title="সুপার এডমিন" value={roleStats.superadmins} />
          <StatCard icon={FiUserX} title="নিষ্ক্রিয়" value={userStats.inactive} />
        </div>
      </div>

      {/* User Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">এই মাসে নতুন</p>
              <p className="text-3xl font-bold">{userStats.newThisMonth}</p>
              <p className="text-green-100 text-xs mt-1">জন রেজিস্ট্রেশন</p>
            </div>
            <FiUserPlus className="w-12 h-12 text-green-200 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm mb-1">ফ্রোজেন ব্যালেন্স</p>
              <p className="text-3xl font-bold">{userStats.frozenBalances}</p>
              <p className="text-amber-100 text-xs mt-1">জন ইউজার</p>
            </div>
            <FiActivity className="w-12 h-12 text-amber-200 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">নিষ্ক্রিয় ইউজার</p>
              <p className="text-3xl font-bold">{userStats.inactive}</p>
              <p className="text-red-100 text-xs mt-1">জন ডিএক্টিভেটেড</p>
            </div>
            <FiUserX className="w-12 h-12 text-red-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* Balance Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <BDTIcon className="w-5 h-5 text-primary-500" />
          সিস্টেম ব্যালেন্স
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BalanceCard
            icon={FiCoffee}
            title="নাস্তা ব্যালেন্স"
            amount={balanceStats.breakfast}
            color="amber"
          />
          <BalanceCard
            icon={FiSun}
            title="দুপুরের খাবার ব্যালেন্স"
            amount={balanceStats.lunch}
            color="blue"
          />
          <BalanceCard
            icon={FiMoon}
            title="রাতের খাবার ব্যালেন্স"
            amount={balanceStats.dinner}
            color="purple"
          />
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white/20">
                <FiPieChart className="w-5 h-5" />
              </div>
              <span className="text-primary-100 text-sm">মোট ব্যালেন্স</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatCurrency(balanceStats.total)}</span>
              <span className="text-primary-100">৳</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FiActivity className="w-5 h-5 text-primary-500" />
          এই মাসের লেনদেন সারসংক্ষেপ
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TransactionCard
              title="জমা"
              amount={transactionSummary.deposits.amount}
              count={transactionSummary.deposits.count}
              icon={FiTrendingUp}
              color="green"
              isPositive={true}
            />
            <TransactionCard
              title="কর্তন"
              amount={transactionSummary.deductions.amount}
              count={transactionSummary.deductions.count}
              icon={FiTrendingDown}
              color="red"
              isPositive={false}
            />
            <TransactionCard
              title="অ্যাডজাস্টমেন্ট"
              amount={transactionSummary.adjustments.amount}
              count={transactionSummary.adjustments.count}
              icon={FiActivity}
              color="blue"
              isPositive={true}
            />
            <TransactionCard
              title="রিফান্ড"
              amount={transactionSummary.refunds.amount}
              count={transactionSummary.refunds.count}
              icon={FiRefreshCw}
              color="purple"
              isPositive={true}
            />
          </div>

          {/* Net Flow */}
          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">এই মাসের নেট ফ্লো</span>
              <span
                className={`text-xl font-bold ${
                  netFlow >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {netFlow >= 0 ? '+' : ''}
                {formatCurrency(netFlow)} ৳
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">দ্রুত লিংক</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <FiUserCheck className="w-8 h-8 text-primary-500 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">ইউজার ম্যানেজ</span>
          </Link>
          <Link
            to="/manager/balance"
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <BDTIcon className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">ব্যালেন্স ম্যানেজ</span>
          </Link>
          <Link
            to="/admin/audit-logs"
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <FiActivity className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">অডিট লগ</span>
          </Link>
          <Link
            to="/manager/reports"
            className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <FiPieChart className="w-8 h-8 text-purple-500 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">সব রিপোর্ট</span>
          </Link>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500">
        সর্বশেষ আপডেট: {new Date(dashboardData.generatedAt).toLocaleString('bn-BD')}
      </div>
    </div>
  );
};

export default FinancialDashboard;
