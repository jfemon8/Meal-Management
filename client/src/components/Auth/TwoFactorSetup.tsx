import React, { useState } from 'react';
import api from '../../services/api';

interface TwoFactorSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface SetupData {
    secret: string;
    qrCode: string;
    backupCodes: string[];
    instructions: string[];
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'backup'>('initial');
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStartSetup = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/2fa/setup');
            setSetupData(response.data);
            setStep('setup');
        } catch (err: any) {
            setError(err.response?.data?.message || '2FA সেটআপ শুরু করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('৬ ডিজিটের কোড প্রবেশ করুন');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/2fa/verify-setup', {
                token: verificationCode
            });
            setSetupData(prev => prev ? { ...prev, backupCodes: response.data.backupCodes } : null);
            setStep('backup');
        } catch (err: any) {
            setError(err.response?.data?.message || 'ভুল কোড');
            setVerificationCode('');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        onSuccess();
        handleClose();
    };

    const handleClose = () => {
        setStep('initial');
        setSetupData(null);
        setVerificationCode('');
        setError('');
        onClose();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const downloadBackupCodes = () => {
        if (!setupData) return;

        const content = `Meal Management System - 2FA Backup Codes\n\nসতর্কতা: এই কোডগুলি নিরাপদ স্থানে রাখুন!\n\n${setupData.backupCodes.join('\n')}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '2fa-backup-codes.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">
                            {step === 'initial' && 'Two-Factor Authentication সেটআপ'}
                            {step === 'setup' && 'QR কোড স্ক্যান করুন'}
                            {step === 'verify' && 'যাচাই করুন'}
                            {step === 'backup' && 'ব্যাকআপ কোড সংরক্ষণ করুন'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-white hover:text-gray-200 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Initial Step */}
                    {step === 'initial' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                                <h3 className="font-semibold text-blue-900 mb-2">
                                    Two-Factor Authentication (2FA) কী?
                                </h3>
                                <p className="text-blue-800">
                                    2FA আপনার অ্যাকাউন্টে একটি অতিরিক্ত সুরক্ষা স্তর যোগ করে। লগইন করার সময় পাসওয়ার্ডের পাশাপাশি
                                    আপনার মোবাইলে থাকা অথেন্টিকেটর অ্যাপ থেকে একটি ৬ ডিজিটের কোড প্রয়োজন হবে।
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">আপনার প্রয়োজন হবে:</h4>
                                <ul className="list-disc list-inside space-y-2 text-gray-700">
                                    <li>Google Authenticator, Microsoft Authenticator, বা Authy অ্যাপ</li>
                                    <li>আপনার মোবাইল ফোন</li>
                                    <li>ব্যাকআপ কোড সংরক্ষণের জন্য একটি নিরাপদ স্থান</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleStartSetup}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'শুরু হচ্ছে...' : 'সেটআপ শুরু করুন'}
                            </button>
                        </div>
                    )}

                    {/* Setup Step */}
                    {step === 'setup' && setupData && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-700 mb-4">
                                    আপনার অথেন্টিকেটর অ্যাপ দিয়ে নিচের QR কোড স্ক্যান করুন
                                </p>
                                <div className="flex justify-center mb-6">
                                    <img
                                        src={setupData.qrCode}
                                        alt="QR Code"
                                        className="border-4 border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">
                                    অথবা ম্যানুয়ালি এই সিক্রেট কী প্রবেশ করান:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white p-3 rounded border text-sm break-all">
                                        {setupData.secret}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(setupData.secret)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded text-sm"
                                    >
                                        কপি
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900">নির্দেশনা:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                    {setupData.instructions.map((instruction, index) => (
                                        <li key={index}>{instruction}</li>
                                    ))}
                                </ol>
                            </div>

                            <button
                                onClick={() => setStep('verify')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                            >
                                পরবর্তী: যাচাই করুন
                            </button>
                        </div>
                    )}

                    {/* Verify Step */}
                    {step === 'verify' && (
                        <div className="space-y-6">
                            <p className="text-gray-700 text-center">
                                আপনার অথেন্টিকেটর অ্যাপে দেখানো ৬ ডিজিটের কোড প্রবেশ করুন
                            </p>

                            <div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="w-full text-center text-3xl tracking-widest p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('setup')}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition"
                                >
                                    পেছনে
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={loading || verificationCode.length !== 6}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                                >
                                    {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Backup Codes Step */}
                    {step === 'backup' && setupData && (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                                <h3 className="font-semibold text-yellow-900 mb-2">
                                    ⚠️ গুরুত্বপূর্ণ: ব্যাকআপ কোড সংরক্ষণ করুন
                                </h3>
                                <p className="text-yellow-800">
                                    আপনার ফোন হারিয়ে গেলে বা অ্যাপ অ্যাক্সেস না থাকলে এই কোডগুলি ব্যবহার করে লগইন করতে পারবেন।
                                    প্রতিটি কোড শুধুমাত্র একবার ব্যবহার করা যাবে।
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {setupData.backupCodes.map((code, index) => (
                                        <div
                                            key={index}
                                            className="bg-white p-3 rounded border text-center font-mono text-sm"
                                        >
                                            {code}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={downloadBackupCodes}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
                                >
                                    📥 ডাউনলোড করুন
                                </button>
                            </div>

                            <div className="bg-green-50 border-l-4 border-green-500 p-4">
                                <p className="text-green-800 font-semibold">
                                    ✅ 2FA সফলভাবে সক্রিয় হয়েছে!
                                </p>
                                <p className="text-green-700 text-sm mt-1">
                                    পরবর্তী লগইনে আপনার পাসওয়ার্ড এবং 2FA কোড উভয়ই প্রয়োজন হবে।
                                </p>
                            </div>

                            <button
                                onClick={handleComplete}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                            >
                                সম্পন্ন
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetup;
