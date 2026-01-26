import React, { useState, useEffect } from 'react';
import {
    FiShield,
    FiUser,
    FiEdit2,
    FiSave,
    FiX,
    FiCheck,
    FiSearch,
    FiAlertTriangle,
    FiKey
} from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    isActive: boolean;
    permissions?: string[];
    createdAt: string;
}

interface PermissionGroup {
    name: string;
    permissions: { key: string; label: string }[];
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

// Permission groups for UI organization
const permissionGroups: PermissionGroup[] = [
    {
        name: 'মিল ম্যানেজমেন্ট',
        permissions: [
            { key: 'view_own_meals', label: 'নিজের মিল দেখা' },
            { key: 'toggle_own_meals', label: 'নিজের মিল টগল' },
            { key: 'view_all_meals', label: 'সকল মিল দেখা' },
            { key: 'manage_all_meals', label: 'সকল মিল ম্যানেজ' },
            { key: 'view_daily_meals', label: 'দৈনিক মিল দেখা' },
        ]
    },
    {
        name: 'নাস্তা',
        permissions: [
            { key: 'view_breakfast', label: 'নাস্তা দেখা' },
            { key: 'submit_breakfast', label: 'নাস্তা সাবমিট' },
            { key: 'deduct_breakfast', label: 'নাস্তা কর্তন' },
            { key: 'manage_breakfast', label: 'নাস্তা ম্যানেজ' },
        ]
    },
    {
        name: 'ইউজার ম্যানেজমেন্ট',
        permissions: [
            { key: 'view_own_profile', label: 'নিজের প্রোফাইল দেখা' },
            { key: 'update_own_profile', label: 'নিজের প্রোফাইল আপডেট' },
            { key: 'view_all_users', label: 'সকল ইউজার দেখা' },
            { key: 'manage_users', label: 'ইউজার ম্যানেজ' },
            { key: 'update_user_status', label: 'ইউজার স্ট্যাটাস আপডেট' },
            { key: 'delete_users', label: 'ইউজার ডিলিট' },
        ]
    },
    {
        name: 'ব্যালেন্স',
        permissions: [
            { key: 'view_own_balance', label: 'নিজের ব্যালেন্স দেখা' },
            { key: 'view_all_balances', label: 'সকল ব্যালেন্স দেখা' },
            { key: 'update_balances', label: 'ব্যালেন্স আপডেট' },
            { key: 'balance:freeze', label: 'ব্যালেন্স ফ্রিজ' },
        ]
    },
    {
        name: 'লেনদেন',
        permissions: [
            { key: 'view_own_transactions', label: 'নিজের লেনদেন দেখা' },
            { key: 'view_user_transactions', label: 'ইউজার লেনদেন দেখা' },
            { key: 'view_all_transactions', label: 'সকল লেনদেন দেখা' },
        ]
    },
    {
        name: 'মাস সেটিংস ও ছুটি',
        permissions: [
            { key: 'view_month_settings', label: 'মাস সেটিংস দেখা' },
            { key: 'manage_month_settings', label: 'মাস সেটিংস ম্যানেজ' },
            { key: 'finalize_month', label: 'মাস ফাইনালাইজ' },
            { key: 'view_holidays', label: 'ছুটি দেখা' },
            { key: 'manage_holidays', label: 'ছুটি ম্যানেজ' },
        ]
    },
    {
        name: 'রিপোর্ট ও রোল',
        permissions: [
            { key: 'view_own_reports', label: 'নিজের রিপোর্ট দেখা' },
            { key: 'view_all_reports', label: 'সকল রিপোর্ট দেখা' },
            { key: 'view_daily_reports', label: 'দৈনিক রিপোর্ট দেখা' },
            { key: 'view_roles', label: 'রোল দেখা' },
            { key: 'change_user_roles', label: 'ইউজার রোল পরিবর্তন' },
        ]
    },
];

const RoleManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [newRole, setNewRole] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Permission editing state
    const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [userPermissionData, setUserPermissionData] = useState<any>(null);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

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

    const handleEditPermissions = async (user: User) => {
        setEditingPermissions(user._id);
        setLoadingPermissions(true);
        try {
            const response = await api.get(`/users/${user._id}/permissions`);
            setUserPermissionData(response.data);
            setSelectedPermissions(response.data.customPermissions || []);
        } catch (error: any) {
            toast.error('পারমিশন লোড করতে ব্যর্থ');
            setEditingPermissions(null);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleCancelPermissions = () => {
        setEditingPermissions(null);
        setSelectedPermissions([]);
        setUserPermissionData(null);
    };

    const handleSavePermissions = async () => {
        if (!editingPermissions) return;

        setSaving(true);
        try {
            await api.put(`/users/${editingPermissions}/permissions`, {
                permissions: selectedPermissions
            });
            toast.success('পারমিশন আপডেট করা হয়েছে');
            handleCancelPermissions();
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'পারমিশন আপডেট করতে ব্যর্থ');
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = (permission: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
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
                    রোল ও পারমিশন ম্যানেজমেন্ট
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    ইউজারদের রোল এবং কাস্টম পারমিশন ম্যানেজ করুন
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">কাস্টম</th>
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
                                            {user.permissions && user.permissions.length > 0 ? (
                                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                    +{user.permissions.length}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
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
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditRole(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="রোল পরিবর্তন"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPermissions(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="কাস্টম পারমিশন"
                                                    >
                                                        <FiKey className="w-4 h-4" />
                                                    </button>
                                                </div>
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
                            রোল বা পারমিশন পরিবর্তন করলে ইউজারের সিস্টেম অ্যাক্সেস তাৎক্ষণিকভাবে পরিবর্তন হবে।
                            কাস্টম পারমিশন রোল-ভিত্তিক পারমিশনের সাথে যোগ হবে।
                        </p>
                    </div>
                </div>
            </div>

            {/* Permission Edit Modal */}
            {editingPermissions && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                    কাস্টম পারমিশন সেট করুন
                                </h2>
                                {userPermissionData && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {userPermissionData.user.name} ({roleLabels[userPermissionData.user.role as keyof typeof roleLabels]})
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleCancelPermissions}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {loadingPermissions ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    এই ইউজারের রোল অনুযায়ী যে পারমিশনগুলো আছে সেগুলো disabled দেখাবে।
                                    অতিরিক্ত পারমিশন যোগ করতে নিচের গুলো সিলেক্ট করুন।
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {permissionGroups.map((group) => (
                                        <div key={group.name} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                                                {group.name}
                                            </h3>
                                            <div className="space-y-2">
                                                {group.permissions.map((perm) => {
                                                    const hasRolePerm = userPermissionData?.rolePermissions?.includes(perm.key);
                                                    const isSelected = selectedPermissions.includes(perm.key);

                                                    return (
                                                        <label
                                                            key={perm.key}
                                                            className={`flex items-center gap-2 cursor-pointer ${
                                                                hasRolePerm ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={hasRolePerm || isSelected}
                                                                onChange={() => !hasRolePerm && togglePermission(perm.key)}
                                                                disabled={hasRolePerm}
                                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {perm.label}
                                                            </span>
                                                            {hasRolePerm && (
                                                                <span className="text-xs text-gray-400">(রোল)</span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                                    <button
                                        onClick={handleCancelPermissions}
                                        className="btn-secondary"
                                    >
                                        বাতিল
                                    </button>
                                    <button
                                        onClick={handleSavePermissions}
                                        disabled={saving}
                                        className="btn-primary"
                                    >
                                        {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
