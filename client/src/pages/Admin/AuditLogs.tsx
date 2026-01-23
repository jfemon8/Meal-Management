import React, { useState, useEffect } from 'react';
import { FiActivity, FiSearch, FiFilter, FiRefreshCw, FiUser, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface AuditLog {
    _id: string;
    action: string;
    category: string;
    description: string;
    user?: {
        _id: string;
        name: string;
        email: string;
    };
    targetUser?: {
        _id: string;
        name: string;
    };
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    isReversible: boolean;
    isUndone: boolean;
    createdAt: string;
}

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

const categoryColors: Record<string, string> = {
    auth: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    user: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    balance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    meal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    breakfast: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    settings: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    holiday: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    report: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const categoryLabels: Record<string, string> = {
    auth: 'অথেনটিকেশন',
    user: 'ইউজার',
    balance: 'ব্যালেন্স',
    meal: 'মিল',
    breakfast: 'নাস্তা',
    settings: 'সেটিংস',
    holiday: 'ছুটি',
    report: 'রিপোর্ট',
    admin: 'এডমিন',
    superadmin: 'সুপার এডমিন',
    system: 'সিস্টেম',
};

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
    });

    // Filters
    const [category, setCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = async (page: number = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');
            if (category) params.append('category', category);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await api.get(`/audit-logs?${params.toString()}`);
            setLogs(response.data.logs);
            setPagination(response.data.pagination);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'লগ লোড করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            fetchLogs(1);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/audit-logs/search?query=${encodeURIComponent(searchTerm)}`);
            setLogs(response.data.logs);
            setPagination({
                currentPage: 1,
                totalPages: 1,
                totalItems: response.data.logs.length,
                itemsPerPage: response.data.logs.length,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'সার্চ করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, [category, startDate, endDate]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const clearFilters = () => {
        setCategory('');
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <FiActivity className="text-primary-600" />
                        অডিট লগ
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        সিস্টেমের সকল কার্যক্রমের রেকর্ড
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs(pagination.currentPage)}
                    className="btn-secondary flex items-center gap-2"
                    disabled={loading}
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    রিফ্রেশ
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="সার্চ করুন..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="input pl-10 w-full"
                            />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">সব ক্যাটাগরি</option>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input"
                            placeholder="শুরু"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input"
                            placeholder="শেষ"
                        />
                    </div>

                    {/* Clear Filters */}
                    <button
                        onClick={clearFilters}
                        className="btn-secondary"
                    >
                        <FiFilter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse flex gap-4 p-4 border-b dark:border-gray-700">
                                <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12">
                        <FiActivity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">কোনো লগ পাওয়া যায়নি</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">সময়</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ক্যাটাগরি</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">কার্যক্রম</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ইউজার</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">বিবরণ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <FiCalendar className="w-3 h-3" />
                                                {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a', { locale: bn })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${categoryColors[log.category] || categoryColors.system}`}>
                                                {categoryLabels[log.category] || log.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {log.action}
                                            {log.isUndone && (
                                                <span className="ml-2 text-xs text-red-500">(আনডু করা হয়েছে)</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.user ? (
                                                <div className="flex items-center gap-2">
                                                    <FiUser className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{log.user.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">সিস্টেম</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                            {log.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && logs.length > 0 && (
                    <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            মোট {pagination.totalItems} টি লগের মধ্যে{' '}
                            {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
                            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} দেখানো হচ্ছে
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {pagination.currentPage} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="p-2 rounded-lg border dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
