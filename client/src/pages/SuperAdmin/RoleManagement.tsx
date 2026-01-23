import React, { useState, useEffect } from 'react';
import {
    FiShield,
    FiUser,
    FiEdit2,
    FiSave,
    FiX,
    FiCheck,
    FiSearch,
    FiFilter,
    FiAlertTriangle
} from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    isActive: boolean;
    createdAt: string;
}

const roleColors: Record<string, string> = {
    user: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const roleLabels: Record<string, string> = {
    user: 'ইউজার',
    manager: 'ম্যানেজার',
    admin: 'এডমিন',
    superadmin: 'সুপার এডমিন',
};

const rolePermissions: Record<string, string[]> = {
    user: [
        'নিজের মিল টগল করা',
        'নিজের ব্যালেন্স দেখা',
        'নিজের লেনদেন দেখা',
        'নিজের রিপোর্ট দেখা'
    ],
    manager: [
        'সকল ইউজারের মিল দেখা ও এডিট',
        'নাস্তা ম্যানেজমেন্ট',
        'ব্যালেন্স জমা ও কর্তন',
        'মাসের সেটিংস পরিবর্তন',
        'সব রিপোর্ট দেখা'
    ],
    admin: [
        'ইউজার তৈরি ও এডিট',
        'ছুটি ম্যানেজমেন্ট',
        'অডিট লগ দেখা',
        'ইউজার রোল পরিবর্তন (manager পর্যন্ত)'
    ],
    superadmin: [
        'সিস্টেম সেটিংস',
        'যেকোনো রোল পরিবর্তন',
        'ডেটাবেস মেইনটেন্যান্স',
        'সম্পূর্ণ সিস্টেম অ্যাক্সেস'
    ]
};

const RoleManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [newRole, setNewRole] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error: any) {
            toast.error('ইউজার লোড করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditRole = (user: User) => {
        setEditingUser(user._id);
        setNewRole(user.role);
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setNewRole('');
    };

    const handleSaveRole = async (userId: string) => {
        if (!newRole) return;

        setSaving(true);
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            toast.success('রোল আপডেট করা হয়েছে');
            fetchUsers();
            handleCancelEdit();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'রোল আপডেট করতে ব্যর্থ');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getRoleCounts = () => {
        const counts: Record<string, number> = { user: 0, manager: 0, admin: 0, superadmin: 0 };
        users.forEach(u => counts[u.role]++);
        return counts;
    };

    const roleCounts = getRoleCounts();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FiShield className="text-primary-600" />
                    রোল ম্যানেজমেন্ট
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    ইউজারদের রোল এবং পারমিশন ম্যানেজ করুন
                </p>
            </div>

            {/* Role Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(roleLabels).map(([role, label]) => (
                    <div
                        key={role}
                        className={`card cursor-pointer transition-transform hover:scale-105 ${filterRole === role ? 'ring-2 ring-primary-500' : ''}`}
                        onClick={() => setFilterRole(filterRole === role ? '' : role)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{roleCounts[role]}</p>
                            </div>
                            <div className={`p-2 rounded-full ${roleColors[role]}`}>
                                <FiUser className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Permissions Reference */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    রোল পারমিশন রেফারেন্স
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(rolePermissions).map(([role, permissions]) => (
                        <div key={role} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${roleColors[role]}`}>
                                {roleLabels[role]}
                            </div>
                            <ul className="space-y-2">
                                {permissions.map((perm, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FiCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        {perm}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search and Filter */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="নাম বা ইমেইল দিয়ে সার্চ করুন..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="">সব রোল</option>
                        {Object.entries(roleLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse flex items-center gap-4 p-4 border-b dark:border-gray-700">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                    <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <FiUser className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">কোনো ইউজার পাওয়া যায়নি</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ইউজার</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ইমেইল</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">স্ট্যাটাস</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">রোল</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                                    <span className="text-primary-700 dark:text-primary-400 font-medium">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${user.isActive
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingUser === user._id ? (
                                                <select
                                                    value={newRole}
                                                    onChange={(e) => setNewRole(e.target.value)}
                                                    className="input text-sm py-1"
                                                    autoFocus
                                                >
                                                    {Object.entries(roleLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs rounded-full ${roleColors[user.role]}`}>
                                                    {roleLabels[user.role]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingUser === user._id ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleSaveRole(user._id)}
                                                        disabled={saving || newRole === user.role}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                                    >
                                                        <FiSave className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditRole(user)}
                                                    className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <FiEdit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r">
                <div className="flex items-start gap-3">
                    <FiAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300">সতর্কতা</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            রোল পরিবর্তন করলে ইউজারের সিস্টেম অ্যাক্সেস তাৎক্ষণিকভাবে পরিবর্তন হবে।
                            সুপার এডমিন রোল শুধুমাত্র বিশ্বস্ত ইউজারদের দিন।
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;
