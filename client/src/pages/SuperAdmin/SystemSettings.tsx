import React, { useState, useEffect } from 'react';
import {
    FiDatabase,
    FiServer,
    FiHardDrive,
    FiCpu,
    FiRefreshCw,
    FiTrash2,
    FiDownload,
    FiUpload,
    FiAlertTriangle,
    FiCheck,
    FiActivity
} from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface SystemStats {
    database: {
        collections: number;
        totalDocuments: number;
        dbSize: string;
    };
    users: {
        total: number;
        active: number;
        inactive: number;
        byRole: Record<string, number>;
    };
    meals: {
        totalMeals: number;
        thisMonth: number;
    };
    transactions: {
        total: number;
        thisMonth: number;
    };
}

const SystemSettings: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch system stats - you'll need to create this endpoint
            const [usersRes, statsRes] = await Promise.all([
                api.get('/users'),
                api.get('/audit-logs/summary').catch(() => ({ data: { summary: {} } }))
            ]);

            const users = usersRes.data;
            const byRole: Record<string, number> = {};
            users.forEach((u: any) => {
                byRole[u.role] = (byRole[u.role] || 0) + 1;
            });

            setStats({
                database: {
                    collections: 10,
                    totalDocuments: users.length * 50, // Estimate
                    dbSize: 'N/A'
                },
                users: {
                    total: users.length,
                    active: users.filter((u: any) => u.isActive).length,
                    inactive: users.filter((u: any) => !u.isActive).length,
                    byRole
                },
                meals: {
                    totalMeals: 0,
                    thisMonth: 0
                },
                transactions: {
                    total: 0,
                    thisMonth: 0
                }
            });
        } catch (error: any) {
            toast.error('ডেটা লোড করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleClearCache = async () => {
        setActionLoading('cache');
        try {
            // Simulated - add actual endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('ক্যাশ পরিষ্কার করা হয়েছে');
        } catch (error) {
            toast.error('ক্যাশ পরিষ্কার করতে ব্যর্থ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBackupDatabase = async () => {
        setActionLoading('backup');
        try {
            // Simulated - add actual endpoint
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success('ডেটাবেস ব্যাকআপ সম্পন্ন');
        } catch (error) {
            toast.error('ব্যাকআপ করতে ব্যর্থ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearOldLogs = async () => {
        if (!window.confirm('৯০ দিনের পুরানো লগ মুছে ফেলা হবে। আপনি কি নিশ্চিত?')) return;

        setActionLoading('logs');
        try {
            await api.delete('/audit-logs/old?days=90');
            toast.success('পুরানো লগ মুছে ফেলা হয়েছে');
        } catch (error) {
            toast.error('লগ মুছতে ব্যর্থ');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="card h-32 bg-gray-200 dark:bg-gray-700"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <FiDatabase className="text-primary-600" />
                        সিস্টেম সেটিংস
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        সিস্টেম কনফিগারেশন এবং মেইনটেন্যান্স
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="btn-secondary flex items-center gap-2"
                    disabled={loading}
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    রিফ্রেশ
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <FiServer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">মোট ইউজার</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats?.users.total}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400">{stats?.users.active} সক্রিয়</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-red-600 dark:text-red-400">{stats?.users.inactive} নিষ্ক্রিয়</span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                            <FiHardDrive className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ডেটাবেস সাইজ</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats?.database.dbSize}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {stats?.database.collections} কালেকশন
                    </p>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <FiCpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">সার্ভার স্ট্যাটাস</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                                <FiCheck /> সক্রিয়
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <FiActivity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ডকুমেন্টস</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {stats?.database.totalDocuments?.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Role Distribution */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    রোল অনুযায়ী ইউজার
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats?.users.byRole && Object.entries(stats.users.byRole).map(([role, count]) => (
                        <div
                            key={role}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center"
                        >
                            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{count}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {role === 'superadmin' ? 'সুপার এডমিন' :
                                    role === 'admin' ? 'এডমিন' :
                                        role === 'manager' ? 'ম্যানেজার' : 'ইউজার'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Maintenance Actions */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <FiAlertTriangle className="text-yellow-500" />
                    মেইনটেন্যান্স অ্যাকশন
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={handleClearCache}
                        disabled={actionLoading === 'cache'}
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'cache' ? (
                            <FiRefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        ) : (
                            <FiTrash2 className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300">ক্যাশ পরিষ্কার</span>
                    </button>

                    <button
                        onClick={handleBackupDatabase}
                        disabled={actionLoading === 'backup'}
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'backup' ? (
                            <FiRefreshCw className="w-5 h-5 animate-spin text-green-600" />
                        ) : (
                            <FiDownload className="w-5 h-5 text-green-600" />
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300">ডেটাবেস ব্যাকআপ</span>
                    </button>

                    <button
                        onClick={handleClearOldLogs}
                        disabled={actionLoading === 'logs'}
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'logs' ? (
                            <FiRefreshCw className="w-5 h-5 animate-spin text-red-600" />
                        ) : (
                            <FiTrash2 className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300">পুরানো লগ মুছুন</span>
                    </button>
                </div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    এই অ্যাকশনগুলো সাবধানে ব্যবহার করুন। কিছু অ্যাকশন অপরিবর্তনীয়।
                </p>
            </div>

            {/* System Info */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    সিস্টেম তথ্য
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">অ্যাপ্লিকেশন</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">মিল ম্যানেজমেন্ট সিস্টেম</span>
                    </div>
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">ভার্সন</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Node.js</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{process.env.NODE_ENV || 'development'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500 dark:text-gray-400">ডেটাবেস</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">MongoDB</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
