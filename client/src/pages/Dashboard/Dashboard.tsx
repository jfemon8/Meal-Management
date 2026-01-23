import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMealSummary } from '../../hooks/queries/useMeals';
import { useCurrentMonthSettings } from '../../hooks/queries/useMonthSettings';
import { FiCalendar, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import BDTIcon from '../../components/Icons/BDTIcon';
import { Skeleton } from '../../components/ui/skeleton';
import { Link } from 'react-router-dom';
import { PERMISSIONS, RequirePermission } from '../../utils/permissions';

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    subtitle?: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="card">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const { data: mealSummary, isLoading: mealSummaryLoading } = useMealSummary(year, month);
    const { data: monthSettings, isLoading: monthSettingsLoading } = useCurrentMonthSettings();

    const isLoading = mealSummaryLoading || monthSettingsLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        স্বাগতম, {user?.name}!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: bn })}
                    </p>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={BDTIcon}
                    title="নাস্তা ব্যালেন্স"
                    value={`৳${user?.balances?.breakfast || 0}`}
                    color="text-blue-600"
                />
                <StatCard
                    icon={BDTIcon}
                    title="দুপুরের ব্যালেন্স"
                    value={`৳${user?.balances?.lunch || 0}`}
                    color="text-green-600"
                />
                <StatCard
                    icon={BDTIcon}
                    title="রাতের ব্যালেন্স"
                    value={`৳${user?.balances?.dinner || 0}`}
                    color="text-purple-600"
                />
            </div>

            {/* Current Month Summary */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiCalendar className="text-primary-600" />
                    এই মাসের সারসংক্ষেপ
                </h2>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                                <Skeleton className="h-4 w-20 mx-auto" />
                            </div>
                        ))}
                    </div>
                ) : mealSummary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-primary-600">{mealSummary.totalMeals}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">মোট মিল</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{mealSummary.totalDaysOn}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">মিল অন দিন</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">৳{mealSummary.lunchRate}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">মিল রেট</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">৳{mealSummary.totalCharge}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">মোট চার্জ</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">এই মাসের ডেটা পাওয়া যায়নি</p>
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">শুরুর তারিখ</p>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                {format(new Date(monthSettings.startDate), 'dd MMMM yyyy', { locale: bn })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">শেষের তারিখ</p>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                {format(new Date(monthSettings.endDate), 'dd MMMM yyyy', { locale: bn })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">স্ট্যাটাস</p>
                            <p className={`font-medium ${monthSettings.isFinalized ? 'text-green-600' : 'text-yellow-600'}`}>
                                {monthSettings.isFinalized ? 'ফাইনালাইজড' : 'চলমান'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Quick Links - Permission-Based */}
            <RequirePermission
                permission={[
                    PERMISSIONS.VIEW_DAILY_MEALS,
                    PERMISSIONS.MANAGE_BREAKFAST,
                    PERMISSIONS.VIEW_ALL_BALANCES,
                    PERMISSIONS.VIEW_ALL_REPORTS
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
                                <p className="font-medium text-primary-700 dark:text-primary-400">দৈনিক মিল</p>
                            </Link>
                        </RequirePermission>

                        {/* Breakfast Management - Only if user can manage breakfast */}
                        <RequirePermission permission={PERMISSIONS.MANAGE_BREAKFAST}>
                            <Link
                                to="/manager/breakfast"
                                className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg p-4 text-center transition-colors"
                            >
                                <p className="font-medium text-blue-700 dark:text-blue-400">নাস্তা ম্যানেজ</p>
                            </Link>
                        </RequirePermission>

                        {/* Balance Management - Only if user can update balances */}
                        <RequirePermission permission={PERMISSIONS.UPDATE_BALANCES}>
                            <Link
                                to="/manager/balance"
                                className="bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg p-4 text-center transition-colors"
                            >
                                <p className="font-medium text-green-700 dark:text-green-400">ব্যালেন্স ম্যানেজ</p>
                            </Link>
                        </RequirePermission>

                        {/* Reports - Only if user can view all reports */}
                        <RequirePermission permission={PERMISSIONS.VIEW_ALL_REPORTS}>
                            <Link
                                to="/manager/reports"
                                className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg p-4 text-center transition-colors"
                            >
                                <p className="font-medium text-purple-700 dark:text-purple-400">সব রিপোর্ট</p>
                            </Link>
                        </RequirePermission>
                    </div>
                </div>
            </RequirePermission>
        </div>
    );
};

export default Dashboard;
