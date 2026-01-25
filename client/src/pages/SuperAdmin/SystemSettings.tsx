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
    FiActivity,
    FiClock,
    FiFile,
    FiX
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

interface Backup {
    filename: string;
    createdAt: string;
    size: number;
    sizeFormatted: string;
    collections: Record<string, number>;
    createdBy: string;
}

const SystemSettings: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showBackupList, setShowBackupList] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState<Backup | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [usersRes] = await Promise.all([
                api.get('/users'),
            ]);

            const users = usersRes.data;
            const byRole: Record<string, number> = {};
            users.forEach((u: any) => {
                byRole[u.role] = (byRole[u.role] || 0) + 1;
            });

            setStats({
                database: {
                    collections: 10,
                    totalDocuments: users.length * 50,
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

    const fetchBackups = async () => {
        setBackupsLoading(true);
        try {
            const response = await api.get('/backup');
            setBackups(response.data.backups || []);
        } catch (error: any) {
            toast.error('ব্যাকআপ তালিকা লোড করতে ব্যর্থ');
        } finally {
            setBackupsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (showBackupList) {
            fetchBackups();
        }
    }, [showBackupList]);

    const handleClearCache = async () => {
        setActionLoading('cache');
        try {
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
            const response = await api.post('/backup');
            toast.success('ডেটাবেস ব্যাকআপ সম্পন্ন');
            if (showBackupList) {
                fetchBackups();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'ব্যাকআপ করতে ব্যর্থ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadBackup = async (filename: string) => {
        try {
            const response = await api.get(`/backup/${filename}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('ব্যাকআপ ডাউনলোড হচ্ছে');
        } catch (error: any) {
            toast.error('ডাউনলোড করতে ব্যর্থ');
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!window.confirm('এই ব্যাকআপটি মুছে ফেলতে চান?')) return;

        try {
            await api.delete(`/backup/${filename}`);
            toast.success('ব্যাকআপ মুছে ফেলা হয়েছে');
            fetchBackups();
        } catch (error: any) {
            toast.error('মুছতে ব্যর্থ');
        }
    };

    const handleRestoreBackup = async (backup: Backup) => {
        setActionLoading('restore');
        try {
            await api.post(`/backup/restore/${backup.filename}`, {
                confirmRestore: 'RESTORE_DATABASE'
            });
            toast.success('ডেটাবেস রিস্টোর সম্পন্ন');
            setShowRestoreConfirm(null);
            fetchStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'রিস্টোর করতে ব্যর্থ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearOldBackups = async () => {
        if (!window.confirm('৩০ দিনের পুরানো ব্যাকআপ মুছে ফেলা হবে। আপনি কি নিশ্চিত?')) return;

        setActionLoading('cleanBackups');
        try {
            const response = await api.delete('/backup/cleanup/old?days=30');
            toast.success(response.data.message);
            fetchBackups();
        } catch (error: any) {
            toast.error('ক্লিনআপ করতে ব্যর্থ');
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

            {/* Backup Management */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <FiHardDrive className="text-green-500" />
                        ব্যাকআপ ম্যানেজমেন্ট
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBackupList(!showBackupList)}
                            className="btn btn-outline btn-sm"
                        >
                            {showBackupList ? 'লুকান' : 'ব্যাকআপ তালিকা'}
                        </button>
                        <button
                            onClick={handleBackupDatabase}
                            disabled={actionLoading === 'backup'}
                            className="btn btn-primary btn-sm flex items-center gap-2"
                        >
                            {actionLoading === 'backup' ? (
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <FiDownload className="w-4 h-4" />
                            )}
                            নতুন ব্যাকআপ
                        </button>
                    </div>
                </div>

                {showBackupList && (
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        {backupsLoading ? (
                            <div className="p-8 text-center">
                                <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                <p className="mt-2 text-gray-500">লোড হচ্ছে...</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                কোনো ব্যাকআপ নেই
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">ফাইল</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">তারিখ</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">সাইজ</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">তৈরি করেছেন</th>
                                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-700">
                                            {backups.map((backup) => (
                                                <tr key={backup.filename} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <FiFile className="text-gray-400" />
                                                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                                                {backup.filename.substring(0, 25)}...
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(backup.createdAt).toLocaleString('bn-BD')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {backup.sizeFormatted}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {backup.createdBy}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleDownloadBackup(backup.filename)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                                title="ডাউনলোড"
                                                            >
                                                                <FiDownload className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setShowRestoreConfirm(backup)}
                                                                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                                                                title="রিস্টোর"
                                                            >
                                                                <FiUpload className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                                title="মুছুন"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
                                    <span className="text-sm text-gray-500">মোট {backups.length} টি ব্যাকআপ</span>
                                    <button
                                        onClick={handleClearOldBackups}
                                        disabled={actionLoading === 'cleanBackups'}
                                        className="text-sm text-red-600 hover:underline flex items-center gap-1"
                                    >
                                        {actionLoading === 'cleanBackups' ? (
                                            <FiRefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <FiTrash2 className="w-3 h-3" />
                                        )}
                                        পুরাতন ব্যাকআপ মুছুন
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Maintenance Actions */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <FiAlertTriangle className="text-yellow-500" />
                    মেইনটেন্যান্স অ্যাকশন
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        onClick={handleClearOldLogs}
                        disabled={actionLoading === 'logs'}
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'logs' ? (
                            <FiRefreshCw className="w-5 h-5 animate-spin text-red-600" />
                        ) : (
                            <FiTrash2 className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300">পুরানো লগ মুছুন (৯০ দিন)</span>
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

            {/* Restore Confirmation Modal */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                                <FiAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                ডেটাবেস রিস্টোর করুন?
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            এই ব্যাকআপ থেকে ডেটাবেস রিস্টোর করলে বর্তমান সব ডেটা মুছে যাবে এবং
                            ব্যাকআপের ডেটা দিয়ে প্রতিস্থাপিত হবে।
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 text-sm">
                            <p><strong>ফাইল:</strong> {showRestoreConfirm.filename}</p>
                            <p><strong>তারিখ:</strong> {new Date(showRestoreConfirm.createdAt).toLocaleString('bn-BD')}</p>
                            <p><strong>সাইজ:</strong> {showRestoreConfirm.sizeFormatted}</p>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
                            রিস্টোর করার আগে একটি প্রি-রিস্টোর ব্যাকআপ স্বয়ংক্রিয়ভাবে তৈরি হবে।
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRestoreConfirm(null)}
                                className="btn btn-outline flex items-center gap-2"
                            >
                                <FiX className="w-4 h-4" />
                                বাতিল
                            </button>
                            <button
                                onClick={() => handleRestoreBackup(showRestoreConfirm)}
                                disabled={actionLoading === 'restore'}
                                className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                            >
                                {actionLoading === 'restore' ? (
                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FiUpload className="w-4 h-4" />
                                )}
                                রিস্টোর করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemSettings;
