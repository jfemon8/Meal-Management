import React, { useState, useEffect, useRef } from 'react';
import { reportService } from '../../services/mealService';
import { format, subMonths, addMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiPrinter, FiDownload, FiAlertTriangle, FiFilter, FiMail, FiPhone, FiFile } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';

const DefaultersList = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(0);
    const [balanceType, setBalanceType] = useState('all');
    const [exporting, setExporting] = useState(false);
    const printRef = useRef();

    useEffect(() => {
        loadReport();
    }, [currentMonth, threshold, balanceType]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const response = await reportService.getDefaulters(year, month, threshold, balanceType);
            setReport(response);
        } catch (error) {
            console.error('Error loading report:', error);
            toast.error('রিপোর্ট লোড করতে সমস্যা হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `বকেয়া-তালিকা-${format(currentMonth, 'yyyy-MM')}`,
    });

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            await reportService.exportCSV(year, month, 'defaulters');
            toast.success('CSV ডাউনলোড হয়েছে');
        } catch (error) {
            toast.error('এক্সপোর্ট করতে সমস্যা হয়েছে');
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            await reportService.exportExcel(year, month, 'defaulters');
            toast.success('Excel ডাউনলোড হয়েছে');
        } catch (error) {
            toast.error('এক্সপোর্ট করতে সমস্যা হয়েছে');
        } finally {
            setExporting(false);
        }
    };

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const getBalanceTypeBn = (type) => {
        const types = { all: 'সব', breakfast: 'নাস্তা', lunch: 'দুপুর', dinner: 'রাত' };
        return types[type] || type;
    };

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
            <div className="flex items-center justify-between no-print flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">বকেয়া তালিকা</h1>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleExportCSV} disabled={exporting} className="btn btn-outline flex items-center gap-2">
                        <FiDownload />
                        CSV
                    </button>
                    <button onClick={handleExportExcel} disabled={exporting} className="btn btn-outline flex items-center gap-2">
                        <FiFile />
                        Excel
                    </button>
                    <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
                        <FiPrinter />
                        প্রিন্ট
                    </button>
                </div>
            </div>

            {/* Filters */}
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

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FiFilter className="text-gray-500" />
                            <select
                                value={balanceType}
                                onChange={(e) => setBalanceType(e.target.value)}
                                className="input py-2"
                            >
                                <option value="all">সব ব্যালেন্স</option>
                                <option value="breakfast">নাস্তা</option>
                                <option value="lunch">দুপুর</option>
                                <option value="dinner">রাত</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">থ্রেশহোল্ড:</span>
                            <input
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                                className="input py-2 w-24"
                                placeholder="0"
                                min="0"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">টাকা</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {report && (
                <div ref={printRef} className="space-y-6 print:p-4">
                    {/* Print Header */}
                    <div className="hidden print:block text-center mb-8">
                        <h1 className="text-2xl font-bold">মিল ম্যানেজমেন্ট সিস্টেম</h1>
                        <h2 className="text-xl mt-2">
                            বকেয়া তালিকা - {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            ফিল্টার: {getBalanceTypeBn(balanceType)} | থ্রেশহোল্ড: ৳{threshold}
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card bg-red-50 dark:bg-red-900/20 text-center">
                            <FiAlertTriangle className="w-8 h-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{report.summary.totalDefaulters}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">বকেয়াদার</p>
                        </div>
                        <div className="card bg-blue-50 dark:bg-blue-900/20 text-center">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{report.summary.totalUsers}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">মোট ইউজার</p>
                        </div>
                        <div className="card bg-yellow-50 dark:bg-yellow-900/20 text-center">
                            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">৳{report.summary.totalDueAmount.toFixed(0)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">মোট বকেয়া</p>
                        </div>
                        <div className="card bg-purple-50 dark:bg-purple-900/20 text-center">
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{report.summary.defaulterPercentage}%</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">বকেয়া হার</p>
                        </div>
                    </div>

                    {/* Defaulters Table */}
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4 dark:text-gray-100">বকেয়াদার তালিকা</h3>
                        {report.defaulters.length === 0 ? (
                            <div className="text-center py-12">
                                <FiAlertTriangle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                <p className="text-xl font-medium text-green-600 dark:text-green-400">কোনো বকেয়াদার নেই!</p>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">
                                    থ্রেশহোল্ড ৳{threshold} এর উপরে কোনো বকেয়া নেই
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 dark:bg-gray-700">
                                            <th className="text-left py-3 px-4 dark:text-gray-200">#</th>
                                            <th className="text-left py-3 px-4 dark:text-gray-200">নাম</th>
                                            <th className="text-left py-3 px-4 dark:text-gray-200">যোগাযোগ</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">নাস্তা বকেয়া</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">দুপুর বকেয়া</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">রাত বকেয়া</th>
                                            <th className="text-right py-3 px-4 dark:text-gray-200">মোট বকেয়া</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.defaulters.map((d, index) => (
                                            <tr key={d.user._id} className={`border-b dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                                                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                <td className="py-3 px-4 font-medium dark:text-gray-200">{d.user.name}</td>
                                                <td className="py-3 px-4">
                                                    <div className="text-xs space-y-1">
                                                        <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                            <FiMail className="w-3 h-3" />
                                                            {d.user.email}
                                                        </p>
                                                        {d.user.phone && (
                                                            <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                                <FiPhone className="w-3 h-3" />
                                                                {d.user.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {d.due.breakfast > 0 ? (
                                                        <span className="text-red-600 dark:text-red-400">৳{d.due.breakfast.toFixed(0)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {d.due.lunch > 0 ? (
                                                        <span className="text-red-600 dark:text-red-400">৳{d.due.lunch.toFixed(0)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {d.due.dinner > 0 ? (
                                                        <span className="text-red-600 dark:text-red-400">৳{d.due.dinner.toFixed(0)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">
                                                    ৳{d.due.total.toFixed(0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-bold bg-gray-100 dark:bg-gray-700">
                                            <td className="py-3 px-4 dark:text-gray-200" colSpan="3">মোট</td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                                                ৳{report.defaulters.reduce((sum, d) => sum + d.due.breakfast, 0).toFixed(0)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                                                ৳{report.defaulters.reduce((sum, d) => sum + d.due.lunch, 0).toFixed(0)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                                                ৳{report.defaulters.reduce((sum, d) => sum + d.due.dinner, 0).toFixed(0)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                                                ৳{report.summary.totalDueAmount.toFixed(0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Print Footer */}
                    <div className="hidden print:block text-center mt-8 pt-4 border-t text-sm text-gray-500">
                        <p>তৈরি: {format(new Date(), 'dd MMMM yyyy, hh:mm a', { locale: bn })}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DefaultersList;
