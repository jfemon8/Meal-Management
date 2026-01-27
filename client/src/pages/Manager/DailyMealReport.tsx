import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { reportService } from '../../services/mealService';
import { subDays, addDays } from 'date-fns';
import { formatDateISO, formatDateWithDay, formatDateBn, formatDateTimeShort, nowBD, getDayNameBn, toBDTime } from '../../utils/dateUtils';
import {
  FiChevronLeft,
  FiChevronRight,
  FiPrinter,
  FiUsers,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import type { MealType } from '../../types';

// ============================================
// Types
// ============================================

interface ReportUser {
  _id: string;
  name: string;
}

interface UserMealData {
  user: ReportUser;
  isOn: boolean;
  count: number;
  isManuallySet?: boolean;
}

interface ReportSummary {
  totalUsers: number;
  mealsOn: number;
  mealsOff: number;
  totalMealCount: number;
}

interface DailyReport {
  users: UserMealData[];
  summary: ReportSummary;
  isHoliday?: boolean;
  holidayName?: string;
  isDefaultOff?: boolean;
}

// ============================================
// Component
// ============================================

const DailyMealReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(nowBD());
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [selectedDate, mealType]);

  const loadReport = async (): Promise<void> => {
    setLoading(true);
    try {
      const dateStr = formatDateISO(selectedDate);
      const response = await reportService.getDailyReport(dateStr, mealType);
      setReport(response as DailyReport);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `দৈনিক-মিল-রিপোর্ট-${formatDateISO(selectedDate)}`,
  });

  const prevDay = (): void => setSelectedDate(subDays(selectedDate, 1));
  const nextDay = (): void => setSelectedDate(addDays(selectedDate, 1));

  const getMealTypeBn = (): string => (mealType === 'lunch' ? 'দুপুর' : 'রাত');

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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          দৈনিক মিল কাউন্ট
        </h1>
        <button
          onClick={handlePrint}
          className="btn btn-primary flex items-center gap-2"
        >
          <FiPrinter />
          প্রিন্ট
        </button>
      </div>

      {/* Filters */}
      <div className="card no-print">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={prevDay}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronLeft className="w-6 h-6 dark:text-gray-300" />
            </button>
            <div className="text-center">
              <input
                type="date"
                value={formatDateISO(selectedDate)}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSelectedDate(new Date(e.target.value))
                }
                className="input text-center"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {getDayNameBn(toBDTime(selectedDate).getDay())}
              </p>
            </div>
            <button
              onClick={nextDay}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiChevronRight className="w-6 h-6 dark:text-gray-300" />
            </button>
          </div>

          {/* Meal Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMealType('lunch')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mealType === 'lunch'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              দুপুর
            </button>
            <button
              onClick={() => setMealType('dinner')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mealType === 'dinner'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              রাত
            </button>
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
              দৈনিক {getMealTypeBn()} মিল রিপোর্ট -{' '}
              {formatDateBn(selectedDate)}
            </h2>
          </div>

          {/* Status Banner */}
          {(report.isHoliday || report.isDefaultOff) && (
            <div
              className={`card ${
                report.isHoliday
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              } border`}
            >
              <p
                className={`font-medium ${
                  report.isHoliday
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {report.isHoliday
                  ? `ছুটির দিন: ${report.holidayName}`
                  : 'ডিফল্ট অফ দিন (শুক্রবার/বিজোড় শনিবার)'}
              </p>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-blue-50 dark:bg-blue-900/20 text-center">
              <FiUsers className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {report.summary.totalUsers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">মোট ইউজার</p>
            </div>
            <div className="card bg-green-50 dark:bg-green-900/20 text-center">
              <FiCheck className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {report.summary.mealsOn}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">মিল অন</p>
            </div>
            <div className="card bg-red-50 dark:bg-red-900/20 text-center">
              <FiX className="w-8 h-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {report.summary.mealsOff}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">মিল অফ</p>
            </div>
            <div className="card bg-purple-50 dark:bg-purple-900/20 text-center">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {report.summary.totalMealCount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                মোট মিল সংখ্যা
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4 dark:text-gray-100">
              ইউজার-ভিত্তিক বিবরণ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="text-left py-3 px-4 dark:text-gray-200">#</th>
                    <th className="text-left py-3 px-4 dark:text-gray-200">নাম</th>
                    <th className="text-center py-3 px-4 dark:text-gray-200">
                      স্ট্যাটাস
                    </th>
                    <th className="text-center py-3 px-4 dark:text-gray-200">
                      সংখ্যা
                    </th>
                    <th className="text-center py-3 px-4 dark:text-gray-200">
                      ম্যানুয়াল
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.users.map((user, index) => (
                    <tr
                      key={user.user._id}
                      className={`border-b dark:border-gray-700 ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-750'
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-medium dark:text-gray-200">
                        {user.user.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.isOn
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {user.isOn ? (
                            <FiCheck className="w-3 h-3" />
                          ) : (
                            <FiX className="w-3 h-3" />
                          )}
                          {user.isOn ? 'অন' : 'অফ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium dark:text-gray-200">
                        {user.count > 1 ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            {user.count} (গেস্ট)
                          </span>
                        ) : (
                          user.count
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.isManuallySet ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            হ্যাঁ
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">ডিফল্ট</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold bg-gray-100 dark:bg-gray-700">
                    <td className="py-3 px-4 dark:text-gray-200" colSpan={3}>
                      মোট
                    </td>
                    <td className="py-3 px-4 text-center text-purple-600 dark:text-purple-400">
                      {report.summary.totalMealCount}
                    </td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block text-center mt-8 pt-4 border-t text-sm text-gray-500">
            <p>
              তৈরি: {formatDateTimeShort(nowBD())}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyMealReport;
