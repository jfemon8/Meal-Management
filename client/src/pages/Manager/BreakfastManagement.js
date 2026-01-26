import React, { useState, useEffect } from 'react';
import { breakfastService, userService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiCoffee, FiUsers, FiCheck, FiTrash2, FiEdit2, FiRotateCcw, FiX } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const BreakfastManagement = () => {
    const [breakfasts, setBreakfasts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [costMode, setCostMode] = useState('equal'); // 'equal' or 'individual'
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalCost: '',
        description: '',
        participants: [],
        individualCosts: {} // { [userId]: cost }
    });
    const [submitting, setSubmitting] = useState(false);

    // Edit modal state
    const [editModal, setEditModal] = useState({ open: false, breakfast: null });
    const [editData, setEditData] = useState({
        description: '',
        totalCost: '',
        participants: [],
        individualCosts: {},
        costMode: 'equal'
    });
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Reverse modal state
    const [reverseModal, setReverseModal] = useState({ open: false, breakfast: null });
    const [reverseReason, setReverseReason] = useState('');
    const [reverseSubmitting, setReverseSubmitting] = useState(false);

    // Confirm modal state for deduct/delete
    const [deductConfirm, setDeductConfirm] = useState({ isOpen: false, breakfast: null, isLoading: false });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, breakfast: null, isLoading: false });

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
        setFormData(prev => {
            const isSelected = prev.participants.includes(userId);
            const newParticipants = isSelected
                ? prev.participants.filter(id => id !== userId)
                : [...prev.participants, userId];

            // Also manage individual costs
            const newIndividualCosts = { ...prev.individualCosts };
            if (isSelected) {
                delete newIndividualCosts[userId];
            } else {
                newIndividualCosts[userId] = '';
            }

            return {
                ...prev,
                participants: newParticipants,
                individualCosts: newIndividualCosts
            };
        });
    };

    const handleIndividualCostChange = (userId, cost) => {
        setFormData(prev => ({
            ...prev,
            individualCosts: {
                ...prev.individualCosts,
                [userId]: cost
            }
        }));
    };

    const selectAllParticipants = () => {
        const allUserIds = users.map(u => u._id);
        const allIndividualCosts = {};
        users.forEach(u => {
            allIndividualCosts[u._id] = formData.individualCosts[u._id] || '';
        });
        setFormData(prev => ({
            ...prev,
            participants: allUserIds,
            individualCosts: allIndividualCosts
        }));
    };

    const clearParticipants = () => {
        setFormData(prev => ({
            ...prev,
            participants: [],
            individualCosts: {}
        }));
    };

    const calculateTotalFromIndividual = () => {
        return Object.values(formData.individualCosts)
            .reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.participants.length === 0) {
            toast.error('কমপক্ষে একজন অংশগ্রহণকারী নির্বাচন করুন');
            return;
        }

        if (costMode === 'equal' && !formData.totalCost) {
            toast.error('মোট খরচ প্রদান করুন');
            return;
        }

        if (costMode === 'individual') {
            const hasAnyCost = Object.values(formData.individualCosts).some(c => parseFloat(c) > 0);
            if (!hasAnyCost) {
                toast.error('কমপক্ষে একজনের খরচ প্রদান করুন');
                return;
            }
        }

        setSubmitting(true);
        try {
            if (costMode === 'equal') {
                await breakfastService.submitBreakfast(
                    formData.date,
                    parseFloat(formData.totalCost),
                    formData.participants,
                    formData.description
                );
            } else {
                const participantCosts = formData.participants
                    .filter(userId => parseFloat(formData.individualCosts[userId]) > 0)
                    .map(userId => ({
                        userId,
                        cost: parseFloat(formData.individualCosts[userId])
                    }));
                await breakfastService.submitBreakfastIndividual(
                    formData.date,
                    participantCosts,
                    formData.description
                );
            }

            toast.success('নাস্তার খরচ জমা হয়েছে');
            loadData();
            setShowForm(false);
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'জমা দিতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            date: format(new Date(), 'yyyy-MM-dd'),
            totalCost: '',
            description: '',
            participants: [],
            individualCosts: {}
        });
        setCostMode('equal');
    };

    const openDeductConfirm = (breakfast) => {
        setDeductConfirm({ isOpen: true, breakfast, isLoading: false });
    };

    const handleDeduct = async () => {
        if (!deductConfirm.breakfast) return;
        setDeductConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await breakfastService.deductBreakfast(deductConfirm.breakfast._id);
            toast.success('খরচ সফলভাবে কাটা হয়েছে');
            setDeductConfirm({ isOpen: false, breakfast: null, isLoading: false });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'খরচ কাটতে সমস্যা হয়েছে');
            setDeductConfirm(prev => ({ ...prev, isLoading: false }));
        }
    };

    const openDeleteConfirm = (breakfast) => {
        setDeleteConfirm({ isOpen: true, breakfast, isLoading: false });
    };

    const handleDelete = async () => {
        if (!deleteConfirm.breakfast) return;
        setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
        try {
            await breakfastService.deleteBreakfast(deleteConfirm.breakfast._id);
            toast.success('রেকর্ড মুছে ফেলা হয়েছে');
            setDeleteConfirm({ isOpen: false, breakfast: null, isLoading: false });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'মুছতে সমস্যা হয়েছে');
            setDeleteConfirm(prev => ({ ...prev, isLoading: false }));
        }
    };

    // Edit functionality
    const openEditModal = (breakfast) => {
        const hasVariedCosts = breakfast.participants.some((p, i, arr) =>
            i > 0 && Math.abs(p.cost - arr[0].cost) > 0.01
        );

        const individualCosts = {};
        const participants = [];
        breakfast.participants.forEach(p => {
            const userId = p.user?._id || p.user;
            participants.push(userId);
            individualCosts[userId] = p.cost.toString();
        });

        setEditData({
            description: breakfast.description || '',
            totalCost: breakfast.totalCost.toString(),
            participants,
            individualCosts,
            costMode: hasVariedCosts ? 'individual' : 'equal'
        });
        setEditModal({ open: true, breakfast });
    };

    const handleEditParticipantToggle = (userId) => {
        setEditData(prev => {
            const isSelected = prev.participants.includes(userId);
            const newParticipants = isSelected
                ? prev.participants.filter(id => id !== userId)
                : [...prev.participants, userId];

            const newIndividualCosts = { ...prev.individualCosts };
            if (isSelected) {
                delete newIndividualCosts[userId];
            } else {
                newIndividualCosts[userId] = '';
            }

            return {
                ...prev,
                participants: newParticipants,
                individualCosts: newIndividualCosts
            };
        });
    };

    const handleEditIndividualCostChange = (userId, cost) => {
        setEditData(prev => ({
            ...prev,
            individualCosts: {
                ...prev.individualCosts,
                [userId]: cost
            }
        }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if (editData.participants.length === 0) {
            toast.error('কমপক্ষে একজন অংশগ্রহণকারী নির্বাচন করুন');
            return;
        }

        setEditSubmitting(true);
        try {
            if (editData.costMode === 'equal') {
                await breakfastService.updateBreakfast(editModal.breakfast._id, {
                    totalCost: parseFloat(editData.totalCost),
                    participants: editData.participants,
                    description: editData.description
                });
            } else {
                const participantCosts = editData.participants
                    .filter(userId => parseFloat(editData.individualCosts[userId]) > 0)
                    .map(userId => ({
                        userId,
                        cost: parseFloat(editData.individualCosts[userId])
                    }));
                await breakfastService.updateBreakfastIndividual(
                    editModal.breakfast._id,
                    participantCosts,
                    editData.description
                );
            }

            toast.success('রেকর্ড আপডেট হয়েছে');
            setEditModal({ open: false, breakfast: null });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'আপডেট করতে সমস্যা হয়েছে');
        } finally {
            setEditSubmitting(false);
        }
    };

    // Reverse functionality
    const openReverseModal = (breakfast) => {
        setReverseReason('');
        setReverseModal({ open: true, breakfast });
    };

    const handleReverse = async () => {
        if (!reverseReason.trim()) {
            toast.error('রিভার্সের কারণ লিখুন');
            return;
        }

        setReverseSubmitting(true);
        try {
            await breakfastService.reverseBreakfast(reverseModal.breakfast._id, reverseReason);
            toast.success('নাস্তার খরচ রিভার্স (রিফান্ড) হয়েছে');
            setReverseModal({ open: false, breakfast: null });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'রিভার্স করতে সমস্যা হয়েছে');
        } finally {
            setReverseSubmitting(false);
        }
    };

    // Check if breakfast has varied costs (individual costs were used)
    const hasVariedCosts = (breakfast) => {
        if (breakfast.participants.length <= 1) return false;
        return breakfast.participants.some((p, i, arr) =>
            i > 0 && Math.abs(p.cost - arr[0].cost) > 0.01
        );
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
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">নাস্তা ম্যানেজমেন্ট</h1>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        if (!showForm) resetForm();
                    }}
                    className="btn btn-primary"
                >
                    {showForm ? 'বাতিল' : 'নতুন খরচ যোগ'}
                </button>
            </div>

            {/* Add Breakfast Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
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
                                <label className="label">বিবরণ (ঐচ্ছিক)</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    placeholder="যেমন: রুটি, ডিম, চা ইত্যাদি"
                                />
                            </div>
                        </div>

                        {/* Cost Mode Toggle */}
                        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">খরচের ধরণ:</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCostMode('equal')}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${costMode === 'equal'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    সমান ভাগ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCostMode('individual')}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${costMode === 'individual'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    ভিন্ন ভিন্ন খরচ
                                </button>
                            </div>
                        </div>

                        {/* Equal Split Mode - Total Cost Input */}
                        {costMode === 'equal' && (
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
                        )}

                        {/* Participants Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="label mb-0">অংশগ্রহণকারী ({formData.participants.length} জন)</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllParticipants}
                                        className="text-sm text-primary-600 hover:underline"
                                    >
                                        সবাই নির্বাচন
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearParticipants}
                                        className="text-sm text-red-600 hover:underline"
                                    >
                                        বাতিল
                                    </button>
                                </div>
                            </div>

                            {costMode === 'equal' ? (
                                // Equal split: Simple checkbox selection
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                    {users.map(user => (
                                        <button
                                            key={user._id}
                                            type="button"
                                            onClick={() => handleParticipantToggle(user._id)}
                                            className={`p-2 rounded text-sm text-left transition-colors ${formData.participants.includes(user._id)
                                                ? 'bg-primary-100 text-primary-700 border-primary-300 border dark:bg-primary-900 dark:text-primary-200'
                                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {user.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // Individual costs: Show cost input per user
                                <div className="space-y-2 max-h-64 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                    {users.map(user => (
                                        <div
                                            key={user._id}
                                            className={`flex items-center gap-3 p-2 rounded transition-colors ${formData.participants.includes(user._id)
                                                ? 'bg-primary-50 dark:bg-primary-900/30'
                                                : 'bg-gray-50 dark:bg-gray-800'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.participants.includes(user._id)}
                                                onChange={() => handleParticipantToggle(user._id)}
                                                className="w-4 h-4 text-primary-600 rounded"
                                            />
                                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                                            {formData.participants.includes(user._id) && (
                                                <div className="relative w-24">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                    <input
                                                        type="number"
                                                        value={formData.individualCosts[user._id] || ''}
                                                        onChange={(e) => handleIndividualCostChange(user._id, e.target.value)}
                                                        className="input text-sm py-1 pl-6 pr-2"
                                                        placeholder="0"
                                                        min="0"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cost Summary */}
                        {formData.participants.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                {costMode === 'equal' && formData.totalCost && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        জনপ্রতি খরচ: <span className="font-bold">
                                            ৳{(parseFloat(formData.totalCost) / formData.participants.length).toFixed(2)}
                                        </span>
                                    </p>
                                )}
                                {costMode === 'individual' && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        মোট খরচ: <span className="font-bold">৳{calculateTotalFromIndividual().toFixed(2)}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({formData.participants.filter(id => parseFloat(formData.individualCosts[id]) > 0).length} জন)
                                        </span>
                                    </p>
                                )}
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
                <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">এই মাসের নাস্তার রেকর্ড</h2>

                {breakfasts.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">কোন রেকর্ড নেই</p>
                ) : (
                    <div className="space-y-4">
                        {breakfasts.map(breakfast => (
                            <div key={breakfast._id} className={`p-4 rounded-lg ${breakfast.isReversed
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                : 'bg-gray-50 dark:bg-gray-800'
                                }`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                                            {format(new Date(breakfast.date), 'dd MMMM yyyy', { locale: bn })}
                                            {hasVariedCosts(breakfast) && (
                                                <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                                    ভিন্ন ভিন্ন খরচ
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{breakfast.description || 'বিবরণ নেই'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                            <FiUsers className="w-3 h-3" />
                                            {breakfast.participants.length} জন
                                        </p>
                                        {/* Show individual costs if varied */}
                                        {hasVariedCosts(breakfast) && (
                                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {breakfast.participants.slice(0, 3).map(p => (
                                                    <span key={p.user?._id || p.user} className="mr-2">
                                                        {p.user?.name || 'User'}: ৳{p.cost}
                                                    </span>
                                                ))}
                                                {breakfast.participants.length > 3 && <span>...</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-primary-600 dark:text-primary-400">৳{breakfast.totalCost}</p>
                                        {!hasVariedCosts(breakfast) && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                জনপ্রতি: ৳{(breakfast.totalCost / breakfast.participants.length).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {/* Not finalized actions */}
                                        {!breakfast.isFinalized && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(breakfast)}
                                                    className="btn btn-secondary text-sm flex items-center gap-1"
                                                    title="এডিট"
                                                >
                                                    <FiEdit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openDeductConfirm(breakfast)}
                                                    className="btn btn-primary text-sm flex items-center gap-1"
                                                >
                                                    <FiCheck className="w-4 h-4" />
                                                    খরচ কাটুন
                                                </button>
                                                <button
                                                    onClick={() => openDeleteConfirm(breakfast)}
                                                    className="btn btn-danger text-sm flex items-center gap-1"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {/* Finalized but not reversed */}
                                        {breakfast.isFinalized && !breakfast.isReversed && (
                                            <>
                                                <span className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm">
                                                    কাটা হয়েছে ✓
                                                </span>
                                                <button
                                                    onClick={() => openReverseModal(breakfast)}
                                                    className="btn btn-warning text-sm flex items-center gap-1"
                                                    title="রিভার্স (রিফান্ড)"
                                                >
                                                    <FiRotateCcw className="w-4 h-4" />
                                                    রিভার্স
                                                </button>
                                            </>
                                        )}
                                        {/* Reversed */}
                                        {breakfast.isReversed && (
                                            <div className="text-sm">
                                                <span className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
                                                    রিভার্স হয়েছে
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    কারণ: {breakfast.reverseReason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold dark:text-gray-100">নাস্তার রেকর্ড এডিট</h3>
                            <button
                                onClick={() => setEditModal({ open: false, breakfast: null })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <FiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="label">বিবরণ</label>
                                <input
                                    type="text"
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    className="input"
                                    placeholder="বিবরণ"
                                />
                            </div>

                            {/* Cost Mode Toggle */}
                            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">খরচের ধরণ:</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditData({ ...editData, costMode: 'equal' })}
                                        className={`px-3 py-1 rounded text-sm transition-colors ${editData.costMode === 'equal'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        সমান ভাগ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditData({ ...editData, costMode: 'individual' })}
                                        className={`px-3 py-1 rounded text-sm transition-colors ${editData.costMode === 'individual'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        ভিন্ন ভিন্ন খরচ
                                    </button>
                                </div>
                            </div>

                            {editData.costMode === 'equal' && (
                                <div>
                                    <label className="label">মোট খরচ (টাকা)</label>
                                    <input
                                        type="number"
                                        value={editData.totalCost}
                                        onChange={(e) => setEditData({ ...editData, totalCost: e.target.value })}
                                        className="input"
                                        min="0"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="label">অংশগ্রহণকারী</label>
                                {editData.costMode === 'equal' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                        {users.map(user => (
                                            <button
                                                key={user._id}
                                                type="button"
                                                onClick={() => handleEditParticipantToggle(user._id)}
                                                className={`p-2 rounded text-sm text-left transition-colors ${editData.participants.includes(user._id)
                                                    ? 'bg-primary-100 text-primary-700 border-primary-300 border dark:bg-primary-900 dark:text-primary-200'
                                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-transparent text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {user.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                                        {users.map(user => (
                                            <div
                                                key={user._id}
                                                className={`flex items-center gap-3 p-2 rounded ${editData.participants.includes(user._id)
                                                    ? 'bg-primary-50 dark:bg-primary-900/30'
                                                    : 'bg-gray-50 dark:bg-gray-700'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editData.participants.includes(user._id)}
                                                    onChange={() => handleEditParticipantToggle(user._id)}
                                                    className="w-4 h-4 text-primary-600 rounded"
                                                />
                                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                                                {editData.participants.includes(user._id) && (
                                                    <input
                                                        type="number"
                                                        value={editData.individualCosts[user._id] || ''}
                                                        onChange={(e) => handleEditIndividualCostChange(user._id, e.target.value)}
                                                        className="input w-24 text-sm py-1"
                                                        placeholder="৳"
                                                        min="0"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditModal({ open: false, breakfast: null })}
                                    className="btn btn-secondary flex-1"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="btn btn-primary flex-1"
                                >
                                    {editSubmitting ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deduct Confirm Modal */}
            <ConfirmModal
                isOpen={deductConfirm.isOpen}
                onClose={() => setDeductConfirm({ isOpen: false, breakfast: null, isLoading: false })}
                onConfirm={handleDeduct}
                title="নাস্তার খরচ কাটুন"
                message={
                    <div className="space-y-2">
                        <p>আপনি কি নিশ্চিত যে এই নাস্তার খরচ কাটতে চান?</p>
                        {deductConfirm.breakfast && (
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                                <p><strong>তারিখ:</strong> {format(new Date(deductConfirm.breakfast.date), 'dd MMMM yyyy', { locale: bn })}</p>
                                <p><strong>মোট খরচ:</strong> ৳{deductConfirm.breakfast.totalCost}</p>
                                <p><strong>অংশগ্রহণকারী:</strong> {deductConfirm.breakfast.participants?.length} জন</p>
                            </div>
                        )}
                        <p className="text-amber-600 dark:text-amber-400 text-sm">
                            এই অপারেশন সকল অংশগ্রহণকারীর ব্যালেন্স থেকে টাকা কাটবে।
                        </p>
                    </div>
                }
                confirmText="খরচ কাটুন"
                cancelText="বাতিল"
                variant="warning"
                isLoading={deductConfirm.isLoading}
            />

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, breakfast: null, isLoading: false })}
                onConfirm={handleDelete}
                title="রেকর্ড মুছুন"
                message={
                    <div className="space-y-2">
                        <p>আপনি কি নিশ্চিত যে এই নাস্তার রেকর্ড মুছতে চান?</p>
                        {deleteConfirm.breakfast && (
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                                <p><strong>তারিখ:</strong> {format(new Date(deleteConfirm.breakfast.date), 'dd MMMM yyyy', { locale: bn })}</p>
                                <p><strong>মোট খরচ:</strong> ৳{deleteConfirm.breakfast.totalCost}</p>
                            </div>
                        )}
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                            এই অপারেশন পূর্বাবস্থায় ফেরানো যাবে না!
                        </p>
                    </div>
                }
                confirmText="মুছুন"
                cancelText="বাতিল"
                variant="danger"
                isLoading={deleteConfirm.isLoading}
            />

            {/* Reverse Modal */}
            {reverseModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold dark:text-gray-100">নাস্তার খরচ রিভার্স</h3>
                            <button
                                onClick={() => setReverseModal({ open: false, breakfast: null })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <FiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium">সতর্কতা!</p>
                                <p>এই অপারেশন সকল অংশগ্রহণকারীর ব্যালেন্সে টাকা ফেরত দেবে।</p>
                                <p className="mt-2">
                                    মোট রিফান্ড: <span className="font-bold">৳{reverseModal.breakfast?.totalCost}</span>
                                    <span className="text-xs ml-1">({reverseModal.breakfast?.participants.length} জন)</span>
                                </p>
                            </div>

                            <div>
                                <label className="label">রিভার্সের কারণ <span className="text-red-500">*</span></label>
                                <textarea
                                    value={reverseReason}
                                    onChange={(e) => setReverseReason(e.target.value)}
                                    className="input min-h-[80px]"
                                    placeholder="কেন রিভার্স করছেন তা লিখুন..."
                                    required
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReverseModal({ open: false, breakfast: null })}
                                    className="btn btn-secondary flex-1"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReverse}
                                    disabled={reverseSubmitting || !reverseReason.trim()}
                                    className="btn btn-warning flex-1"
                                >
                                    {reverseSubmitting ? 'রিভার্স হচ্ছে...' : 'রিভার্স করুন'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreakfastManagement;
