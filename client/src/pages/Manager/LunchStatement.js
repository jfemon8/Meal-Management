import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
    FiDownload,
    FiUsers,
    FiCalendar,
    FiFileText,
    FiSearch,
    FiFilter,
    FiChevronDown,
    FiChevronUp
} from 'react-icons/fi';
import {
    useMyGroup,
    useGroupMembers,
    useGroupLunchSummary,
    useDownloadUserLunchPDF,
    useDownloadGroupLunchPDF
} from '../../hooks/queries/useGroupReports';

const LunchStatement = () => {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, due, advance, settled
    const [expandedUser, setExpandedUser] = useState(null);

    // Queries
    const { data: myGroup, isLoading: groupLoading } = useMyGroup();
    const { data: members } = useGroupMembers();
    const { data: lunchSummary, isLoading: summaryLoading } = useGroupLunchSummary(
        selectedYear,
        selectedMonth
    );

    // Mutations
    const downloadUserPDF = useDownloadUserLunchPDF();
    const downloadGroupPDF = useDownloadGroupLunchPDF();

    // Year options (last 3 years)
    const yearOptions = useMemo(() => {
        const years = [];
        for (let i = 0; i < 3; i++) {
            years.push(currentDate.getFullYear() - i);
        }
        return years;
    }, []);

    // Month options
    const monthOptions = [
        { value: 1, label: 'জানুয়ারি' },
        { value: 2, label: 'ফেব্রুয়ারি' },
        { value: 3, label: 'মার্চ' },
        { value: 4, label: 'এপ্রিল' },
        { value: 5, label: 'মে' },
        { value: 6, label: 'জুন' },
        { value: 7, label: 'জুলাই' },
        { value: 8, label: 'আগস্ট' },
        { value: 9, label: 'সেপ্টেম্বর' },
        { value: 10, label: 'অক্টোবর' },
        { value: 11, label: 'নভেম্বর' },
        { value: 12, label: 'ডিসেম্বর' }
    ];

    // Filter members based on search and status
    const filteredMembers = useMemo(() => {
        if (!lunchSummary?.members) return [];

        return lunchSummary.members.filter(member => {
            // Search filter
            const matchesSearch = searchTerm
                ? member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  member.email?.toLowerCase().includes(searchTerm.toLowerCase())
                : true;

            // Status filter
            const matchesStatus = filterStatus === 'all'
                ? true
                : member.dueAdvance.type === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [lunchSummary?.members, searchTerm, filterStatus]);

    // Handle individual PDF download
    const handleDownloadUserPDF = async (userId, userName) => {
        try {
            await downloadUserPDF.mutateAsync({
                userId,
                year: selectedYear,
                month: selectedMonth
            });
        } catch (error) {
            console.error('PDF download error:', error);
            alert('PDF ডাউনলোড করতে সমস্যা হয়েছে');
        }
    };

    // Handle group PDF download
    const handleDownloadGroupPDF = async () => {
        try {
            await downloadGroupPDF.mutateAsync({
                year: selectedYear,
                month: selectedMonth
            });
        } catch (error) {
            console.error('Group PDF download error:', error);
            alert('গ্রুপ PDF ডাউনলোড করতে সমস্যা হয়েছে');
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (groupLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        লাঞ্চ স্টেটমেন্ট
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {myGroup ? `${myGroup.name} গ্রুপ` : 'গ্রুপ'} এর সদস্যদের লাঞ্চ স্টেটমেন্ট ডাউনলোড করুন
                    </p>
                </div>

                {/* Download Group PDF Button */}
                <button
                    onClick={handleDownloadGroupPDF}
                    disabled={downloadGroupPDF.isPending || !lunchSummary?.members?.length}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FiDownload className="w-5 h-5" />
                    {downloadGroupPDF.isPending ? 'ডাউনলোড হচ্ছে...' : 'সব সদস্যের PDF'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Year Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            বছর
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            মাস
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                            {monthOptions.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            সদস্য খুঁজুন
                        </label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="নাম বা ইমেইল..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            স্ট্যাটাস ফিল্টার
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">সবাই</option>
                            <option value="due">বকেয়া</option>
                            <option value="advance">অগ্রিম</option>
                            <option value="settled">সেটেল্ড</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {lunchSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <FiUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">মোট সদস্য</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {lunchSummary.summary.totalMembers}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <FiCalendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">মোট মিল</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {lunchSummary.summary.totalMeals}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <FiFileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">মোট চার্জ</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(lunchSummary.summary.totalCharge)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                                <FiDownload className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">মোট বকেয়া</p>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(lunchSummary.summary.totalDue)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Period Info */}
            {lunchSummary?.period && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                    <span className="text-blue-800 dark:text-blue-200">
                        সময়কাল: {format(new Date(lunchSummary.period.startDate), 'dd MMM yyyy', { locale: bn })}
                        {' '}-{' '}
                        {format(new Date(lunchSummary.period.endDate), 'dd MMM yyyy', { locale: bn })}
                        {' | '}
                        লাঞ্চ রেট: {formatCurrency(lunchSummary.period.lunchRate)}
                    </span>
                </div>
            )}

            {/* Members List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {summaryLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        কোন সদস্য পাওয়া যায়নি
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        সদস্য
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        মিল সংখ্যা
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        চার্জ
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ব্যালেন্স
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        স্ট্যাটাস
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        অ্যাকশন
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredMembers.map((member) => (
                                    <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {member.name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                                            {member.totalMeals} টি
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                            {formatCurrency(member.totalCharge)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                                            {formatCurrency(member.balance)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                member.dueAdvance.type === 'due'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    : member.dueAdvance.type === 'advance'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                                {member.dueAdvance.type === 'due' && `${formatCurrency(member.dueAdvance.amount)} বকেয়া`}
                                                {member.dueAdvance.type === 'advance' && `${formatCurrency(member.dueAdvance.amount)} অগ্রিম`}
                                                {member.dueAdvance.type === 'settled' && 'সেটেল্ড'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleDownloadUserPDF(member._id, member.name)}
                                                disabled={downloadUserPDF.isPending}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 disabled:opacity-50 transition-colors"
                                                title="PDF ডাউনলোড করুন"
                                            >
                                                <FiDownload className="w-4 h-4" />
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Filter Summary */}
            {filteredMembers.length !== lunchSummary?.members?.length && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    মোট {lunchSummary?.members?.length} সদস্যের মধ্যে {filteredMembers.length} জন দেখানো হচ্ছে
                </p>
            )}
        </div>
    );
};

export default LunchStatement;
