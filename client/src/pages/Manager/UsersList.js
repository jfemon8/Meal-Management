import React, { useState, useEffect } from 'react';
import { userService } from '../../services/mealService';
import { FiSearch, FiUser, FiMail } from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';

const UsersList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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
            <h1 className="text-2xl font-bold text-gray-800">সকল ইউজার</h1>

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
            <div className="grid gap-4">
                {filteredUsers.map(user => (
                    <div key={user._id} className="card">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                    <FiUser className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{user.name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <FiMail className="w-3 h-3" />
                                        {user.email}
                                    </p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getRoleColor(user.role)}`}>
                                        {getRoleLabel(user.role)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">নাস্তা</p>
                                    <p className="font-bold text-blue-600">৳{user.balances?.breakfast?.amount ?? user.balances?.breakfast ?? 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">দুপুর</p>
                                    <p className="font-bold text-green-600">৳{user.balances?.lunch?.amount ?? user.balances?.lunch ?? 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">রাত</p>
                                    <p className="font-bold text-purple-600">৳{user.balances?.dinner?.amount ?? user.balances?.dinner ?? 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">স্ট্যাটাস</p>
                                    <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                    </span>
                                </div>
                            </div>
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

export default UsersList;
