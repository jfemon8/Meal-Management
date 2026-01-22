import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mealService, monthSettingsService } from '../../services/mealService';
import { FiCalendar, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import BDTIcon from '../../components/Icons/BDTIcon';

const Dashboard = () => {
    const { user, isManager } = useAuth();
    const [mealSummary, setMealSummary] = useState(null);
    const [monthSettings, setMonthSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            const [summaryRes, settingsRes] = await Promise.all([
                mealService.getMealSummary(year, month),
                monthSettingsService.getCurrentSettings()
            ]);

            setMealSummary(summaryRes);
            setMonthSettings(settingsRes);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">স্বাগতম, {user?.name}!</h1>
                    <p className="text-gray-500">
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
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiCalendar className="text-primary-600" />
                    এই মাসের সারসংক্ষেপ
                </h2>

                {mealSummary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-primary-600">{mealSummary.totalMeals}</p>
                            <p className="text-sm text-gray-500">মোট মিল</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{mealSummary.totalDaysOn}</p>
                            <p className="text-sm text-gray-500">মিল অন দিন</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">৳{mealSummary.lunchRate}</p>
                            <p className="text-sm text-gray-500">মিল রেট</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">৳{mealSummary.totalCharge}</p>
                            <p className="text-sm text-gray-500">মোট চার্জ</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500">এই মাসের ডেটা পাওয়া যায়নি</p>
                )}
            </div>

            {/* Month Settings Info */}
            {monthSettings && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FiTrendingUp className="text-primary-600" />
                        মাসের সেটিংস
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">শুরুর তারিখ</p>
                            <p className="font-medium">
                                {format(new Date(monthSettings.startDate), 'dd MMMM yyyy', { locale: bn })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">শেষের তারিখ</p>
                            <p className="font-medium">
                                {format(new Date(monthSettings.endDate), 'dd MMMM yyyy', { locale: bn })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">স্ট্যাটাস</p>
                            <p className={`font-medium ${monthSettings.isFinalized ? 'text-green-600' : 'text-yellow-600'}`}>
                                {monthSettings.isFinalized ? 'ফাইনালাইজড' : 'চলমান'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Links for Manager */}
            {isManager && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FiUsers className="text-primary-600" />
                        দ্রুত লিংক (ম্যানেজার)
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="/manager/daily-meals" className="bg-primary-50 hover:bg-primary-100 rounded-lg p-4 text-center transition-colors">
                            <p className="font-medium text-primary-700">দৈনিক মিল</p>
                        </a>
                        <a href="/manager/breakfast" className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 text-center transition-colors">
                            <p className="font-medium text-blue-700">নাস্তা ম্যানেজ</p>
                        </a>
                        <a href="/manager/balance" className="bg-green-50 hover:bg-green-100 rounded-lg p-4 text-center transition-colors">
                            <p className="font-medium text-green-700">ব্যালেন্স ম্যানেজ</p>
                        </a>
                        <a href="/manager/reports" className="bg-purple-50 hover:bg-purple-100 rounded-lg p-4 text-center transition-colors">
                            <p className="font-medium text-purple-700">সব রিপোর্ট</p>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
