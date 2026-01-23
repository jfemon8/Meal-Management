import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiSave, FiLock } from 'react-icons/fi';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.put(`/users/${user._id}`, formData);
            updateUser(response.data);
            toast.success('প্রোফাইল আপডেট হয়েছে');
        } catch (error) {
            toast.error(error.response?.data?.message || 'আপডেট ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('নতুন পাসওয়ার্ড মিলছে না');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }

        setPasswordLoading(true);

        try {
            await api.put('/auth/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">প্রোফাইল</h1>

            {/* Profile Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiUser className="text-primary-600" />
                    ব্যক্তিগত তথ্য
                </h2>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="label">নাম</label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ইমেইল</label>
                        <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">ফোন</label>
                        <div className="relative">
                            <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <FiSave />
                        {loading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                    </button>
                </form>
            </div>

            {/* Balance Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">ব্যালেন্স</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">৳{user?.balances?.breakfast?.amount ?? user?.balances?.breakfast ?? 0}</p>
                        <p className="text-sm text-gray-500">নাস্তা</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">৳{user?.balances?.lunch?.amount ?? user?.balances?.lunch ?? 0}</p>
                        <p className="text-sm text-gray-500">দুপুর</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">৳{user?.balances?.dinner?.amount ?? user?.balances?.dinner ?? 0}</p>
                        <p className="text-sm text-gray-500">রাত</p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiLock className="text-primary-600" />
                    পাসওয়ার্ড পরিবর্তন
                </h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="label">বর্তমান পাসওয়ার্ড</label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">নতুন পাসওয়ার্ড</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <FiLock />
                        {passwordLoading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                    </button>
                </form>
            </div>

            {/* Role Info */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">রোল তথ্য</h2>
                <p className="text-gray-600">
                    আপনার রোল:{' '}
                    <span className={`font-medium ${user?.role === 'superadmin' ? 'text-purple-600' :
                            user?.role === 'admin' ? 'text-red-600' :
                                user?.role === 'manager' ? 'text-blue-600' :
                                    'text-green-600'
                        }`}>
                        {user?.role === 'superadmin' ? 'সুপার এডমিন' :
                            user?.role === 'admin' ? 'এডমিন' :
                                user?.role === 'manager' ? 'ম্যানেজার' : 'ইউজার'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Profile;
