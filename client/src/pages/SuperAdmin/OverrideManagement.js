import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
    FiAlertTriangle,
    FiCalendar,
    FiCoffee,
    FiEdit3,
    FiUnlock,
    FiHistory,
    FiFilter,
    FiX,
    FiCheck,
    FiClock
} from 'react-icons/fi';
import {
    useFinalizedMonthSettings,
    useFinalizedBreakfasts,
    useCorrectionHistory,
    useForceUpdateMonthSettings,
    useForceUnfinalizeMonth,
    useForceUpdateBreakfast,
    useForceUnfinalizeBreakfast
} from '../../hooks/queries/useOverrides';

const OverrideManagement = () => {
    const [activeTab, setActiveTab] = useState('months');
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedBreakfast, setSelectedBreakfast] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUnfinalizeModal, setShowUnfinalizeModal] = useState(false);
    const [editType, setEditType] = useState(null); // 'month' or 'breakfast'
    const [historyFilter, setHistoryFilter] = useState({ targetType: '', limit: 50 });

    // Form states
    const [editForm, setEditForm] = useState({});
    const [reason, setReason] = useState('');

    // Queries
    const { data: monthSettings, isLoading: monthsLoading } = useFinalizedMonthSettings();
    const { data: breakfasts, isLoading: breakfastsLoading } = useFinalizedBreakfasts();
    const { data: correctionHistory, isLoading: historyLoading } = useCorrectionHistory(historyFilter);

    // Mutations
    const forceUpdateMonth = useForceUpdateMonthSettings();
    const unfinalizeMonth = useForceUnfinalizeMonth();
    const forceUpdateBreakfast = useForceUpdateBreakfast();
    const unfinalizeBreakfast = useForceUnfinalizeBreakfast();

    const tabs = [
        { id: 'months', label: 'মাসের সেটিংস', icon: FiCalendar },
        { id: 'breakfasts', label: 'ব্রেকফাস্ট', icon: FiCoffee },
        { id: 'history', label: 'সংশোধন ইতিহাস', icon: FiHistory }
    ];

    const handleEditMonth = (month) => {
        setSelectedMonth(month);
        setEditForm({
            lunchRate: month.lunchRate,
            dinnerRate: month.dinnerRate || 0,
            startDate: format(parseISO(month.startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(month.endDate), 'yyyy-MM-dd')
        });
        setReason('');
        setEditType('month');
        setShowEditModal(true);
    };

    const handleEditBreakfast = (breakfast) => {
        setSelectedBreakfast(breakfast);
        setEditForm({
            cost: breakfast.cost,
            items: breakfast.items || ''
        });
        setReason('');
        setEditType('breakfast');
        setShowEditModal(true);
    };

    const handleUnfinalizeMonth = (month) => {
        setSelectedMonth(month);
        setReason('');
        setEditType('month');
        setShowUnfinalizeModal(true);
    };

    const handleUnfinalizeBreakfast = (breakfast) => {
        setSelectedBreakfast(breakfast);
        setReason('');
        setEditType('breakfast');
        setShowUnfinalizeModal(true);
    };

    const submitEdit = async () => {
        if (!reason.trim()) {
            alert('কারণ উল্লেখ করা আবশ্যক');
            return;
        }

        try {
            if (editType === 'month') {
                await forceUpdateMonth.mutateAsync({
                    id: selectedMonth._id,
                    ...editForm,
                    reason
                });
            } else {
                await forceUpdateBreakfast.mutateAsync({
                    id: selectedBreakfast._id,
                    ...editForm,
                    reason
                });
            }
            setShowEditModal(false);
            setSelectedMonth(null);
            setSelectedBreakfast(null);
        } catch (error) {
            alert(error.response?.data?.message || 'সংশোধন ব্যর্থ হয়েছে');
        }
    };

    const submitUnfinalize = async () => {
        if (!reason.trim()) {
            alert('কারণ উল্লেখ করা আবশ্যক');
            return;
        }

        try {
            if (editType === 'month') {
                await unfinalizeMonth.mutateAsync({
                    id: selectedMonth._id,
                    reason
                });
            } else {
                await unfinalizeBreakfast.mutateAsync({
                    id: selectedBreakfast._id,
                    reason
                });
            }
            setShowUnfinalizeModal(false);
            setSelectedMonth(null);
            setSelectedBreakfast(null);
        } catch (error) {
            alert(error.response?.data?.message || 'আনফাইনালাইজ ব্যর্থ হয়েছে');
        }
    };

    const formatDate = (dateStr) => {
        try {
            return format(parseISO(dateStr), 'd MMM yyyy', { locale: bn });
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr) => {
        try {
            return format(parseISO(dateStr), 'd MMM yyyy, h:mm a', { locale: bn });
        } catch {
            return dateStr;
        }
    };

    const getMonthName = (month) => {
        const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        return months[month - 1] || month;
    };

    const getActionLabel = (action) => {
        const labels = {
            'force_update': 'জোরপূর্বক আপডেট',
            'force_unfinalize': 'জোরপূর্বক আনফাইনালাইজ',
            'balance_correction': 'ব্যালেন্স সংশোধন',
            'transaction_void': 'লেনদেন বাতিল'
        };
        return labels[action] || action;
    };

    const getTargetTypeLabel = (type) => {
        const labels = {
            'monthSettings': 'মাসের সেটিংস',
            'breakfast': 'ব্রেকফাস্ট',
            'transaction': 'লেনদেন',
            'balance': 'ব্যালেন্স'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <FiAlertTriangle className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">ওভাররাইড ম্যানেজমেন্ট</h1>
                </div>
                <p className="text-orange-100">
                    ফাইনালাইজড রেকর্ড সংশোধন করুন। সকল পরিবর্তন অডিট লগে রেকর্ড হবে।
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <FiAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">সতর্কতা</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            এই পৃষ্ঠায় আপনি ফাইনালাইজড রেকর্ড সংশোধন করতে পারবেন। প্রতিটি পরিবর্তনের জন্য কারণ উল্লেখ করা বাধ্যতামূলক
                            এবং সকল পরিবর্তন অডিট ট্রেইলে সংরক্ষিত থাকবে।
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Month Settings Tab */}
                    {activeTab === 'months' && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                ফাইনালাইজড মাসের সেটিংস
                            </h2>

                            {monthsLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : !monthSettings?.length ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    কোনো ফাইনালাইজড মাস নেই
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">মাস</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">তারিখ পরিসীমা</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">লাঞ্চ রেট</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">ডিনার রেট</th>
                                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthSettings.map((month) => (
                                                <tr key={month._id} className="border-b border-gray-100 dark:border-gray-700/50">
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {getMonthName(month.month)} {month.year}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                        {formatDate(month.startDate)} - {formatDate(month.endDate)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200">
                                                        ৳{month.lunchRate}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200">
                                                        ৳{month.dinnerRate || 0}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEditMonth(month)}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                                title="সংশোধন করুন"
                                                            >
                                                                <FiEdit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUnfinalizeMonth(month)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="আনফাইনালাইজ করুন"
                                                            >
                                                                <FiUnlock className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Breakfast Tab */}
                    {activeTab === 'breakfasts' && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                ফাইনালাইজড ব্রেকফাস্ট
                            </h2>

                            {breakfastsLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : !breakfasts?.length ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    কোনো ফাইনালাইজড ব্রেকফাস্ট নেই
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">তারিখ</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">আইটেম</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">খরচ</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">জমা দিয়েছেন</th>
                                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {breakfasts.map((breakfast) => (
                                                <tr key={breakfast._id} className="border-b border-gray-100 dark:border-gray-700/50">
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {formatDate(breakfast.date)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                        {breakfast.items || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-800 dark:text-gray-200">
                                                        ৳{breakfast.cost}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                        {breakfast.submittedBy?.name || '-'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEditBreakfast(breakfast)}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                                title="সংশোধন করুন"
                                                            >
                                                                <FiEdit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUnfinalizeBreakfast(breakfast)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="আনফাইনালাইজ করুন"
                                                            >
                                                                <FiUnlock className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    সংশোধন ইতিহাস
                                </h2>
                                <div className="flex items-center gap-2">
                                    <FiFilter className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={historyFilter.targetType}
                                        onChange={(e) => setHistoryFilter({ ...historyFilter, targetType: e.target.value })}
                                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    >
                                        <option value="">সব ধরন</option>
                                        <option value="monthSettings">মাসের সেটিংস</option>
                                        <option value="breakfast">ব্রেকফাস্ট</option>
                                        <option value="transaction">লেনদেন</option>
                                        <option value="balance">ব্যালেন্স</option>
                                    </select>
                                </div>
                            </div>

                            {historyLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : !correctionHistory?.length ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    কোনো সংশোধন ইতিহাস নেই
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {correctionHistory.map((entry) => (
                                        <div
                                            key={entry._id}
                                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                                        <FiClock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                                {getActionLabel(entry.action)}
                                                            </span>
                                                            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300">
                                                                {getTargetTypeLabel(entry.targetType)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            <strong>কারণ:</strong> {entry.reason}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {entry.performedBy?.name} দ্বারা
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(entry.createdAt)}
                                                </span>
                                            </div>

                                            {(entry.previousValue || entry.newValue) && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">পূর্বের মান:</span>
                                                        <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto">
                                                            {JSON.stringify(entry.previousValue, null, 2)}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">নতুন মান:</span>
                                                        <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto">
                                                            {JSON.stringify(entry.newValue, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    {editType === 'month' ? 'মাসের সেটিংস সংশোধন' : 'ব্রেকফাস্ট সংশোধন'}
                                </h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {editType === 'month' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                লাঞ্চ রেট (৳)
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.lunchRate || ''}
                                                onChange={(e) => setEditForm({ ...editForm, lunchRate: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                ডিনার রেট (৳)
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.dinnerRate || ''}
                                                onChange={(e) => setEditForm({ ...editForm, dinnerRate: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                শুরুর তারিখ
                                            </label>
                                            <input
                                                type="date"
                                                value={editForm.startDate || ''}
                                                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                শেষের তারিখ
                                            </label>
                                            <input
                                                type="date"
                                                value={editForm.endDate || ''}
                                                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            খরচ (৳)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.cost || ''}
                                            onChange={(e) => setEditForm({ ...editForm, cost: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            আইটেম
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.items || ''}
                                            onChange={(e) => setEditForm({ ...editForm, items: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    সংশোধনের কারণ *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="কেন এই সংশোধন করা হচ্ছে তা উল্লেখ করুন..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={forceUpdateMonth.isPending || forceUpdateBreakfast.isPending}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <FiCheck className="w-4 h-4" />
                                সংশোধন করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unfinalize Modal */}
            {showUnfinalizeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    আনফাইনালাইজ নিশ্চিত করুন
                                </h3>
                                <button
                                    onClick={() => setShowUnfinalizeModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        এই অ্যাকশনের ফলে রেকর্ডটি আবার এডিটেবল হয়ে যাবে। এটি শুধুমাত্র জরুরি পরিস্থিতিতে করা উচিত।
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    কারণ *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="কেন এই রেকর্ড আনফাইনালাইজ করা হচ্ছে..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowUnfinalizeModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={submitUnfinalize}
                                disabled={unfinalizeMonth.isPending || unfinalizeBreakfast.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <FiUnlock className="w-4 h-4" />
                                আনফাইনালাইজ করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverrideManagement;
