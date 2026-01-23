import React, { useState } from 'react';
import TwoFactorSettings from '../../components/Settings/TwoFactorSettings';
import api from '../../services/api';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'security' | 'password'>('security');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('নতুন পাসওয়ার্ড এবং নিশ্চিত পাসওয়ার্ড মিলছে না');
            return;
        }

        if (newPassword.length < 6) {
            setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }

        setLoading(true);

        try {
            const response = await api.put('/auth/password', {
                currentPassword,
                newPassword
            });

            setSuccess(response.data.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // User will be logged out after password change
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">সেটিংস</h1>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('security')}
                    className={`pb-3 px-4 font-medium transition ${
                        activeTab === 'security'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    নিরাপত্তা
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`pb-3 px-4 font-medium transition ${
                        activeTab === 'password'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    পাসওয়ার্ড পরিবর্তন
                </button>
            </div>

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    <TwoFactorSettings />
                </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">পাসওয়ার্ড পরিবর্তন</h2>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                            <p className="text-green-700">{success}</p>
                            <p className="text-green-600 text-sm mt-1">আপনি পুনরায় লগইন পেজে রিডাইরেক্ট হবেন...</p>
                        </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                বর্তমান পাসওয়ার্ড
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                নতুন পাসওয়ার্ড
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            />
                            <p className="text-sm text-gray-500 mt-1">কমপক্ষে ৬ অক্ষরের হতে হবে</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                নতুন পাসওয়ার্ড নিশ্চিত করুন
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                            />
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ পাসওয়ার্ড পরিবর্তন করলে সকল ডিভাইস থেকে লগআউট হয়ে যাবে এবং পুনরায় লগইন করতে হবে।
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Settings;
