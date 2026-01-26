import React, { useState, useEffect } from 'react';
import { monthSettingsService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiCalendar, FiSave, FiChevronLeft, FiChevronRight, FiLock, FiEye, FiX } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const MonthSettings = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        lunchRate: '',
        dinnerRate: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        isLoading: false
    });

    useEffect(() => {
        loadSettings();
    }, [currentMonth]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const response = await monthSettingsService.getSettings(year, month);
            setSettings(response);

            // Set form data
            if (response && !response.isDefault) {
                setFormData({
                    startDate: format(new Date(response.startDate), 'yyyy-MM-dd'),
                    endDate: format(new Date(response.endDate), 'yyyy-MM-dd'),
                    lunchRate: response.lunchRate?.toString() || '',
                    dinnerRate: response.dinnerRate?.toString() || '',
                    notes: response.notes || ''
                });
            } else {
                // Default values
                const defaultStart = startOfMonth(currentMonth);
                const defaultEnd = endOfMonth(currentMonth);
                setFormData({
                    startDate: format(defaultStart, 'yyyy-MM-dd'),
                    endDate: format(defaultEnd, 'yyyy-MM-dd'),
                    lunchRate: '',
                    dinnerRate: '',
                    notes: ''
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.lunchRate) {
            toast.error('দুপুরের মিল রেট আবশ্যক');
            return;
        }

        setSubmitting(true);
        try {
            await monthSettingsService.saveSettings({
                year: currentMonth.getFullYear(),
                month: currentMonth.getMonth() + 1,
                startDate: formData.startDate,
                endDate: formData.endDate,
                lunchRate: parseFloat(formData.lunchRate),
                dinnerRate: parseFloat(formData.dinnerRate) || 0,
                notes: formData.notes
            });
            toast.success('সেটিংস সেভ হয়েছে');
            loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'সেভ করতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const openFinalizeConfirm = () => {
        if (!settings?._id) {
            toast.error('প্রথমে সেটিংস সেভ করুন');
            return;
        }
        setConfirmModal({ isOpen: true, isLoading: false });
    };

    const handleFinalize = async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await monthSettingsService.finalizeMonth(settings._id);
            toast.success('মাস ফাইনালাইজ হয়েছে');
            setConfirmModal({ isOpen: false, isLoading: false });
            loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'ফাইনালাইজ করতে সমস্যা হয়েছে');
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handlePreview = async () => {
        if (!settings?._id) {
            toast.error('প্রথমে সেটিংস সেভ করুন');
            return;
        }

        setShowPreview(true);
        setPreviewLoading(true);
        try {
            const data = await monthSettingsService.previewCalculation(settings._id);
            setPreviewData(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'প্রিভিউ লোড করতে সমস্যা হয়েছে');
            setShowPreview(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const getStatusBadge = (status, amount) => {
        if (status === 'due') {
            return <span className="text-red-600 dark:text-red-400 font-medium">৳{Math.abs(amount).toFixed(0)} বাকি</span>;
        } else if (status === 'advance') {
            return <span className="text-green-600 dark:text-green-400 font-medium">৳{Math.abs(amount).toFixed(0)} অগ্রিম</span>;
        }
        return <span className="text-gray-500">সেটেলড</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">মাসের সেটিংস</h1>

            {/* Month Navigation */}
            <div className="card">
                <div className="flex items-center justify-center gap-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <FiChevronLeft className="w-6 h-6 dark:text-gray-300" />
                    </button>
                    <h2 className="text-xl font-semibold dark:text-gray-100">
                        {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <FiChevronRight className="w-6 h-6 dark:text-gray-300" />
                    </button>
                </div>

                {settings?.isFinalized && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <FiLock />
                        <span>এই মাস ফাইনালাইজড</span>
                    </div>
                )}
            </div>

            {/* Settings Form */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
                    <FiCalendar className="text-primary-600" />
                    মাসের কনফিগারেশন
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">শুরুর তারিখ</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="input"
                                disabled={settings?.isFinalized}
                            />
                        </div>
                        <div>
                            <label className="label">শেষের তারিখ</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="input"
                                disabled={settings?.isFinalized}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">দুপুরের মিল রেট (টাকা/মিল)</label>
                            <div className="relative">
                                <BDTIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="number"
                                    value={formData.lunchRate}
                                    onChange={(e) => setFormData({ ...formData, lunchRate: e.target.value })}
                                    className="input pl-10"
                                    placeholder="0"
                                    min="0"
                                    disabled={settings?.isFinalized}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">রাতের মিল রেট (টাকা/মিল)</label>
                            <div className="relative">
                                <BDTIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="number"
                                    value={formData.dinnerRate}
                                    onChange={(e) => setFormData({ ...formData, dinnerRate: e.target.value })}
                                    className="input pl-10"
                                    placeholder="0"
                                    min="0"
                                    disabled={settings?.isFinalized}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label">নোট (ঐচ্ছিক)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input"
                            rows="3"
                            placeholder="কোন বিশেষ নোট..."
                            disabled={settings?.isFinalized}
                        />
                    </div>

                    <div className="flex gap-4 flex-wrap">
                        {!settings?.isFinalized && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <FiSave />
                                {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                            </button>
                        )}

                        {settings && !settings.isDefault && (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <FiEye />
                                    প্রিভিউ ক্যালকুলেশন
                                </button>

                                {!settings.isFinalized && (
                                    <button
                                        type="button"
                                        onClick={openFinalizeConfirm}
                                        className="btn bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-2"
                                    >
                                        <FiLock />
                                        ফাইনালাইজ করুন
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </form>
            </div>

            {/* Info */}
            <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">গুরুত্বপূর্ণ তথ্য</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• মাসের রেঞ্জ সর্বোচ্চ ৩১ দিন হতে পারবে</li>
                    <li>• ফাইনালাইজ করার পর সেটিংস পরিবর্তন করা যাবে না</li>
                    <li>• মিল রেট অনুযায়ী ইউজারের মোট চার্জ ক্যালকুলেট হবে</li>
                    <li>• প্রিভিউ দেখে ভেরিফাই করুন তারপর ফাইনালাইজ করুন</li>
                </ul>
            </div>

            {/* Finalize Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, isLoading: false })}
                onConfirm={handleFinalize}
                title="মাস ফাইনালাইজ করুন"
                message={
                    <div className="space-y-2">
                        <p>আপনি কি নিশ্চিত যে এই মাস ফাইনালাইজ করতে চান?</p>
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                            ফাইনালাইজ করার পর এই মাসের সেটিংস পরিবর্তন করা যাবে না।
                        </p>
                    </div>
                }
                confirmText="ফাইনালাইজ করুন"
                cancelText="বাতিল"
                variant="warning"
                isLoading={confirmModal.isLoading}
            />

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-primary-50 dark:bg-primary-900/30">
                            <div>
                                <h3 className="text-lg font-semibold dark:text-gray-100">মাসের ক্যালকুলেশন প্রিভিউ</h3>
                                {previewData && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {format(new Date(previewData.settings.startDate), 'dd MMM', { locale: bn })} -
                                        {' '}{format(new Date(previewData.settings.endDate), 'dd MMM yyyy', { locale: bn })}
                                        {' '}({previewData.settings.totalDays} দিন)
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            >
                                <FiX className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {previewLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                            </div>
                        ) : previewData && (
                            <>
                                {/* Grand Summary */}
                                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <h4 className="font-semibold mb-3 dark:text-gray-100">সামারি</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-primary-600">{previewData.grandTotals.totalUsers}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">মোট ইউজার</p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-green-600">
                                                {previewData.grandTotals.lunch.totalMeals + previewData.grandTotals.dinner.totalMeals}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">মোট মিল</p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-blue-600">৳{previewData.grandTotals.overall.totalCharge.toFixed(0)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">মোট চার্জ</p>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
                                            <p className={`text-2xl font-bold ${previewData.grandTotals.overall.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ৳{Math.abs(previewData.grandTotals.overall.totalDue).toFixed(0)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {previewData.grandTotals.overall.totalDue > 0 ? 'মোট বাকি' : 'মোট অগ্রিম'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">
                                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                                {previewData.grandTotals.overall.usersWithDue}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">বাকি আছে</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-center">
                                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {previewData.grandTotals.overall.usersWithAdvance}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">অগ্রিম আছে</p>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded text-center">
                                            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                                {previewData.grandTotals.overall.usersSettled}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">সেটেলড</p>
                                        </div>
                                    </div>
                                </div>

                                {/* User List */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    <h4 className="font-semibold mb-3 dark:text-gray-100">ইউজার ওয়াইজ হিসাব</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                <tr>
                                                    <th className="text-left p-2 dark:text-gray-200">নাম</th>
                                                    <th className="text-center p-2 dark:text-gray-200">দুপুর</th>
                                                    <th className="text-center p-2 dark:text-gray-200">রাত</th>
                                                    <th className="text-center p-2 dark:text-gray-200">নাস্তা</th>
                                                    <th className="text-center p-2 dark:text-gray-200">মোট চার্জ</th>
                                                    <th className="text-center p-2 dark:text-gray-200">ব্যালেন্স</th>
                                                    <th className="text-center p-2 dark:text-gray-200">স্ট্যাটাস</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-700">
                                                {previewData.userPreviews.map(user => (
                                                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="p-2 dark:text-gray-300">
                                                            <p className="font-medium">{user.name}</p>
                                                        </td>
                                                        <td className="text-center p-2 dark:text-gray-300">
                                                            <span className="text-xs">{user.lunch.meals} মিল</span>
                                                            <br />
                                                            <span className="text-gray-500">৳{user.lunch.charge}</span>
                                                        </td>
                                                        <td className="text-center p-2 dark:text-gray-300">
                                                            <span className="text-xs">{user.dinner.meals} মিল</span>
                                                            <br />
                                                            <span className="text-gray-500">৳{user.dinner.charge}</span>
                                                        </td>
                                                        <td className="text-center p-2 dark:text-gray-300">
                                                            ৳{user.breakfast.cost.toFixed(0)}
                                                        </td>
                                                        <td className="text-center p-2 font-medium dark:text-gray-200">
                                                            ৳{user.total.charge.toFixed(0)}
                                                        </td>
                                                        <td className="text-center p-2 dark:text-gray-300">
                                                            ৳{user.total.balance.toFixed(0)}
                                                        </td>
                                                        <td className="text-center p-2">
                                                            {getStatusBadge(user.total.status, user.total.due)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            রেট: দুপুর ৳{previewData.settings.lunchRate}/মিল, রাত ৳{previewData.settings.dinnerRate}/মিল
                                        </p>
                                        <button
                                            onClick={() => setShowPreview(false)}
                                            className="btn btn-secondary"
                                        >
                                            বন্ধ করুন
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthSettings;
