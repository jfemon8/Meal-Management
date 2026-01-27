import React, { useState, type ChangeEvent } from 'react';
import { parseISO } from 'date-fns';
import { formatDateTimeShort, nowBD } from '../../utils/dateUtils';
import {
    FiDatabase,
    FiTrash2,
    FiRefreshCw,
    FiAlertTriangle,
    FiUsers,
    FiCalendar,
    FiDollarSign,
    FiActivity,
    FiUserCheck,
    FiAlertOctagon,
    FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import {
    useDataSummary,
    useRecalculateUserBalance,
    useRecalculateAllBalances,
    useRecalculateMealCosts,
    useSystemReset,
    useSoftDeleteUser,
    useRestoreUser,
    useDeletedUsers,
    usePermanentDeleteUser,
    useCleanupOrphans
} from '../../hooks/queries/useDataControl';

// ============================================
// Types
// ============================================

type TabId = 'summary' | 'users' | 'recalculate' | 'reset';
type DangerLevel = 'medium' | 'high' | 'critical';

interface Tab {
    id: TabId;
    label: string;
    icon: IconType;
}

interface ResetOption {
    value: string;
    label: string;
    danger: DangerLevel;
}

interface DeletedBy {
    name?: string;
}

interface DeletedUser {
    _id: string;
    name: string;
    email: string;
    deletedBy?: DeletedBy;
    deletedAt?: string;
}

interface MealSummary {
    total?: number;
    active?: number;
    lunch?: number;
    dinner?: number;
}

interface HolidaySummary {
    total?: number;
    recurring?: number;
    byType?: {
        government?: number;
    };
}

interface GroupSummary {
    total?: number;
    active?: number;
}

interface TransactionSummary {
    total?: number;
    corrected?: number;
}

interface UserSummary {
    total?: number;
    deleted?: number;
}

interface DataSummary {
    meals?: MealSummary;
    holidays?: HolidaySummary;
    groups?: GroupSummary;
    transactions?: TransactionSummary;
    users?: UserSummary;
}

interface RecalcResult {
    results?: unknown;
    usersWithDifferences?: number;
    totalMeals?: number;
}

interface ResetResult {
    message: string;
}

interface OrphanResult {
    orphanCounts: Record<string, number>;
}

interface DeleteResult {
    deletedCounts: Record<string, number>;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

// ============================================
// Component
// ============================================

const DataControl: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('summary');
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [recalcYear, setRecalcYear] = useState<number>(nowBD().getFullYear());
    const [recalcMonth, setRecalcMonth] = useState<number>(nowBD().getMonth() + 1);
    const [resetType, setResetType] = useState<string>('');
    const [resetReason, setResetReason] = useState<string>('');
    const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

    // Queries
    const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useDataSummary() as {
        data: DataSummary | undefined;
        isLoading: boolean;
        refetch: () => void;
    };
    const { data: deletedUsers, isLoading: deletedLoading } = useDeletedUsers() as {
        data: DeletedUser[] | undefined;
        isLoading: boolean;
    };

    // Mutations
    const recalcUserBalance = useRecalculateUserBalance();
    const recalcAllBalances = useRecalculateAllBalances();
    const recalcMealCosts = useRecalculateMealCosts();
    const systemReset = useSystemReset();
    const restoreUser = useRestoreUser();
    const permanentDelete = usePermanentDeleteUser();
    const cleanupOrphans = useCleanupOrphans();

    const tabs: Tab[] = [
        { id: 'summary', label: 'ডাটা সারাংশ', icon: FiDatabase },
        { id: 'users', label: 'ইউজার ম্যানেজ', icon: FiUsers },
        { id: 'recalculate', label: 'রিক্যালকুলেশন', icon: FiRefreshCw },
        { id: 'reset', label: 'সিস্টেম রিসেট', icon: FiAlertOctagon }
    ];

    const handleRecalcUserBalance = async (dryRun: boolean = true): Promise<void> => {
        if (!selectedUserId) {
            alert('ইউজার আইডি দিন');
            return;
        }
        try {
            const result = (await recalcUserBalance.mutateAsync({ userId: selectedUserId, dryRun })) as unknown as RecalcResult;
            if (dryRun) {
                alert(`প্রিভিউ:\n${JSON.stringify(result.results, null, 2)}`);
            } else {
                alert('ব্যালেন্স রিক্যালকুলেট সম্পন্ন');
            }
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleRecalcAllBalances = async (dryRun: boolean = true): Promise<void> => {
        try {
            const result = (await recalcAllBalances.mutateAsync({ dryRun })) as unknown as RecalcResult;
            alert(`${dryRun ? 'প্রিভিউ' : 'সম্পন্ন'}: ${result.usersWithDifferences} জন ইউজারে পার্থক্য পাওয়া গেছে`);
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleRecalcMealCosts = async (dryRun: boolean = true): Promise<void> => {
        try {
            const result = (await recalcMealCosts.mutateAsync({
                year: recalcYear,
                month: recalcMonth,
                dryRun,
                reason: 'Manual recalculation'
            })) as unknown as { results: RecalcResult };
            alert(`${dryRun ? 'প্রিভিউ' : 'সম্পন্ন'}: ${result.results.totalMeals} মিল প্রসেস করা হয়েছে`);
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleSystemReset = async (): Promise<void> => {
        if (!resetType || !resetReason || resetReason.length < 10) {
            alert('রিসেট টাইপ এবং বিস্তারিত কারণ (কমপক্ষে ১০ অক্ষর) দিন');
            return;
        }
        try {
            const result = (await systemReset.mutateAsync({ resetType: resetType as 'test_data' | 'all_meals' | 'all_transactions' | 'reset_balances', reason: resetReason })) as unknown as ResetResult;
            alert(result.message);
            setShowResetConfirm(false);
            setResetType('');
            setResetReason('');
            refetchSummary();
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'রিসেট ব্যর্থ হয়েছে');
        }
    };

    const handleRestore = async (userId: string): Promise<void> => {
        try {
            await restoreUser.mutateAsync(userId);
            alert('ইউজার রিস্টোর করা হয়েছে');
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'রিস্টোর ব্যর্থ হয়েছে');
        }
    };

    const handlePermanentDelete = async (userId: string): Promise<void> => {
        if (!window.confirm('এই ইউজার এবং তার সকল ডাটা স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?')) {
            return;
        }
        try {
            const result = (await permanentDelete.mutateAsync(userId)) as unknown as DeleteResult;
            alert(`স্থায়ীভাবে মুছে ফেলা হয়েছে। মুছে ফেলা ডাটা: ${JSON.stringify(result.deletedCounts)}`);
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'ডিলিট ব্যর্থ হয়েছে');
        }
    };

    const handleCleanupOrphans = async (dryRun: boolean = true): Promise<void> => {
        try {
            const result = (await cleanupOrphans.mutateAsync({ dryRun })) as unknown as OrphanResult;
            alert(`${dryRun ? 'প্রিভিউ' : 'সম্পন্ন'}: ${JSON.stringify(result.orphanCounts)}`);
        } catch (error) {
            const apiError = error as ApiError;
            alert(apiError.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            return formatDateTimeShort(parseISO(dateStr));
        } catch {
            return dateStr;
        }
    };

    const resetOptions: ResetOption[] = [
        { value: 'test_data', label: 'টেস্ট ডাটা (গত ২৪ ঘণ্টা)', danger: 'medium' },
        { value: 'all_meals', label: 'সকল মিল ডাটা', danger: 'high' },
        { value: 'all_transactions', label: 'সকল লেনদেন + ব্যালেন্স', danger: 'critical' },
        { value: 'reset_balances', label: 'শুধু ব্যালেন্স রিসেট', danger: 'high' }
    ];

    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <FiDatabase className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">ডাটা কন্ট্রোল</h1>
                </div>
                <p className="text-purple-100">
                    সিস্টেম ডাটা এডিট, রিক্যালকুলেশন এবং রিসেট টুলস
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-red-800 dark:text-red-200">অত্যন্ত সতর্কতা অবলম্বন করুন</h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            এই পৃষ্ঠায় সিস্টেম-লেভেল পরিবর্তন করা সম্ভব যা অপরিবর্তনীয় হতে পারে।
                            প্রতিটি অ্যাকশনের আগে ভালো করে চিন্তা করুন এবং প্রয়োজনে ব্যাকআপ নিন।
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Summary Tab */}
                    {activeTab === 'summary' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    ডাটাবেজ সারাংশ
                                </h2>
                                <button
                                    onClick={() => refetchSummary()}
                                    className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <FiRefreshCw className="w-4 h-4" />
                                    রিফ্রেশ
                                </button>
                            </div>

                            {summaryLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : summary ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Meals */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <h3 className="font-medium text-blue-800 dark:text-blue-200">মিল</h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                                            <p>মোট: <span className="font-semibold">{summary.meals?.total || 0}</span></p>
                                            <p>সক্রিয়: {summary.meals?.active || 0}</p>
                                            <p>লাঞ্চ: {summary.meals?.lunch || 0} | ডিনার: {summary.meals?.dinner || 0}</p>
                                        </div>
                                    </div>

                                    {/* Holidays */}
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiCalendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <h3 className="font-medium text-green-800 dark:text-green-200">ছুটি</h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                                            <p>মোট: <span className="font-semibold">{summary.holidays?.total || 0}</span></p>
                                            <p>পুনরাবৃত্তি: {summary.holidays?.recurring || 0}</p>
                                            <p>সরকারি: {summary.holidays?.byType?.government || 0}</p>
                                        </div>
                                    </div>

                                    {/* Groups */}
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiUsers className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">গ্রুপ</h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                                            <p>মোট: <span className="font-semibold">{summary.groups?.total || 0}</span></p>
                                            <p>সক্রিয়: {summary.groups?.active || 0}</p>
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiDollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <h3 className="font-medium text-purple-800 dark:text-purple-200">লেনদেন</h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                                            <p>মোট: <span className="font-semibold">{summary.transactions?.total || 0}</span></p>
                                            <p>সংশোধিত: {summary.transactions?.corrected || 0}</p>
                                        </div>
                                    </div>

                                    {/* Users */}
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            <h3 className="font-medium text-indigo-800 dark:text-indigo-200">ইউজার</h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                                            <p>মোট: <span className="font-semibold">{summary.users?.total || 0}</span></p>
                                            <p>ডিলিটেড: {summary.users?.deleted || 0}</p>
                                        </div>
                                    </div>

                                    {/* Orphan Cleanup */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FiActivity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                            <h3 className="font-medium text-gray-800 dark:text-gray-200">অরফান ক্লিনআপ</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleCleanupOrphans(true)}
                                                disabled={cleanupOrphans.isPending}
                                                className="w-full px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                            >
                                                স্ক্যান করুন
                                            </button>
                                            <button
                                                onClick={() => handleCleanupOrphans(false)}
                                                disabled={cleanupOrphans.isPending}
                                                className="w-full px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                                            >
                                                ক্লিনআপ করুন
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    ডাটা লোড করা যায়নি
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                সফট ডিলিটেড ইউজার
                            </h2>

                            {deletedLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : !deletedUsers?.length ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    কোনো সফট ডিলিটেড ইউজার নেই
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">নাম</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">ইমেইল</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">ডিলিট করেছেন</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">তারিখ</th>
                                                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">অ্যাকশন</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedUsers.map((user) => (
                                                <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700/50">
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {user.name}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                        {user.email}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                        {user.deletedBy?.name || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                                                        {user.deletedAt ? formatDate(user.deletedAt) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleRestore(user._id)}
                                                                disabled={restoreUser.isPending}
                                                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                title="রিস্টোর করুন"
                                                            >
                                                                <FiUserCheck className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePermanentDelete(user._id)}
                                                                disabled={permanentDelete.isPending}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="স্থায়ীভাবে মুছুন"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recalculate Tab */}
                    {activeTab === 'recalculate' && (
                        <div className="space-y-6">
                            {/* Per-User Balance */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                                    নির্দিষ্ট ইউজারের ব্যালেন্স রিক্যালকুলেট
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    <input
                                        type="text"
                                        value={selectedUserId}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedUserId(e.target.value)}
                                        placeholder="ইউজার আইডি"
                                        className="flex-1 min-w-[200px] px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                    />
                                    <button
                                        onClick={() => handleRecalcUserBalance(true)}
                                        disabled={recalcUserBalance.isPending}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        প্রিভিউ
                                    </button>
                                    <button
                                        onClick={() => handleRecalcUserBalance(false)}
                                        disabled={recalcUserBalance.isPending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        রিক্যালকুলেট
                                    </button>
                                </div>
                            </div>

                            {/* All Balances */}
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                <h3 className="font-medium text-green-800 dark:text-green-200 mb-3">
                                    সকল ইউজারের ব্যালেন্স রিক্যালকুলেট
                                </h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleRecalcAllBalances(true)}
                                        disabled={recalcAllBalances.isPending}
                                        className="px-4 py-2 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        প্রিভিউ
                                    </button>
                                    <button
                                        onClick={() => handleRecalcAllBalances(false)}
                                        disabled={recalcAllBalances.isPending}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        সব রিক্যালকুলেট
                                    </button>
                                </div>
                            </div>

                            {/* Meal Costs */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-3">
                                    মিল কস্ট রিক্যালকুলেট
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    <select
                                        value={recalcYear}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setRecalcYear(Number(e.target.value))}
                                        className="px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                    >
                                        {[2024, 2025, 2026].map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={recalcMonth}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setRecalcMonth(Number(e.target.value))}
                                        className="px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <option key={m} value={m}>
                                                {monthNames[m - 1]}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleRecalcMealCosts(true)}
                                        disabled={recalcMealCosts.isPending}
                                        className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        প্রিভিউ
                                    </button>
                                    <button
                                        onClick={() => handleRecalcMealCosts(false)}
                                        disabled={recalcMealCosts.isPending}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        রিক্যালকুলেট
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reset Tab */}
                    {activeTab === 'reset' && (
                        <div>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <FiAlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-red-800 dark:text-red-200">বিপদ সতর্কতা</h3>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            নিচের অ্যাকশনগুলো ডাটা স্থায়ীভাবে মুছে ফেলতে পারে এবং পূর্বাবস্থায় ফেরানো সম্ভব নয়।
                                            অত্যন্ত সতর্কতার সাথে ব্যবহার করুন।
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {resetOptions.map((option) => (
                                    <div
                                        key={option.value}
                                        className={`p-4 rounded-lg border ${
                                            option.danger === 'critical'
                                                ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                                                : option.danger === 'high'
                                                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
                                                : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                                    {option.label}
                                                </h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    option.danger === 'critical'
                                                        ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                                                        : option.danger === 'high'
                                                        ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                                                        : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                                                }`}>
                                                    {option.danger === 'critical' ? 'অত্যন্ত বিপদজনক' :
                                                     option.danger === 'high' ? 'বিপদজনক' : 'মাঝারি'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setResetType(option.value);
                                                    setShowResetConfirm(true);
                                                }}
                                                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                                                    option.danger === 'critical'
                                                        ? 'bg-red-600 hover:bg-red-700'
                                                        : option.danger === 'high'
                                                        ? 'bg-orange-600 hover:bg-orange-700'
                                                        : 'bg-yellow-600 hover:bg-yellow-700'
                                                }`}
                                            >
                                                রিসেট
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <FiAlertOctagon className="w-5 h-5" />
                                    সিস্টেম রিসেট নিশ্চিত করুন
                                </h3>
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    আপনি <strong>{resetOptions.find(o => o.value === resetType)?.label}</strong> রিসেট করতে চাইছেন।
                                    এই অ্যাকশন পূর্বাবস্থায় ফেরানো যাবে না!
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    কারণ (কমপক্ষে ১০ অক্ষর) *
                                </label>
                                <textarea
                                    value={resetReason}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setResetReason(e.target.value)}
                                    placeholder="কেন এই রিসেট করা হচ্ছে তা বিস্তারিত লিখুন..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowResetConfirm(false);
                                    setResetType('');
                                    setResetReason('');
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleSystemReset}
                                disabled={systemReset.isPending || resetReason.length < 10}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <FiAlertTriangle className="w-4 h-4" />
                                রিসেট নিশ্চিত করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataControl;
