import React, { useState, useEffect, useRef } from 'react';
import { reportService } from '../../services/mealService';
import { subMonths, addMonths } from 'date-fns';
import { formatMonthYear, formatDateISO, formatDateBn, formatDateTimeShort, nowBD } from '../../utils/dateUtils';
import { FiPrinter, FiChevronLeft, FiChevronRight, FiDownload, FiLock } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';

// ============================================
// Types
// ============================================

interface UserBalances {
  breakfast: number | { amount?: number };
  lunch: number | { amount?: number };
  dinner: number | { amount?: number };
}

interface ReportUser {
  name: string;
  email: string;
  balances: UserBalances;
}

interface LunchData {
  totalMeals: number;
  daysOn: number;
  rate: number;
  totalCharge: number;
  dailyDetails: DailyDetail[];
}

interface DailyDetail {
  date: string;
  dayName: string;
  isOn: boolean;
  count: number;
  isHoliday?: boolean;
  holidayName?: string;
  isDefaultOff?: boolean;
}

interface BreakfastDetail {
  date: string;
  description?: string;
  myCost: number;
  deducted: boolean;
}

interface BreakfastData {
  totalCost: number;
  details: BreakfastDetail[];
}

interface Holiday {
  date: string;
  name: string;
}

interface Period {
  isFinalized?: boolean;
}

interface MonthlyReportData {
  user: ReportUser;
  lunch: LunchData;
  breakfast: BreakfastData;
  holidays: Holiday[];
  period?: Period;
}

// ============================================
// Component
// ============================================

const MonthlyReport: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(nowBD());
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [currentMonth]);

  const loadReport = async (): Promise<void> => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await reportService.getMonthlyReport(year, month);
      setReport(response as unknown as MonthlyReportData);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `মিল-রিপোর্ট-${formatDateISO(currentMonth).slice(0, 7)}`,
  });

  const handleDownloadPDF = async (): Promise<void> => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const element = printRef.current;
      const opt = {
        margin: 10,
        filename: `মিল-রিপোর্ট-${formatDateISO(currentMonth).slice(0, 7)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const prevMonth = (): void => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = (): void => setCurrentMonth(addMonths(currentMonth, 1));

  // Helper to safely get balance value
  const getBalanceValue = (balance: number | { amount?: number } | undefined): number => {
    if (typeof balance === 'number') return balance;
    if (balance && typeof balance === 'object' && 'amount' in balance) return balance.amount ?? 0;
    return 0;
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
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">মাসিক রিপোর্ট</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !report}
            className="btn btn-outline flex items-center gap-2"
          >
            <FiDownload />
            {downloading ? 'ডাউনলোড হচ্ছে...' : 'PDF'}
          </button>
          <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
            <FiPrinter />
            প্রিন্ট
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="card no-print">
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <FiChevronLeft className="w-6 h-6 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold dark:text-gray-100">
              {formatMonthYear(currentMonth)}
            </h2>
            {report?.period?.isFinalized && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                <FiLock className="w-3 h-3" />
                ফাইনালাইজড
              </span>
            )}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <FiChevronRight className="w-6 h-6 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Report Content */}
      {report && (
        <div ref={printRef} className="space-y-6 print:p-4">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-bold">মিল ম্যানেজমেন্ট সিস্টেম</h1>
            <h2 className="text-xl mt-2">মাসিক রিপোর্ট - {formatMonthYear(currentMonth)}</h2>
            <p className="text-gray-600 mt-1">
              {report.user.name} ({report.user.email})
            </p>
          </div>

          {/* Summary Cards */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">সারসংক্ষেপ</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{report.lunch.totalMeals}</p>
                <p className="text-sm text-gray-600">মোট মিল</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{report.lunch.daysOn}</p>
                <p className="text-sm text-gray-600">মিল অন দিন</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">৳{report.lunch.rate}</p>
                <p className="text-sm text-gray-600">মিল রেট</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">৳{report.lunch.totalCharge}</p>
                <p className="text-sm text-gray-600">মোট চার্জ</p>
              </div>
            </div>
          </div>

          {/* Balance Info */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">বর্তমান ব্যালেন্স</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-blue-600">
                  ৳{getBalanceValue(report.user.balances.breakfast)}
                </p>
                <p className="text-sm text-gray-600">নাস্তা</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-green-600">
                  ৳{getBalanceValue(report.user.balances.lunch)}
                </p>
                <p className="text-sm text-gray-600">দুপুর</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-purple-600">
                  ৳{getBalanceValue(report.user.balances.dinner)}
                </p>
                <p className="text-sm text-gray-600">রাত</p>
              </div>
            </div>
          </div>

          {/* Breakfast Summary */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">নাস্তার খরচ</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">৳{report.breakfast.totalCost}</p>
              <p className="text-sm text-gray-600">এই মাসে মোট নাস্তার খরচ</p>
            </div>

            {report.breakfast.details.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">তারিখ</th>
                      <th className="text-left py-2">বিবরণ</th>
                      <th className="text-right py-2">খরচ</th>
                      <th className="text-center py-2">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.breakfast.details.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{formatDateBn(item.date)}</td>
                        <td className="py-2">{item.description || '-'}</td>
                        <td className="py-2 text-right">৳{item.myCost}</td>
                        <td className="py-2 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              item.deducted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {item.deducted ? 'কাটা হয়েছে' : 'বাকি'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Meals Table */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">দুপুরের মিলের বিস্তারিত</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">তারিখ</th>
                    <th className="text-left py-2">দিন</th>
                    <th className="text-center py-2">স্ট্যাটাস</th>
                    <th className="text-center py-2">সংখ্যা</th>
                    <th className="text-left py-2">নোট</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lunch.dailyDetails.map((day, index) => (
                    <tr key={index} className={`border-b ${day.isHoliday ? 'bg-yellow-50' : ''}`}>
                      <td className="py-2">{formatDateBn(day.date)}</td>
                      <td className="py-2">{day.dayName}</td>
                      <td className="py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            day.isOn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {day.isOn ? 'অন' : 'অফ'}
                        </span>
                      </td>
                      <td className="py-2 text-center">{day.count}</td>
                      <td className="py-2 text-gray-500">
                        {day.isHoliday ? day.holidayName : day.isDefaultOff ? 'ছুটির দিন' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Holidays */}
          {report.holidays.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-lg mb-4">এই মাসের ছুটি</h3>
              <ul className="space-y-2">
                {report.holidays.map((holiday, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      {formatDateBn(holiday.date)}
                    </span>
                    <span className="text-gray-700">-</span>
                    <span className="font-medium">{holiday.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Print Footer */}
          <div className="hidden print:block text-center mt-8 pt-4 border-t text-sm text-gray-500">
            <p>তৈরি: {formatDateTimeShort(nowBD())}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
