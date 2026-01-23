import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface BalanceInfo {
    amount: number;
    isFrozen: boolean;
    frozenAt?: string | null;
    frozenBy?: string | null;
    frozenReason?: string;
}

interface LowBalanceWarningProps {
    balances?: {
        breakfast?: BalanceInfo;
        lunch?: BalanceInfo;
        dinner?: BalanceInfo;
    };
    threshold?: number;
}

const LowBalanceWarning: React.FC<LowBalanceWarningProps> = ({ balances, threshold = 100 }) => {
    const lowBalances: string[] = [];

    if (balances?.breakfast && balances.breakfast.amount < threshold) {
        lowBalances.push('নাস্তা');
    }
    if (balances?.lunch && balances.lunch.amount < threshold) {
        lowBalances.push('দুপুর');
    }
    if (balances?.dinner && balances.dinner.amount < threshold) {
        lowBalances.push('রাত');
    }

    if (lowBalances.length === 0) {
        return null;
    }

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <FiAlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        ⚠️ লো ব্যালেন্স সতর্কতা
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                        <p>
                            আপনার <strong>{lowBalances.join(', ')}</strong> ব্যালেন্স কম আছে (৳{threshold} এর নিচে)।
                            দয়া করে ব্যালেন্স রিচার্জ করুন।
                        </p>
                    </div>
                    <div className="mt-4">
                        <Link
                            to="/transactions"
                            className="text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
                        >
                            লেনদেন দেখুন →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LowBalanceWarning;
