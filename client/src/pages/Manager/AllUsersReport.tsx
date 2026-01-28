import React, { useState, useEffect, useRef } from "react";
import { reportService } from "../../services/mealService";
import { subMonths, addMonths } from "date-fns";
import {
  formatMonthYear,
  formatDateISO,
  formatDateBn,
  formatDateTimeShort,
  nowBD,
} from "../../utils/dateUtils";
import {
  FiPrinter,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFile,
} from "react-icons/fi";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";

// ============================================
// Types
// ============================================

interface ReportUser {
  _id: string;
  name: string;
}

interface UserReportMealData {
  totalMeals: number;
}

interface DueAdvance {
  type: "due" | "advance" | "settled";
  amount: number;
}

interface UserReportData {
  user: ReportUser;
  lunch?: UserReportMealData;
  dinner?: UserReportMealData;
  totalMeals?: number;
  totalCharge: number;
  totalDueAdvance?: DueAdvance;
}

interface ReportPeriod {
  startDate: string;
  endDate: string;
  lunchRate: number;
}

interface MealSummary {
  grandTotalMeals: number;
}

interface DueAdvanceSummary {
  usersWithDue: number;
}

interface ReportSummary {
  totalUsers: number;
  lunch?: MealSummary;
  dinner?: MealSummary;
  grandTotalMeals?: number;
  grandTotalCharge: number;
  dueAdvanceSummary?: DueAdvanceSummary;
}

interface AllUsersReportData {
  period: ReportPeriod;
  summary: ReportSummary;
  users: UserReportData[];
}

// ============================================
// Component
// ============================================

const AllUsersReport: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(nowBD());
  const [report, setReport] = useState<AllUsersReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [currentMonth]);

  const loadReport = async (): Promise<void> => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await reportService.getAllUsersReport(year, month);
      // Transform the response to expected format
      setReport(response as unknown as AllUsersReportData);
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `সব-ইউজার-রিপোর্ট-${formatDateISO(currentMonth).slice(0, 7)}`,
  });

  const handleExportCSV = async (): Promise<void> => {
    setExporting(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      await reportService.exportCSV(year, month, "all-users");
      toast.success("CSV ডাউনলোড হয়েছে");
    } catch (error) {
      toast.error("এক্সপোর্ট করতে সমস্যা হয়েছে");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async (): Promise<void> => {
    setExporting(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      await reportService.exportExcel(year, month, "all-users");
      toast.success("Excel ডাউনলোড হয়েছে");
    } catch (error) {
      toast.error("এক্সপোর্ট করতে সমস্যা হয়েছে");
    } finally {
      setExporting(false);
    }
  };

  const prevMonth = (): void => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = (): void => setCurrentMonth(addMonths(currentMonth, 1));

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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          সব ইউজারের রিপোর্ট
        </h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="btn btn-outline flex items-center gap-2"
          >
            <FiDownload />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="btn btn-outline flex items-center gap-2"
          >
            <FiFile />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPrinter />
            প্রিন্ট
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="card no-print">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <FiChevronLeft className="w-6 h-6 dark:text-gray-300" />
          </button>
          <h2 className="text-xl font-semibold dark:text-gray-100">
            {formatMonthYear(currentMonth)}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
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
            <h2 className="text-xl mt-2">
              মাসিক রিপোর্ট (সকল ইউজার) - {formatMonthYear(currentMonth)}
            </h2>
          </div>

          {/* Period Info */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4 dark:text-gray-100">
              সময়কাল
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">শুরু</p>
                <p className="dark:text-gray-200">
                  {formatDateBn(report.period.startDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">শেষ</p>
                <p className="dark:text-gray-200">
                  {formatDateBn(report.period.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  দুপুর রেট
                </p>
                <p className="font-medium dark:text-gray-200">
                  ৳{report.period.lunchRate}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  মোট ইউজার
                </p>
                <p className="font-medium dark:text-gray-200">
                  {report.summary.totalUsers} জন
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-blue-50 dark:bg-blue-900/20 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {report.summary.lunch?.grandTotalMeals ||
                  report.summary.grandTotalMeals ||
                  0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                দুপুর মিল
              </p>
            </div>
            <div className="card bg-purple-50 dark:bg-purple-900/20 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {report.summary.dinner?.grandTotalMeals || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                রাত মিল
              </p>
            </div>
            <div className="card bg-green-50 dark:bg-green-900/20 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ৳{report.summary.grandTotalCharge}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                মোট চার্জ
              </p>
            </div>
            <div className="card bg-red-50 dark:bg-red-900/20 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {report.summary.dueAdvanceSummary?.usersWithDue || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                বকেয়াদার
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
                    <th className="text-left py-3 px-4 dark:text-gray-200">
                      নাম
                    </th>
                    <th className="text-center py-3 px-4 dark:text-gray-200">
                      দুপুর
                    </th>
                    <th className="text-center py-3 px-4 dark:text-gray-200">
                      রাত
                    </th>
                    <th className="text-right py-3 px-4 dark:text-gray-200">
                      মোট চার্জ
                    </th>
                    <th className="text-right py-3 px-4 dark:text-gray-200">
                      স্ট্যাটাস
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.users.map((user, index) => (
                    <tr
                      key={user.user._id}
                      className={`border-b dark:border-gray-700 ${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50 dark:bg-gray-750"
                      }`}
                    >
                      <td className="py-3 px-4 font-medium dark:text-gray-200">
                        {user.user.name}
                      </td>
                      <td className="py-3 px-4 text-center dark:text-gray-300">
                        {user.lunch?.totalMeals || user.totalMeals || 0}
                      </td>
                      <td className="py-3 px-4 text-center dark:text-gray-300">
                        {user.dinner?.totalMeals || 0}
                      </td>
                      <td className="py-3 px-4 text-right dark:text-gray-300">
                        ৳{user.totalCharge}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.totalDueAdvance?.type === "due" ? (
                          <span className="text-red-600 dark:text-red-400">
                            ৳{user.totalDueAdvance.amount} বাকি
                          </span>
                        ) : user.totalDueAdvance?.type === "advance" ? (
                          <span className="text-green-600 dark:text-green-400">
                            ৳{user.totalDueAdvance.amount} অগ্রিম
                          </span>
                        ) : (
                          <span className="text-gray-500">সেটেলড</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold bg-gray-100 dark:bg-gray-700">
                    <td className="py-3 px-4 dark:text-gray-200">মোট</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">
                      {report.summary.lunch?.grandTotalMeals ||
                        report.summary.grandTotalMeals ||
                        0}
                    </td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">
                      {report.summary.dinner?.grandTotalMeals || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      ৳{report.summary.grandTotalCharge}
                    </td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block text-center mt-8 pt-4 border-t text-sm text-gray-500">
            <p>তৈরি: {formatDateTimeShort(nowBD())}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsersReport;
