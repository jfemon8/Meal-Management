import React, { useState, useEffect } from 'react';
import { monthSettingsService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiCalendar, FiSave, FiChevronLeft, FiChevronRight, FiLock } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';

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

    const handleFinalize = async () => {
        if (!settings?._id) {
            toast.error('প্রথমে সেটিংস সেভ করুন');
            return;
        }

        if (!window.confirm('আপনি কি নিশ্চিত? ফাইনালাইজ করার পর এই মাসের সেটিংস পরিবর্তন করা যাবে না।')) return;

        try {
            await monthSettingsService.finalizeMonth(settings._id);
            toast.success('মাস ফাইনালাইজ হয়েছে');
            loadSettings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'ফাইনালাইজ করতে সমস্যা হয়েছে');
        }
    };

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">মাসের সেটিংস</h1>

            {/* Month Navigation */}
            <div className="card">
                <div className="flex items-center justify-center gap-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-semibold">
                        {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {settings?.isFinalized && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                        <FiLock />
                        <span>এই মাস ফাইনালাইজড</span>
                    </div>
                )}
            </div>

            {/* Settings Form */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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

                    {!settings?.isFinalized && (
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <FiSave />
                                {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                            </button>

                            {settings && !settings.isDefault && (
                                <button
                                    type="button"
                                    onClick={handleFinalize}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <FiLock />
                                    ফাইনালাইজ করুন
                                </button>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* Info */}
            <div className="card bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">গুরুত্বপূর্ণ তথ্য</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• মাসের রেঞ্জ সর্বোচ্চ ৩১ দিন হতে পারবে</li>
                    <li>• ফাইনালাইজ করার পর সেটিংস পরিবর্তন করা যাবে না</li>
                    <li>• মিল রেট অনুযায়ী ইউজারের মোট চার্জ ক্যালকুলেট হবে</li>
                </ul>
            </div>
        </div>
    );
};

export default MonthSettings;
