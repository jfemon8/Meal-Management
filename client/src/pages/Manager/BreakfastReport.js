import React, { useState, useEffect, useRef } from 'react';
import { breakfastService, userService } from '../../services/mealService';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiPrinter, FiDownload, FiCoffee, FiCheck, FiX, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import BDTIcon from '../../components/Icons/BDTIcon';

const BreakfastReport = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [breakfasts, setBreakfasts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'userwise'
    const printRef = useRef();

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            const [breakfastData, userData] = await Promise.all([
                breakfastService.getBreakfasts(startDate, endDate),
                userService.getAllUsers()
            ]);

            setBreakfasts(breakfastData);
            setUsers(userData.filter(u => u.isActive));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `নাস্তা-রিপোর্ট-${format(currentMonth, 'yyyy-MM')}`,
    });

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    // Calculate user-wise summary
    const getUserSummary = () => {
        const summary = {};

        users.forEach(user => {
            summary[user._id] = {
                name: user.name,
                email: user.email,
                totalCost: 0,
                participationCount: 0,
                deductedAmount: 0,
                pendingAmount: 0
            };
        });

        breakfasts.forEach(breakfast => {
            if (breakfast.isReversed) return; // Skip reversed entries

            breakfast.participants.forEach(p => {
                const userId = p.user._id || p.user;
                if (summary[userId]) {
                    summary[userId].totalCost += p.cost;
                    summary[userId].participationCount++;
                    if (p.deducted) {
                        summary[userId].deductedAmount += p.cost;
                    } else {
                        summary[userId].pendingAmount += p.cost;
                    }
                }
            });
        });

        return Object.values(summary).filter(u => u.participationCount > 0).sort((a, b) => b.totalCost - a.totalCost);
    };

    // Calculate totals
    const getTotals = () => {
        let totalCost = 0;
        let totalDeducted = 0;
        let totalPending = 0;
        let finalizedCount = 0;
        let pendingCount = 0;
        let reversedCount = 0;

        breakfasts.forEach(b => {
            if (b.isReversed) {
                reversedCount++;
                return;
            }

            totalCost += b.totalCost;

            if (b.isFinalized) {
                finalizedCount++;
                b.participants.forEach(p => {
                    if (p.deducted) totalDeducted += p.cost;
                    else totalPending += p.cost;
                });
            } else {
                pendingCount++;
                totalPending += b.totalCost;
            }
        });

        return { totalCost, totalDeducted, totalPending, finalizedCount, pendingCount, reversedCount };
    };

    const totals = getTotals();
    const userSummary = getUserSummary();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">নাস্তার খরচ রিপোর্ট</h1>
                <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
                    <FiPrinter />
                    প্রিন্ট
                </button>
            </div>

            {/* Month Navigation & View Toggle */}
            <div className="card no-print">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Month Navigation */}
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <FiChevronLeft className="w-6 h-6 dark:text-gray-300" />
                        </button>
                        <h2 className="text-xl font-semibold dark:text-gray-100">
                            {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <FiChevronRight className="w-6 h-6 dark:text-gray-300" />
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                viewMode === 'daily'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            তারিখ অনুযায়ী
                        </button>
                        <button
                            onClick={() => setViewMode('userwise')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                viewMode === 'userwise'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            ইউজার অনুযায়ী
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div ref={printRef} className="space-y-6 print:p-4">
                {/* Print Header */}
                <div className="hidden print:block text-center mb-8">
                    <h1 className="text-2xl font-bold">মিল ম্যানেজমেন্ট সিস্টেম</h1>
                    <h2 className="text-xl mt-2">
                        নাস্তার খরচ রিপোর্ট - {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                    </h2>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card bg-blue-50 dark:bg-blue-900/20 text-center">
                        <FiCoffee className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">৳{totals.totalCost.toFixed(0)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">মোট খরচ</p>
                    </div>
                    <div className="card bg-green-50 dark:bg-green-900/20 text-center">
                        <FiCheck className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">৳{totals.totalDeducted.toFixed(0)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">কাটা হয়েছে</p>
                    </div>
                    <div className="card bg-yellow-50 dark:bg-yellow-900/20 text-center">
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">৳{totals.totalPending.toFixed(0)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">বাকি আছে</p>
                    </div>
                    <div className="card bg-purple-50 dark:bg-purple-900/20 text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{breakfasts.filter(b => !b.isReversed).length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">মোট এন্ট্রি</p>
                    </div>
                </div>

                {/* Status Summary */}
                <div className="card">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{totals.finalizedCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ফাইনালাইজড</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{totals.pendingCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">পেন্ডিং</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{totals.reversedCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">রিভার্সড</p>
                        </div>
                    </div>
                </div>

                {/* Daily View */}
                {viewMode === 'daily' && (
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4 dark:text-gray-100">তারিখ অনুযায়ী বিবরণ</h3>
                        {breakfasts.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">এই মাসে কোনো নাস্তার এন্ট্রি নেই</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 dark:bg-gray-700">
                                            <th className="text-left py-3 px-4 dark:text-gray-200">তারিখ</th>
                                            <th className="text-left py-3 px-4 dark:text-gray-200">বিবরণ</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">মোট খরচ</th>
                                            <th className="text-center py-3 px-4 dark:text-gray-200">অংশগ্রহণ</th>
                                            <th className="text-center py-3 px-4 dark:text-gray-200">স্ট্যাটাস</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {breakfasts.sort((a, b) => new Date(b.date) - new Date(a.date)).map((b, index) => (
                                            <tr key={b._id} className={`border-b dark:border-gray-700 ${b.isReversed ? 'bg-red-50 dark:bg-red-900/10 opacity-60' : index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                                                <td className="py-3 px-4 dark:text-gray-200">
                                                    {format(new Date(b.date), 'dd MMM', { locale: bn })}
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                                        {format(new Date(b.date), 'EEEE', { locale: bn })}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 dark:text-gray-300">{b.description || '-'}</td>
                                                <td className="py-3 px-4 text-right font-medium dark:text-gray-200">৳{b.totalCost.toFixed(0)}</td>
                                                <td className="py-3 px-4 text-center dark:text-gray-300">{b.participants.length} জন</td>
                                                <td className="py-3 px-4 text-center">
                                                    {b.isReversed ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                            <FiRotateCcw className="w-3 h-3" />
                                                            রিভার্সড
                                                        </span>
                                                    ) : b.isFinalized ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                            <FiCheck className="w-3 h-3" />
                                                            ফাইনালাইজড
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                                            পেন্ডিং
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-bold bg-gray-100 dark:bg-gray-700">
                                            <td className="py-3 px-4 dark:text-gray-200" colSpan="2">মোট</td>
                                            <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">৳{totals.totalCost.toFixed(0)}</td>
                                            <td className="py-3 px-4" colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* User-wise View */}
                {viewMode === 'userwise' && (
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4 dark:text-gray-100">ইউজার অনুযায়ী বিবরণ</h3>
                        {userSummary.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">এই মাসে কোনো নাস্তার এন্ট্রি নেই</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 dark:bg-gray-700">
                                            <th className="text-left py-3 px-4 dark:text-gray-200">#</th>
                                            <th className="text-left py-3 px-4 dark:text-gray-200">নাম</th>
                                            <th className="text-center py-3 px-4 dark:text-gray-200">অংশগ্রহণ</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">মোট খরচ</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">কাটা হয়েছে</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">বাকি</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userSummary.map((user, index) => (
                                            <tr key={index} className={`border-b dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                                                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="py-3 px-4 font-medium dark:text-gray-200">{user.name}</td>
                                                <td className="py-3 px-4 text-center dark:text-gray-300">{user.participationCount} দিন</td>
                                                <td className="py-3 px-4 text-right font-medium dark:text-gray-200">৳{user.totalCost.toFixed(0)}</td>
                                                <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">৳{user.deductedAmount.toFixed(0)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    {user.pendingAmount > 0 ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400">৳{user.pendingAmount.toFixed(0)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-bold bg-gray-100 dark:bg-gray-700">
                                            <td className="py-3 px-4 dark:text-gray-200" colSpan="3">মোট</td>
                                            <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">৳{totals.totalCost.toFixed(0)}</td>
                                            <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">৳{totals.totalDeducted.toFixed(0)}</td>
                                            <td className="py-3 px-4 text-right text-yellow-600 dark:text-yellow-400">৳{totals.totalPending.toFixed(0)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Print Footer */}
                <div className="hidden print:block text-center mt-8 pt-4 border-t text-sm text-gray-500">
                    <p>তৈরি: {format(new Date(), 'dd MMMM yyyy, hh:mm a', { locale: bn })}</p>
                </div>
            </div>
        </div>
    );
};

export default BreakfastReport;
