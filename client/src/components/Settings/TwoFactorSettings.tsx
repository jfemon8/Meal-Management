import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import TwoFactorSetup from '../Auth/TwoFactorSetup';

interface TwoFactorStatus {
    isEnabled: boolean;
    method: string | null;
    enabledAt: string | null;
    backupCodesRemaining: number;
}

const TwoFactorSettings: React.FC = () => {
    const [status, setStatus] = useState<TwoFactorStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/auth/2fa/status');
            setStatus(response.data);
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!password) {
            setError('পাসওয়ার্ড প্রবেশ করুন');
            return;
        }

        setActionLoading(true);
        setError('');

        try {
            await api.post('/auth/2fa/disable', { password });
            setShowDisableConfirm(false);
            setPassword('');
            fetchStatus();
            alert('2FA নিষ্ক্রিয় করা হয়েছে');
        } catch (err: any) {
            setError(err.response?.data?.message || '2FA নিষ্ক্রিয় করতে ব্যর্থ');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRegenerateBackupCodes = async () => {
        if (!password) {
            setError('পাসওয়ার্ড প্রবেশ করুন');
            return;
        }

        setActionLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/2fa/regenerate-backup-codes', { password });
            setShowRegenerateConfirm(false);
            setPassword('');

            // Download new backup codes
            const codes = response.data.backupCodes;
            const content = `Meal Management System - নতুন 2FA Backup Codes\n\nসতর্কতা: এই কোডগুলি নিরাপদ স্থানে রাখুন!\n\n${codes.join('\n')}`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = '2fa-backup-codes-new.txt';
            link.click();
            URL.revokeObjectURL(url);

            fetchStatus();
            alert('নতুন ব্যাকআপ কোড তৈরি হয়েছে এবং ডাউনলোড হয়েছে');
        } catch (err: any) {
            setError(err.response?.data?.message || 'ব্যাকআপ কোড তৈরি করতে ব্যর্থ');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
                <p className="text-gray-600 mt-1">
                    আপনার অ্যাকাউন্টে অতিরিক্ত সুরক্ষা যোগ করুন
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">স্ট্যাটাস</h3>
                        <div className="mt-2">
                            {status?.isEnabled ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-green-700 font-medium">সক্রিয়</span>
                                    {status.enabledAt && (
                                        <span className="text-sm text-gray-500">
                                            (সক্রিয় করা হয়েছে: {new Date(status.enabledAt).toLocaleDateString('bn-BD')})
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                    <span className="text-gray-700">নিষ্ক্রিয়</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!status?.isEnabled && (
                        <button
                            onClick={() => setShowSetup(true)}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                        >
                            সক্রিয় করুন
                        </button>
                    )}
                </div>

                {/* Enabled State */}
                {status?.isEnabled && (
                    <>
                        {/* Backup Codes */}
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">ব্যাকআপ কোড</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        অবশিষ্ট: <span className="font-semibold">{status.backupCodesRemaining}</span> টি
                                    </p>
                                    {status.backupCodesRemaining < 3 && (
                                        <p className="text-sm text-orange-600 mt-1">
                                            ⚠️ কম ব্যাকআপ কোড অবশিষ্ট! নতুন কোড তৈরি করুন।
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowRegenerateConfirm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm"
                                >
                                    নতুন কোড তৈরি করুন
                                </button>
                            </div>
                        </div>

                        {/* Disable 2FA */}
                        <div className="border-t border-gray-200 pt-6">
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                                <p className="text-red-800 text-sm mt-1">
                                    2FA নিষ্ক্রিয় করলে আপনার অ্যাকাউন্টের সুরক্ষা কমে যাবে।
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDisableConfirm(true)}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition"
                            >
                                2FA নিষ্ক্রিয় করুন
                            </button>
                        </div>
                    </>
                )}

                {/* Information */}
                {!status?.isEnabled && (
                    <div className="border-t border-gray-200 pt-6">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">কেন 2FA সক্রিয় করবেন?</h3>
                            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                                <li>আপনার অ্যাকাউন্টে অতিরিক্ত সুরক্ষা স্তর যোগ হবে</li>
                                <li>পাসওয়ার্ড চুরি হলেও অ্যাকাউন্ট নিরাপদ থাকবে</li>
                                <li>অননুমোদিত অ্যাক্সেস প্রতিরোধ করবে</li>
                                <li>আপনার ডেটা সুরক্ষিত রাখবে</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Setup Modal */}
            <TwoFactorSetup
                isOpen={showSetup}
                onClose={() => setShowSetup(false)}
                onSuccess={() => {
                    fetchStatus();
                    alert('2FA সফলভাবে সক্রিয় হয়েছে! পরবর্তী লগইনে 2FA কোড প্রয়োজন হবে।');
                }}
            />

            {/* Disable Confirmation Modal */}
            {showDisableConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">2FA নিষ্ক্রিয় করবেন?</h3>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <p className="text-gray-700 mb-4">
                            নিশ্চিত করতে আপনার পাসওয়ার্ড প্রবেশ করুন:
                        </p>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="পাসওয়ার্ড"
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:border-green-500 focus:outline-none"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDisableConfirm(false);
                                    setPassword('');
                                    setError('');
                                }}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleDisable2FA}
                                disabled={actionLoading}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'প্রক্রিয়াধীন...' : 'নিষ্ক্রিয় করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Regenerate Backup Codes Confirmation Modal */}
            {showRegenerateConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">নতুন ব্যাকআপ কোড তৈরি করবেন?</h3>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4">
                            <p className="text-yellow-800 text-sm">
                                নতুন কোড তৈরি করলে পুরাতন সব কোড বাতিল হয়ে যাবে।
                            </p>
                        </div>

                        <p className="text-gray-700 mb-4">
                            নিশ্চিত করতে আপনার পাসওয়ার্ড প্রবেশ করুন:
                        </p>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="পাসওয়ার্ড"
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:border-green-500 focus:outline-none"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRegenerateConfirm(false);
                                    setPassword('');
                                    setError('');
                                }}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleRegenerateBackupCodes}
                                disabled={actionLoading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
                            >
                                {actionLoading ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TwoFactorSettings;
