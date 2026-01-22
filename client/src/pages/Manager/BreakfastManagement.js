import React, { useState, useEffect } from 'react';
import { breakfastService, userService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiCoffee, FiUsers, FiCheck, FiTrash2 } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';

const BreakfastManagement = () => {
    const [breakfasts, setBreakfasts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalCost: '',
        description: '',
        participants: []
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const today = new Date();
            const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(today), 'yyyy-MM-dd');

            const [breakfastsRes, usersRes] = await Promise.all([
                breakfastService.getBreakfasts(startDate, endDate),
                userService.getAllUsers()
            ]);

            setBreakfasts(breakfastsRes);
            setUsers(usersRes.filter(u => u.isActive));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantToggle = (userId) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.includes(userId)
                ? prev.participants.filter(id => id !== userId)
                : [...prev.participants, userId]
        }));
    };

    const selectAllParticipants = () => {
        setFormData(prev => ({
            ...prev,
            participants: users.map(u => u._id)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.totalCost || formData.participants.length === 0) {
            toast.error('মোট খরচ এবং কমপক্ষে একজন অংশগ্রহণকারী নির্বাচন করুন');
            return;
        }

        setSubmitting(true);
        try {
            await breakfastService.submitBreakfast(
                formData.date,
                parseFloat(formData.totalCost),
                formData.participants,
                formData.description
            );
            toast.success('নাস্তার খরচ জমা হয়েছে');
            loadData();
            setShowForm(false);
            setFormData({
                date: format(new Date(), 'yyyy-MM-dd'),
                totalCost: '',
                description: '',
                participants: []
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'জমা দিতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeduct = async (id) => {
        if (!window.confirm('আপনি কি নিশ্চিত যে এই নাস্তার খরচ কাটতে চান?')) return;

        try {
            await breakfastService.deductBreakfast(id);
            toast.success('খরচ সফলভাবে কাটা হয়েছে');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'খরচ কাটতে সমস্যা হয়েছে');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('আপনি কি নিশ্চিত যে এই রেকর্ড মুছতে চান?')) return;

        try {
            await breakfastService.deleteBreakfast(id);
            toast.success('রেকর্ড মুছে ফেলা হয়েছে');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'মুছতে সমস্যা হয়েছে');
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
                <h1 className="text-2xl font-bold text-gray-800">নাস্তা ম্যানেজমেন্ট</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    {showForm ? 'বাতিল' : 'নতুন খরচ যোগ'}
                </button>
            </div>

            {/* Add Breakfast Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FiCoffee className="text-primary-600" />
                        নাস্তার খরচ যোগ করুন
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
                                <label className="label">মোট খরচ (টাকা)</label>
                                <div className="relative">
                                    <BDTIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        value={formData.totalCost}
                                        onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                                        className="input pl-10"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="label">বিবরণ (ঐচ্ছিক)</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input"
                                placeholder="যেমন: রুটি, ডিম, চা ইত্যাদি"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="label mb-0">অংশগ্রহণকারী ({formData.participants.length} জন)</label>
                                <button
                                    type="button"
                                    onClick={selectAllParticipants}
                                    className="text-sm text-primary-600 hover:underline"
                                >
                                    সবাই নির্বাচন
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                                {users.map(user => (
                                    <button
                                        key={user._id}
                                        type="button"
                                        onClick={() => handleParticipantToggle(user._id)}
                                        className={`p-2 rounded text-sm text-left transition-colors ${formData.participants.includes(user._id)
                                                ? 'bg-primary-100 text-primary-700 border-primary-300 border'
                                                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                            }`}
                                    >
                                        {user.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.totalCost && formData.participants.length > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm">
                                    জনপ্রতি খরচ: <span className="font-bold">
                                        ৳{(parseFloat(formData.totalCost) / formData.participants.length).toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary w-full"
                        >
                            {submitting ? 'জমা হচ্ছে...' : 'জমা দিন'}
                        </button>
                    </form>
                </div>
            )}

            {/* Breakfast List */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">এই মাসের নাস্তার রেকর্ড</h2>

                {breakfasts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">কোন রেকর্ড নেই</p>
                ) : (
                    <div className="space-y-4">
                        {breakfasts.map(breakfast => (
                            <div key={breakfast._id} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold">
                                            {format(new Date(breakfast.date), 'dd MMMM yyyy', { locale: bn })}
                                        </p>
                                        <p className="text-sm text-gray-500">{breakfast.description || 'বিবরণ নেই'}</p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <FiUsers className="w-3 h-3" />
                                            {breakfast.participants.length} জন
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-primary-600">৳{breakfast.totalCost}</p>
                                        <p className="text-sm text-gray-500">
                                            জনপ্রতি: ৳{(breakfast.totalCost / breakfast.participants.length).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {!breakfast.isFinalized && (
                                            <>
                                                <button
                                                    onClick={() => handleDeduct(breakfast._id)}
                                                    className="btn btn-primary text-sm flex items-center gap-1"
                                                >
                                                    <FiCheck className="w-4 h-4" />
                                                    খরচ কাটুন
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(breakfast._id)}
                                                    className="btn btn-danger text-sm flex items-center gap-1"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {breakfast.isFinalized && (
                                            <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                                                কাটা হয়েছে ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BreakfastManagement;
