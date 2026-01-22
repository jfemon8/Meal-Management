import React, { useState, useEffect } from 'react';
import { holidayService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiPlus, FiEdit2, FiTrash2, FiSun, FiCalendar, FiDownload } from 'react-icons/fi';

const HolidayManagement = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [formData, setFormData] = useState({
        date: '',
        name: '',
        nameBn: '',
        type: 'government',
        isRecurring: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        loadHolidays();
    }, [year]);

    const loadHolidays = async () => {
        setLoading(true);
        try {
            const response = await holidayService.getHolidays(year);
            setHolidays(response);
        } catch (error) {
            console.error('Error loading holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            date: '',
            name: '',
            nameBn: '',
            type: 'government',
            isRecurring: false
        });
        setEditingHoliday(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.date || !formData.name || !formData.nameBn) {
            toast.error('তারিখ এবং নাম আবশ্যক');
            return;
        }

        setSubmitting(true);
        try {
            if (editingHoliday) {
                await holidayService.updateHoliday(editingHoliday._id, formData);
                toast.success('ছুটি আপডেট হয়েছে');
            } else {
                await holidayService.addHoliday(formData);
                toast.success('ছুটি যোগ করা হয়েছে');
            }
            loadHolidays();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'সেভ করতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (holiday) => {
        setFormData({
            date: format(new Date(holiday.date), 'yyyy-MM-dd'),
            name: holiday.name,
            nameBn: holiday.nameBn,
            type: holiday.type,
            isRecurring: holiday.isRecurring
        });
        setEditingHoliday(holiday);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('আপনি কি নিশ্চিত যে এই ছুটি মুছতে চান?')) return;

        try {
            await holidayService.deleteHoliday(id);
            toast.success('ছুটি মুছে ফেলা হয়েছে');
            loadHolidays();
        } catch (error) {
            toast.error(error.response?.data?.message || 'মুছতে সমস্যা হয়েছে');
        }
    };

    const handleSeedHolidays = async () => {
        if (!window.confirm(`${year} সালের ডিফল্ট ছুটিগুলো যোগ করতে চান?`)) return;

        try {
            const response = await holidayService.seedHolidays(year);
            toast.success(response.message);
            loadHolidays();
        } catch (error) {
            toast.error(error.response?.data?.message || 'যোগ করতে সমস্যা হয়েছে');
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'government': return 'সরকারি';
            case 'optional': return 'ঐচ্ছিক';
            case 'religious': return 'ধর্মীয়';
            default: return type;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'government': return 'bg-red-100 text-red-700';
            case 'optional': return 'bg-blue-100 text-blue-700';
            case 'religious': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">ছুটি ম্যানেজমেন্ট</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleSeedHolidays}
                        className="btn btn-outline flex items-center gap-2"
                    >
                        <FiDownload className="w-4 h-4" />
                        ডিফল্ট ছুটি
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <FiPlus className="w-4 h-4" />
                        নতুন ছুটি
                    </button>
                </div>
            </div>

            {/* Year Filter */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <FiCalendar className="text-gray-400" />
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="input max-w-xs"
                    >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FiSun className="text-primary-600" />
                        {editingHoliday ? 'ছুটি এডিট করুন' : 'নতুন ছুটি যোগ করুন'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">তারিখ</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">ধরন</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input"
                                >
                                    <option value="government">সরকারি</option>
                                    <option value="optional">ঐচ্ছিক</option>
                                    <option value="religious">ধর্মীয়</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">ইংরেজি নাম</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Independence Day"
                                />
                            </div>
                            <div>
                                <label className="label">বাংলা নাম</label>
                                <input
                                    type="text"
                                    value={formData.nameBn}
                                    onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                                    className="input"
                                    placeholder="যেমন: স্বাধীনতা দিবস"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isRecurring"
                                checked={formData.isRecurring}
                                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                className="w-4 h-4 text-primary-600 rounded"
                            />
                            <label htmlFor="isRecurring" className="text-sm">প্রতি বছর পুনরাবৃত্তি হবে</label>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary"
                            >
                                {submitting ? 'সেভ হচ্ছে...' : editingHoliday ? 'আপডেট করুন' : 'যোগ করুন'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn btn-outline"
                            >
                                বাতিল
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Holidays List */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">{year} সালের ছুটির তালিকা</h2>

                {holidays.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">কোন ছুটি নেই</p>
                ) : (
                    <div className="space-y-3">
                        {holidays.map(holiday => (
                            <div
                                key={holiday._id}
                                className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-center bg-white p-2 rounded-lg shadow-sm min-w-[60px]">
                                        <p className="text-2xl font-bold text-primary-600">
                                            {format(new Date(holiday.date), 'd')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(holiday.date), 'MMM', { locale: bn })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium">{holiday.nameBn}</p>
                                        <p className="text-sm text-gray-500">{holiday.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(holiday.type)}`}>
                                                {getTypeLabel(holiday.type)}
                                            </span>
                                            {holiday.isRecurring && (
                                                <span className="text-xs text-gray-400">🔄 প্রতি বছর</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(holiday)}
                                        className="p-2 hover:bg-gray-200 rounded-lg text-blue-600"
                                    >
                                        <FiEdit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(holiday._id)}
                                        className="p-2 hover:bg-gray-200 rounded-lg text-red-600"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HolidayManagement;
