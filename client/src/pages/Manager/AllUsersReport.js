import React, { useState, useEffect, useRef } from 'react';
import { reportService } from '../../services/mealService';
import { format, subMonths, addMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiPrinter, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

const AllUsersReport = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        loadReport();
    }, [currentMonth]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const response = await reportService.getAllUsersReport(year, month);
            setReport(response);
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `সব-ইউজার-রিপোর্ট-${format(currentMonth, 'yyyy-MM')}`,
    });

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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
                <h1 className="text-2xl font-bold text-gray-800">সব ইউজারের রিপোর্ট</h1>
                <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
                    <FiPrinter />
                    প্রিন্ট করুন
                </button>
            </div>

            {/* Month Navigation */}
            <div className="card no-print">
                <div className="flex items-center justify-center gap-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-semibold">
                        {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                    </h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Report Content */}
            {report && (
                <div ref={printRef} className="space-y-6 print:p-4">
                    {/* Print Header */}
                    <div className="hidden print:block text-center mb-8">
                        <h1 className="text-2xl font-bold">মিল ম্যানেজমেন্ট সিস্টেম</h1>
                        <h2 className="text-xl mt-2">মাসিক রিপোর্ট (সকল ইউজার) - {format(currentMonth, 'MMMM yyyy', { locale: bn })}</h2>
                    </div>

                    {/* Period Info */}
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4">সময়কাল</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">শুরু</p>
                                <p className="font-medium">{format(new Date(report.period.startDate), 'dd MMM yyyy', { locale: bn })}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">শেষ</p>
                                <p className="font-medium">{format(new Date(report.period.endDate), 'dd MMM yyyy', { locale: bn })}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">মিল রেট</p>
                                <p className="font-medium">৳{report.period.lunchRate}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">মোট ইউজার</p>
                                <p className="font-medium">{report.summary.totalUsers} জন</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="card bg-blue-50">
                            <p className="text-3xl font-bold text-blue-600">{report.summary.grandTotalMeals}</p>
                            <p className="text-gray-600">মোট মিল সংখ্যা</p>
                        </div>
                        <div className="card bg-green-50">
                            <p className="text-3xl font-bold text-green-600">৳{report.summary.grandTotalCharge}</p>
                            <p className="text-gray-600">মোট চার্জ</p>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4">ইউজার-ভিত্তিক বিবরণ</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left py-3 px-4">নাম</th>
                                        <th className="text-left py-3 px-4">ইমেইল</th>
                                        <th className="text-right py-3 px-4">মোট মিল</th>
                                        <th className="text-right py-3 px-4">মোট চার্জ</th>
                                        <th className="text-right py-3 px-4">বর্তমান ব্যালেন্স</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.users.map((user, index) => (
                                        <tr key={user.user._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="py-3 px-4 font-medium">{user.user.name}</td>
                                            <td className="py-3 px-4 text-gray-500">{user.user.email}</td>
                                            <td className="py-3 px-4 text-right">{user.totalMeals}</td>
                                            <td className="py-3 px-4 text-right text-red-600">৳{user.totalCharge}</td>
                                            <td className={`py-3 px-4 text-right font-medium ${user.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                ৳{user.balance}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 font-bold bg-gray-100">
                                        <td className="py-3 px-4" colSpan="2">মোট</td>
                                        <td className="py-3 px-4 text-right">{report.summary.grandTotalMeals}</td>
                                        <td className="py-3 px-4 text-right text-red-600">৳{report.summary.grandTotalCharge}</td>
                                        <td className="py-3 px-4 text-right">
                                            ৳{report.users.reduce((sum, u) => sum + u.balance, 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
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

export default AllUsersReport;
