import React, { useState, useEffect } from 'react';
import { userService, transactionService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiSearch, FiUser, FiPlus, FiMinus, FiLock, FiList, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';
import FreezeBalanceModal from '../../components/Wallet/FreezeBalanceModal';

const UserBalance = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        balanceType: 'breakfast',
        type: 'deposit',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [showFreezeModal, setShowFreezeModal] = useState(false);

    // Transaction history state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'breakfast', 'lunch', 'dinner'
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await userService.getAllUsers();
            setUsers(response);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedUser || !formData.amount) {
            toast.error('ইউজার এবং পরিমাণ নির্বাচন করুন');
            return;
        }

        setSubmitting(true);
        try {
            await userService.updateBalance(
                selectedUser._id,
                parseFloat(formData.amount),
                formData.balanceType,
                formData.type,
                formData.description
            );
            toast.success('ব্যালেন্স আপডেট হয়েছে');
            loadUsers();
            setFormData({ amount: '', balanceType: 'breakfast', type: 'deposit', description: '' });
            // Refresh selected user data
            const updatedUser = users.find(u => u._id === selectedUser._id);
            if (updatedUser) {
                const refreshedUsers = await userService.getAllUsers();
                setUsers(refreshedUsers);
                setSelectedUser(refreshedUsers.find(u => u._id === selectedUser._id));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'ব্যালেন্স আপডেট ব্যর্থ হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const loadUserTransactions = async (page = 1, balanceType = 'all') => {
        if (!selectedUser) return;

        setHistoryLoading(true);
        try {
            const params = { page, limit: 15 };
            if (balanceType !== 'all') {
                params.balanceType = balanceType;
            }
            const response = await transactionService.getUserTransactions(selectedUser._id, params);
            setTransactions(response.transactions);
            setPagination(response.pagination);
        } catch (error) {
            console.error('Error loading transactions:', error);
            toast.error('লেনদেন লোড করতে ব্যর্থ');
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistoryModal = () => {
        setShowHistoryModal(true);
        setHistoryFilter('all');
        loadUserTransactions(1, 'all');
    };

    const handleFilterChange = (filter) => {
        setHistoryFilter(filter);
        loadUserTransactions(1, filter);
    };

    const handlePageChange = (newPage) => {
        loadUserTransactions(newPage, historyFilter);
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            deposit: 'জমা',
            deduction: 'কাটা',
            adjustment: 'এডজাস্ট',
            refund: 'রিফান্ড',
            reversal: 'রিভার্সাল'
        };
        return labels[type] || type;
    };

    const getBalanceTypeLabel = (type) => {
        const labels = {
            breakfast: 'নাস্তা',
            lunch: 'দুপুর',
            dinner: 'রাত'
        };
        return labels[type] || type;
    };

    const getTransactionColor = (type) => {
        if (type === 'deposit' || type === 'refund') return 'text-green-600 dark:text-green-400';
        if (type === 'deduction') return 'text-red-600 dark:text-red-400';
        return 'text-gray-600 dark:text-gray-400';
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">ব্যালেন্স ম্যানেজ</h1>

            {/* Balance Form */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">ব্যালেন্স যোগ/কর্তন</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Selection */}
                    <div>
                        <label className="label">ইউজার নির্বাচন করুন</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                                className="input pl-10"
                            />
                        </div>

                        {search && (
                            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg dark:border-gray-700">
                                {filteredUsers.map(user => (
                                    <button
                                        key={user._id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setSearch('');
                                        }}
                                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                                    >
                                        <FiUser className="text-gray-400" />
                                        <div>
                                            <p className="font-medium dark:text-gray-100">{user.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedUser && (
                            <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiUser className="text-primary-600 dark:text-primary-400" />
                                    <div>
                                        <p className="font-medium dark:text-gray-100">{selectedUser.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedUser && (
                        <>
                            {/* Current Balance */}
                            <div>
                                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                    <label className="label mb-0">বর্তমান ব্যালেন্স</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={openHistoryModal}
                                            className="btn-secondary text-sm flex items-center gap-2"
                                        >
                                            <FiList className="w-4 h-4" />
                                            লেনদেন দেখুন
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowFreezeModal(true)}
                                            className="btn-secondary text-sm flex items-center gap-2"
                                        >
                                            <FiLock className="w-4 h-4" />
                                            ফ্রিজ/আনফ্রিজ
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">নাস্তা</p>
                                        <p className="font-bold text-blue-600 dark:text-blue-400">৳{selectedUser.balances?.breakfast?.amount || 0}</p>
                                        {selectedUser.balances?.breakfast?.isFrozen && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">🔒 ফ্রিজ</p>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">দুপুর</p>
                                        <p className="font-bold text-green-600 dark:text-green-400">৳{selectedUser.balances?.lunch?.amount || 0}</p>
                                        {selectedUser.balances?.lunch?.isFrozen && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">🔒 ফ্রিজ</p>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">রাত</p>
                                        <p className="font-bold text-purple-600 dark:text-purple-400">৳{selectedUser.balances?.dinner?.amount || 0}</p>
                                        {selectedUser.balances?.dinner?.isFrozen && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">🔒 ফ্রিজ</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Balance Type */}
                            <div>
                                <label className="label">ব্যালেন্স ধরন</label>
                                <select
                                    value={formData.balanceType}
                                    onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                                    className="input"
                                >
                                    <option value="breakfast">নাস্তা</option>
                                    <option value="lunch">দুপুর</option>
                                    <option value="dinner">রাত</option>
                                </select>
                            </div>

                            {/* Transaction Type */}
                            <div>
                                <label className="label">অপারেশন</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'deposit' })}
                                        className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors ${formData.type === 'deposit'
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'border-gray-200 dark:border-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <FiPlus />
                                        জমা
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'deduction' })}
                                        className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors ${formData.type === 'deduction'
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                : 'border-gray-200 dark:border-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <FiMinus />
                                        কাটা
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="label">পরিমাণ (টাকা)</label>
                                <div className="relative">
                                    <BDTIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="input pl-10"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="label">বিবরণ (ঐচ্ছিক)</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    placeholder="বিবরণ লিখুন..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`btn w-full py-3 ${formData.type === 'deposit' ? 'btn-primary' : 'btn-danger'
                                    }`}
                            >
                                {submitting ? 'প্রসেসিং...' : formData.type === 'deposit' ? 'জমা করুন' : 'কাটুন'}
                            </button>
                        </>
                    )}
                </form>
            </div>

            {/* Freeze Balance Modal */}
            {selectedUser && (
                <FreezeBalanceModal
                    isOpen={showFreezeModal}
                    onClose={() => setShowFreezeModal(false)}
                    userId={selectedUser._id}
                    userName={selectedUser.name}
                    currentBalances={selectedUser.balances || {}}
                    onSuccess={() => {
                        loadUsers();
                        setShowFreezeModal(false);
                    }}
                />
            )}

            {/* Transaction History Modal */}
            {showHistoryModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold dark:text-gray-100">লেনদেন হিস্টরি</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.name}</p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <FiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="p-4 border-b dark:border-gray-700">
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'breakfast', 'lunch', 'dinner'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => handleFilterChange(filter)}
                                        className={`px-3 py-1 rounded text-sm transition-colors ${historyFilter === filter
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {filter === 'all' ? 'সব' : getBalanceTypeLabel(filter)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {historyLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                                </div>
                            ) : transactions.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">কোন লেনদেন নেই</p>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map(txn => (
                                        <div key={txn._id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`font-medium ${getTransactionColor(txn.type)}`}>
                                                            {getTransactionTypeLabel(txn.type)}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                                                            {getBalanceTypeLabel(txn.balanceType)}
                                                        </span>
                                                        {txn.isReversed && (
                                                            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded">
                                                                রিভার্সড
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        {txn.description}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {format(new Date(txn.createdAt), 'dd MMM yyyy, hh:mm a', { locale: bn })}
                                                        {txn.performedBy && (
                                                            <span className="ml-2">• by {txn.performedBy.name}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold ${txn.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {txn.amount >= 0 ? '+' : ''}৳{txn.amount.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        ৳{txn.previousBalance?.toFixed(2)} → ৳{txn.newBalance?.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    মোট {pagination.total}টি লেনদেন
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm dark:text-gray-300">
                                        {pagination.page} / {pagination.pages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.pages}
                                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserBalance;
