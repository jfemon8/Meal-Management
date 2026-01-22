import React, { useState, useEffect } from 'react';
import { userService } from '../../services/mealService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSearch, FiUser, FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiShield } from 'react-icons/fi';

const ManageUsers = () => {
    const { user: currentUser, isSuperAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [roleChange, setRoleChange] = useState('');

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

    const handleRoleChange = async (userId) => {
        if (!roleChange) return;

        try {
            await userService.updateUserRole(userId, roleChange);
            toast.success('রোল পরিবর্তন হয়েছে');
            loadUsers();
            setEditingUser(null);
            setRoleChange('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'রোল পরিবর্তন ব্যর্থ হয়েছে');
        }
    };

    const handleStatusToggle = async (userId, currentStatus) => {
        try {
            await userService.updateUserStatus(userId, !currentStatus);
            toast.success(currentStatus ? 'ইউজার নিষ্ক্রিয় করা হয়েছে' : 'ইউজার সক্রিয় করা হয়েছে');
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('আপনি কি নিশ্চিত যে এই ইউজার ডিলিট করতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।')) return;

        try {
            await userService.deleteUser(userId);
            toast.success('ইউজার ডিলিট হয়েছে');
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'ডিলিট করতে সমস্যা হয়েছে');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    const getRoleLabel = (role) => {
        switch (role) {
            case 'superadmin': return 'সুপার এডমিন';
            case 'admin': return 'এডমিন';
            case 'manager': return 'ম্যানেজার';
            default: return 'ইউজার';
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'superadmin': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-red-100 text-red-700';
            case 'manager': return 'bg-blue-100 text-blue-700';
            default: return 'bg-green-100 text-green-700';
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
            <h1 className="text-2xl font-bold text-gray-800">ইউজার ম্যানেজ</h1>

            {/* Search */}
            <div className="card">
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
            </div>

            {/* Users List */}
            <div className="space-y-4">
                {filteredUsers.map(user => (
                    <div key={user._id} className="card">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.isActive ? 'bg-primary-100' : 'bg-gray-200'
                                    }`}>
                                    <FiUser className={`w-6 h-6 ${user.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2">
                                        {user.name}
                                        {!user.isActive && (
                                            <span className="text-xs text-red-500">(নিষ্ক্রিয়)</span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getRoleColor(user.role)}`}>
                                        {getRoleLabel(user.role)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {user._id !== currentUser._id && user.role !== 'superadmin' && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Role Change */}
                                    {editingUser === user._id ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={roleChange}
                                                onChange={(e) => setRoleChange(e.target.value)}
                                                className="input py-1 text-sm"
                                            >
                                                <option value="">রোল নির্বাচন</option>
                                                <option value="user">ইউজার</option>
                                                <option value="manager">ম্যানেজার</option>
                                                {isSuperAdmin && <option value="admin">এডমিন</option>}
                                            </select>
                                            <button
                                                onClick={() => handleRoleChange(user._id)}
                                                className="btn btn-primary text-sm py-1"
                                            >
                                                সেভ
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingUser(null);
                                                    setRoleChange('');
                                                }}
                                                className="btn btn-outline text-sm py-1"
                                            >
                                                বাতিল
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user._id);
                                                    setRoleChange(user.role);
                                                }}
                                                className="btn btn-outline text-sm py-1 flex items-center gap-1"
                                            >
                                                <FiShield className="w-4 h-4" />
                                                রোল পরিবর্তন
                                            </button>

                                            <button
                                                onClick={() => handleStatusToggle(user._id, user.isActive)}
                                                className={`btn text-sm py-1 flex items-center gap-1 ${user.isActive ? 'btn-danger' : 'btn-primary'
                                                    }`}
                                            >
                                                {user.isActive ? (
                                                    <>
                                                        <FiUserX className="w-4 h-4" />
                                                        নিষ্ক্রিয়
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiUserCheck className="w-4 h-4" />
                                                        সক্রিয়
                                                    </>
                                                )}
                                            </button>

                                            {isSuperAdmin && (
                                                <button
                                                    onClick={() => handleDelete(user._id)}
                                                    className="btn btn-danger text-sm py-1 flex items-center gap-1"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                    ডিলিট
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {user._id === currentUser._id && (
                                <span className="text-sm text-gray-400">আপনি</span>
                            )}

                            {user.role === 'superadmin' && user._id !== currentUser._id && (
                                <span className="text-sm text-gray-400">পরিবর্তন অনুমোদিত নয়</span>
                            )}
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <p className="text-center text-gray-500 py-8">কোন ইউজার পাওয়া যায়নি</p>
                )}
            </div>
        </div>
    );
};

export default ManageUsers;
