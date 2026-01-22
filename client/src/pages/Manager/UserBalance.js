import React, { useState, useEffect } from 'react';
import { userService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { FiSearch, FiUser, FiDollarSign, FiPlus, FiMinus } from 'react-icons/fi';

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
            setSelectedUser(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'ব্যালেন্স আপডেট ব্যর্থ হয়েছে');
        } finally {
            setSubmitting(false);
        }
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
            <h1 className="text-2xl font-bold text-gray-800">ব্যালেন্স ম্যানেজ</h1>

            {/* Balance Form */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">ব্যালেন্স যোগ/কর্তন</h2>

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
                            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                                {filteredUsers.map(user => (
                                    <button
                                        key={user._id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setSearch('');
                                        }}
                                        className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                                    >
                                        <FiUser className="text-gray-400" />
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedUser && (
                            <div className="mt-2 p-3 bg-primary-50 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiUser className="text-primary-600" />
                                    <div>
                                        <p className="font-medium">{selectedUser.name}</p>
                                        <p className="text-sm text-gray-500">{selectedUser.email}</p>
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
                            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">নাস্তা</p>
                                    <p className="font-bold text-blue-600">৳{selectedUser.balances?.breakfast || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">দুপুর</p>
                                    <p className="font-bold text-green-600">৳{selectedUser.balances?.lunch || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">রাত</p>
                                    <p className="font-bold text-purple-600">৳{selectedUser.balances?.dinner || 0}</p>
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
                                        className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 ${formData.type === 'deposit'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200'
                                            }`}
                                    >
                                        <FiPlus />
                                        জমা
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'deduction' })}
                                        className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 ${formData.type === 'deduction'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-200'
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
                                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
        </div>
    );
};

export default UserBalance;
