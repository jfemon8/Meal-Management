import React, { useState } from 'react';
import { FiX, FiLock, FiUnlock } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface FreezeBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    currentBalances: {
        breakfast?: { amount: number; isFrozen: boolean; frozenReason?: string };
        lunch?: { amount: number; isFrozen: boolean; frozenReason?: string };
        dinner?: { amount: number; isFrozen: boolean; frozenReason?: string };
    };
    onSuccess: () => void;
}

const FreezeBalanceModal: React.FC<FreezeBalanceModalProps> = ({
    isOpen,
    onClose,
    userId,
    userName,
    currentBalances,
    onSuccess
}) => {
    const [balanceType, setBalanceType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
    const [action, setAction] = useState<'freeze' | 'unfreeze'>('freeze');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (action === 'freeze' && !reason.trim()) {
            toast.error('ফ্রিজ করার কারণ লিখুন');
            return;
        }

        setLoading(true);
        try {
            const endpoint = action === 'freeze' ? '/wallet/freeze' : '/wallet/unfreeze';
            const payload: any = { userId, balanceType };
            if (action === 'freeze') {
                payload.reason = reason;
            }

            const response = await api.post(endpoint, payload);
            toast.success(response.data.message);
            onSuccess();
            onClose();
            setReason('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'অপারেশন ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedBalance = currentBalances[balanceType];
    const isFrozen = selectedBalance?.isFrozen || false;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        ব্যালেন্স ম্যানেজমেন্ট
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* User Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">ইউজার</p>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{userName}</p>
                    </div>

                    {/* Balance Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ব্যালেন্স টাইপ
                        </label>
                        <select
                            value={balanceType}
                            onChange={(e) => setBalanceType(e.target.value as any)}
                            className="input w-full"
                        >
                            <option value="breakfast">নাস্তা (৳{currentBalances.breakfast?.amount || 0})</option>
                            <option value="lunch">দুপুর (৳{currentBalances.lunch?.amount || 0})</option>
                            <option value="dinner">রাত (৳{currentBalances.dinner?.amount || 0})</option>
                        </select>
                    </div>

                    {/* Current Status */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">বর্তমান অবস্থা</p>
                        {isFrozen ? (
                            <div>
                                <p className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <FiLock /> ফ্রিজ করা আছে
                                </p>
                                {selectedBalance?.frozenReason && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        কারণ: {selectedBalance.frozenReason}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                <FiUnlock /> সক্রিয়
                            </p>
                        )}
                    </div>

                    {/* Action Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            অ্যাকশন
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAction('freeze')}
                                disabled={isFrozen}
                                className={`p-3 rounded-lg border-2 transition ${
                                    action === 'freeze' && !isFrozen
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                } ${isFrozen ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500'}`}
                            >
                                <FiLock className="w-5 h-5 mx-auto mb-1" />
                                <p className="text-sm font-medium">ফ্রিজ করুন</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAction('unfreeze')}
                                disabled={!isFrozen}
                                className={`p-3 rounded-lg border-2 transition ${
                                    action === 'unfreeze' && isFrozen
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                } ${!isFrozen ? 'opacity-50 cursor-not-allowed' : 'hover:border-green-500'}`}
                            >
                                <FiUnlock className="w-5 h-5 mx-auto mb-1" />
                                <p className="text-sm font-medium">আনফ্রিজ করুন</p>
                            </button>
                        </div>
                    </div>

                    {/* Reason (for freeze only) */}
                    {action === 'freeze' && !isFrozen && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                ফ্রিজ করার কারণ *
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="input w-full"
                                rows={3}
                                placeholder="কারণ লিখুন..."
                                required
                            />
                        </div>
                    )}

                    {/* Warning */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            {action === 'freeze'
                                ? '⚠️ ফ্রিজ করলে এই ব্যালেন্সে কোনো লেনদেন করা যাবে না'
                                : '✓ আনফ্রিজ করলে ব্যালেন্স আবার সক্রিয় হবে'}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (action === 'freeze' && isFrozen) || (action === 'unfreeze' && !isFrozen)}
                            className={`flex-1 ${
                                action === 'freeze' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                            } text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50`}
                        >
                            {loading ? 'প্রক্রিয়াধীন...' : action === 'freeze' ? 'ফ্রিজ করুন' : 'আনফ্রিজ করুন'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FreezeBalanceModal;
