import React, { useEffect, useState } from 'react';
import { useSessionWarning, useAutoRefresh } from '../../hooks/useSessionWarning';

interface SessionExpiryWarningProps {
    /**
     * Time before expiry to show warning (in milliseconds)
     * Default: 2 minutes
     */
    warningTime?: number;

    /**
     * Time before expiry to auto-refresh (in milliseconds)
     * Default: 1 minute
     */
    autoRefreshTime?: number;

    /**
     * Whether to enable auto-refresh
     * Default: true
     */
    enableAutoRefresh?: boolean;
}

const SessionExpiryWarning: React.FC<SessionExpiryWarningProps> = ({
    warningTime = 2 * 60 * 1000,
    autoRefreshTime = 1 * 60 * 1000,
    enableAutoRefresh = true
}) => {
    const { showWarning, timeLeft, dismissWarning, formatTimeLeft } = useSessionWarning(warningTime);
    const { isRefreshing } = useAutoRefresh(autoRefreshTime);
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when warning changes
    useEffect(() => {
        if (!showWarning) {
            setDismissed(false);
        }
    }, [showWarning]);

    const handleDismiss = () => {
        setDismissed(true);
        dismissWarning();
    };

    // Don't show if dismissed or not warning
    if (!showWarning || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg
                            className="h-6 w-6 text-yellow-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-yellow-800">
                            সেশন শীঘ্রই শেষ হবে
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                            <p>
                                আপনার সেশন {formatTimeLeft()} পরে শেষ হবে।
                                {enableAutoRefresh && !isRefreshing && (
                                    <span className="block mt-1">
                                        সেশন স্বয়ংক্রিয়ভাবে রিফ্রেশ হবে।
                                    </span>
                                )}
                                {isRefreshing && (
                                    <span className="block mt-1 font-medium">
                                        সেশন রিফ্রেশ হচ্ছে...
                                    </span>
                                )}
                            </p>
                        </div>
                        {!enableAutoRefresh && (
                            <div className="mt-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                                >
                                    সেশন রিফ্রেশ করুন
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="ml-auto pl-3">
                        <button
                            onClick={handleDismiss}
                            className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiryWarning;
