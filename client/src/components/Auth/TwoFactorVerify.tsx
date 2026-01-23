import React, { useState } from 'react';
import api from '../../services/api';

interface TwoFactorVerifyProps {
    userId: string;
    onSuccess: (userData: any) => void;
    onCancel: () => void;
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ userId, onSuccess, onCancel }) => {
    const [code, setCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        if (!code) {
            setError('কোড প্রবেশ করুন');
            return;
        }

        if (!useBackupCode && code.length !== 6) {
            setError('৬ ডিজিটের কোড প্রবেশ করুন');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/2fa/verify', {
                userId,
                token: code,
                useBackupCode
            });

            // Store tokens
            if (response.data.accessToken) {
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('token', response.data.accessToken); // Legacy
            }

            onSuccess(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'যাচাই ব্যর্থ হয়েছে');
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && code) {
            handleVerify();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
                    <p className="text-gray-600 mt-2">
                        {useBackupCode
                            ? 'আপনার ব্যাকআপ কোড প্রবেশ করুন'
                            : 'আপনার অথেন্টিকেটর অ্যাপ থেকে ৬ ডিজিটের কোড প্রবেশ করুন'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Input */}
                <div className="mb-6">
                    <input
                        type="text"
                        inputMode={useBackupCode ? 'text' : 'numeric'}
                        maxLength={useBackupCode ? 9 : 6}
                        value={code}
                        onChange={(e) => {
                            if (useBackupCode) {
                                setCode(e.target.value.toUpperCase());
                            } else {
                                setCode(e.target.value.replace(/\D/g, ''));
                            }
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
                        className="w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-mono"
                        autoFocus
                    />
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleVerify}
                        disabled={loading || !code}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                    >
                        {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
                    </button>

                    <button
                        onClick={() => {
                            setUseBackupCode(!useBackupCode);
                            setCode('');
                            setError('');
                        }}
                        className="w-full text-green-600 hover:text-green-700 font-medium py-2"
                    >
                        {useBackupCode
                            ? '← অথেন্টিকেটর কোড ব্যবহার করুন'
                            : 'ব্যাকআপ কোড ব্যবহার করুন →'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="w-full text-gray-600 hover:text-gray-700 font-medium py-2"
                    >
                        বাতিল করুন
                    </button>
                </div>

                {/* Help Text */}
                {!useBackupCode && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            অ্যাপ অ্যাক্সেস নেই?{' '}
                            <button
                                onClick={() => setUseBackupCode(true)}
                                className="text-green-600 hover:text-green-700 underline"
                            >
                                ব্যাকআপ কোড ব্যবহার করুন
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TwoFactorVerify;
