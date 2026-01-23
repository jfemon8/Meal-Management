import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiDownload, FiClock, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LowBalanceWarning from '../../components/Wallet/LowBalanceWarning';

const Wallet: React.FC = () => {
    const { user } = useAuth();
    const [downloading, setDownloading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: '',
        balanceType: ''
    });

    const downloadPDFStatement = async () => {
        setDownloading(true);
        try {
            const params = new URLSearchParams();
            if (dateRange.startDate) params.append('startDate', dateRange.startDate);
            if (dateRange.endDate) params.append('endDate', dateRange.endDate);
            if (dateRange.balanceType) params.append('balanceType', dateRange.balanceType);

            const response = await api.get(`/wallet/statement/pdf?${params}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `wallet-statement-${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('স্টেটমেন্ট ডাউনলোড সফল হয়েছে');
        } catch (error) {
            console.error('PDF download error:', error);
            toast.error('স্টেটমেন্ট ডাউনলোড ব্যর্থ হয়েছে');
        } finally {
            setDownloading(false);
        }
    };

    const getTotalBalance = () => {
        return (
            (user?.balances?.breakfast?.amount || 0) +
            (user?.balances?.lunch?.amount || 0) +
            (user?.balances?.dinner?.amount || 0)
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        আমার ওয়ালেট
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        ব্যালেন্স এবং লেনদেন দেখুন
                    </p>
                </div>
            </div>

            {/* Low Balance Warning */}
            <LowBalanceWarning
                balances={user?.balances}
                threshold={user?.balanceWarning?.threshold || 100}
            />

            {/* Total Balance Card */}
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/80 text-sm mb-1">মোট ব্যালেন্স</p>
                        <p className="text-4xl font-bold">৳{getTotalBalance().toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-white/20 rounded-full">
                        <FiDollarSign className="w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* Individual Wallet Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Breakfast Wallet */}
                <div className="card border-l-4 border-blue-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">নাস্তা ওয়ালেট</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                ৳{user?.balances?.breakfast?.amount?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        {user?.balances?.breakfast?.amount && user.balances.breakfast.amount >= 0 ? (
                            <FiTrendingUp className="text-green-500" />
                        ) : (
                            <FiTrendingDown className="text-red-500" />
                        )}
                    </div>
                    {user?.balances?.breakfast?.isFrozen && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-400 text-xs font-medium">
                                🔒 ফ্রিজ করা আছে
                            </p>
                            {user.balances.breakfast.frozenReason && (
                                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                    কারণ: {user.balances.breakfast.frozenReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Lunch Wallet */}
                <div className="card border-l-4 border-green-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">দুপুরের ওয়ালেট</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                ৳{user?.balances?.lunch?.amount?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        {user?.balances?.lunch?.amount && user.balances.lunch.amount >= 0 ? (
                            <FiTrendingUp className="text-green-500" />
                        ) : (
                            <FiTrendingDown className="text-red-500" />
                        )}
                    </div>
                    {user?.balances?.lunch?.isFrozen && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-400 text-xs font-medium">
                                🔒 ফ্রিজ করা আছে
                            </p>
                            {user.balances.lunch.frozenReason && (
                                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                    কারণ: {user.balances.lunch.frozenReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Dinner Wallet */}
                <div className="card border-l-4 border-purple-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">রাতের ওয়ালেট</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                ৳{user?.balances?.dinner?.amount?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        {user?.balances?.dinner?.amount && user.balances.dinner.amount >= 0 ? (
                            <FiTrendingUp className="text-green-500" />
                        ) : (
                            <FiTrendingDown className="text-red-500" />
                        )}
                    </div>
                    {user?.balances?.dinner?.isFrozen && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-400 text-xs font-medium">
                                🔒 ফ্রিজ করা আছে
                            </p>
                            {user.balances.dinner.frozenReason && (
                                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                    কারণ: {user.balances.dinner.frozenReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Download Statement */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <FiDownload className="text-primary-600" />
                    স্টেটমেন্ট ডাউনলোড করুন
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            শুরুর তারিখ
                        </label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            শেষের তারিখ
                        </label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ব্যালেন্স টাইপ
                        </label>
                        <select
                            value={dateRange.balanceType}
                            onChange={(e) => setDateRange({ ...dateRange, balanceType: e.target.value })}
                            className="input w-full"
                        >
                            <option value="">সব</option>
                            <option value="breakfast">নাস্তা</option>
                            <option value="lunch">দুপুর</option>
                            <option value="dinner">রাত</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={downloadPDFStatement}
                            disabled={downloading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <FiDownload />
                            {downloading ? 'ডাউনলোড হচ্ছে...' : 'PDF ডাউনলোড'}
                        </button>
                    </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FiClock className="inline mr-1" />
                    PDF স্টেটমেন্টে আপনার সম্পূর্ণ লেনদেন ইতিহাস এবং বর্তমান ব্যালেন্স থাকবে
                </p>
            </div>

            {/* Balance Warning Settings */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                    ওয়ার্নিং সেটিংস
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            লো ব্যালেন্স থ্রেশহোল্ড (৳)
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            যখন কোনো ব্যালেন্স এই পরিমাণের নিচে যাবে তখন সতর্কতা দেখাবে
                        </p>
                        <input
                            type="number"
                            value={user?.balanceWarning?.threshold || 100}
                            readOnly
                            className="input max-w-xs"
                            placeholder="100"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    বর্তমানে: ৳{user?.balanceWarning?.threshold || 100}
                </p>
            </div>
        </div>
    );
};

export default Wallet;
