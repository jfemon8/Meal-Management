import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiUser, FiMail, FiPhone, FiSave, FiLock, FiMonitor, FiSmartphone, FiBell, FiMail as FiMailIcon, FiMessageSquare, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [loginHistory, setLoginHistory] = useState([]);
    const [loginLoading, setLoginLoading] = useState(true);
    const [notificationPrefs, setNotificationPrefs] = useState({
        email: { enabled: true, lowBalance: true, mealReminder: true, monthlyReport: true, systemUpdates: false },
        push: { enabled: false, lowBalance: true, mealReminder: true },
        sms: { enabled: false, lowBalance: false }
    });
    const [notifLoading, setNotifLoading] = useState(true);
    const [notifSaving, setNotifSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    useEffect(() => {
        loadLoginHistory();
        loadNotificationPrefs();
    }, []);

    const loadLoginHistory = async () => {
        try {
            const response = await api.get('/auth/login-history?limit=10');
            setLoginHistory(response.data.history || []);
        } catch (error) {
            console.error('Error loading login history:', error);
        } finally {
            setLoginLoading(false);
        }
    };

    const loadNotificationPrefs = async () => {
        try {
            const response = await api.get('/users/notification-preferences');
            setNotificationPrefs(response.data);
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setNotifLoading(false);
        }
    };

    const handleNotifChange = (category, key, value) => {
        setNotificationPrefs(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const saveNotificationPrefs = async () => {
        setNotifSaving(true);
        try {
            await api.put('/users/notification-preferences', notificationPrefs);
            toast.success('নোটিফিকেশন সেটিংস সেভ হয়েছে');
        } catch (error) {
            toast.error('সেটিংস সেভ করতে সমস্যা হয়েছে');
        } finally {
            setNotifSaving(false);
        }
    };

    const getDeviceIcon = (device) => {
        if (device?.toLowerCase().includes('mobile') || device?.toLowerCase().includes('android') || device?.toLowerCase().includes('ios')) {
            return <FiSmartphone className="w-5 h-5" />;
        }
        return <FiMonitor className="w-5 h-5" />;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"><FiCheckCircle /> সফল</span>;
            case 'failed':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"><FiXCircle /> ব্যর্থ</span>;
            case 'suspicious':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"><FiAlertCircle /> সন্দেহজনক</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.put(`/users/${user._id}`, formData);
            updateUser(response.data);
            toast.success('প্রোফাইল আপডেট হয়েছে');
        } catch (error) {
            toast.error(error.response?.data?.message || 'আপডেট ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('নতুন পাসওয়ার্ড মিলছে না');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }

        setPasswordLoading(true);

        try {
            await api.put('/auth/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">প্রোফাইল</h1>

            {/* Profile Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiUser className="text-primary-600" />
                    ব্যক্তিগত তথ্য
                </h2>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="label">নাম</label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ইমেইল</label>
                        <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ফোন</label>
                        <div className="relative">
                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <FiSave />
                        {loading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                    </button>
                </form>
            </div>

            {/* Balance Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">ব্যালেন্স</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">৳{user?.balances?.breakfast?.amount ?? user?.balances?.breakfast ?? 0}</p>
                        <p className="text-sm text-gray-500">নাস্তা</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">৳{user?.balances?.lunch?.amount ?? user?.balances?.lunch ?? 0}</p>
                        <p className="text-sm text-gray-500">দুপুর</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">৳{user?.balances?.dinner?.amount ?? user?.balances?.dinner ?? 0}</p>
                        <p className="text-sm text-gray-500">রাত</p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiLock className="text-primary-600" />
                    পাসওয়ার্ড পরিবর্তন
                </h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="label">বর্তমান পাসওয়ার্ড</label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">নতুন পাসওয়ার্ড</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <FiLock />
                        {passwordLoading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                    </button>
                </form>
            </div>

            {/* Role Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">রোল তথ্য</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    আপনার রোল:{' '}
                    <span className={`font-medium ${user?.role === 'superadmin' ? 'text-purple-600' :
                            user?.role === 'admin' ? 'text-red-600' :
                                user?.role === 'manager' ? 'text-blue-600' :
                                    'text-green-600'
                        }`}>
                        {user?.role === 'superadmin' ? 'সুপার এডমিন' :
                            user?.role === 'admin' ? 'এডমিন' :
                                user?.role === 'manager' ? 'ম্যানেজার' : 'ইউজার'}
                    </span>
                </p>
            </div>

            {/* Login Activity */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiMonitor className="text-primary-600" />
                    লগইন একটিভিটি
                </h2>

                {loginLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : loginHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">কোন লগইন হিস্ট্রি নেই</p>
                ) : (
                    <div className="space-y-3">
                        {loginHistory.map((login, index) => (
                            <div key={login._id || index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-gray-400 mt-1">
                                    {getDeviceIcon(login.deviceInfo?.device)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm dark:text-gray-200">
                                            {login.deviceInfo?.browser || 'Unknown'} - {login.deviceInfo?.os || login.deviceInfo?.platform || 'Unknown'}
                                        </span>
                                        {getStatusBadge(login.status)}
                                        {login.isSuspicious && (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">সতর্কতা</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {login.deviceInfo?.ip && `IP: ${login.deviceInfo.ip} • `}
                                        {login.loginMethod === 'password' ? 'পাসওয়ার্ড' :
                                            login.loginMethod === '2fa' ? '2FA' :
                                                login.loginMethod === 'otp_email' ? 'ইমেইল OTP' : login.loginMethod}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {format(new Date(login.loginAt), 'dd MMM yyyy, hh:mm a', { locale: bn })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notification Preferences */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiBell className="text-primary-600" />
                    নোটিফিকেশন সেটিংস
                </h2>

                {notifLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Email Notifications */}
                        <div className="border-b pb-4 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FiMailIcon className="text-blue-500" />
                                    <span className="font-medium dark:text-gray-200">ইমেইল নোটিফিকেশন</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationPrefs.email?.enabled}
                                        onChange={(e) => handleNotifChange('email', 'enabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                            {notificationPrefs.email?.enabled && (
                                <div className="ml-6 space-y-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email?.lowBalance}
                                            onChange={(e) => handleNotifChange('email', 'lowBalance', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">লো ব্যালেন্স সতর্কতা</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email?.mealReminder}
                                            onChange={(e) => handleNotifChange('email', 'mealReminder', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">মিল রিমাইন্ডার</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email?.monthlyReport}
                                            onChange={(e) => handleNotifChange('email', 'monthlyReport', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">মাসিক রিপোর্ট</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.email?.systemUpdates}
                                            onChange={(e) => handleNotifChange('email', 'systemUpdates', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">সিস্টেম আপডেট</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Push Notifications */}
                        <div className="border-b pb-4 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FiBell className="text-green-500" />
                                    <span className="font-medium dark:text-gray-200">পুশ নোটিফিকেশন</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationPrefs.push?.enabled}
                                        onChange={(e) => handleNotifChange('push', 'enabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                            {notificationPrefs.push?.enabled && (
                                <div className="ml-6 space-y-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.push?.lowBalance}
                                            onChange={(e) => handleNotifChange('push', 'lowBalance', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">লো ব্যালেন্স সতর্কতা</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.push?.mealReminder}
                                            onChange={(e) => handleNotifChange('push', 'mealReminder', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">মিল রিমাইন্ডার</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* SMS Notifications */}
                        <div className="pb-2">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FiMessageSquare className="text-purple-500" />
                                    <span className="font-medium dark:text-gray-200">SMS নোটিফিকেশন</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationPrefs.sms?.enabled}
                                        onChange={(e) => handleNotifChange('sms', 'enabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                            {notificationPrefs.sms?.enabled && (
                                <div className="ml-6 space-y-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs.sms?.lowBalance}
                                            onChange={(e) => handleNotifChange('sms', 'lowBalance', e.target.checked)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="dark:text-gray-300">লো ব্যালেন্স সতর্কতা</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={saveNotificationPrefs}
                            disabled={notifSaving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <FiSave />
                            {notifSaving ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
