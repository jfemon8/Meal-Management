import React, { useState, useEffect, type ChangeEvent } from 'react';
import { auditLogService } from '../../services/mealService';
import toast from 'react-hot-toast';
import {
  FiActivity,
  FiUser,
  FiCalendar,
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { formatDateTimeShort } from '../../utils/dateUtils';

// ============================================
// Types
// ============================================

type LogCategory =
  | 'auth'
  | 'user'
  | 'balance'
  | 'meal'
  | 'breakfast'
  | 'settings'
  | 'holiday'
  | 'report'
  | 'admin'
  | 'superadmin'
  | 'system';

interface Manager {
  _id: string;
  name: string;
  email?: string;
  isGroupManager?: boolean;
}

interface CategoryBreakdownItem {
  _id: LogCategory;
  count: number;
}

interface ActionBreakdownItem {
  _id: string;
  count: number;
}

interface ManagerSummaryItem {
  _id: string;
  name: string;
  email: string;
  isGroupManager?: boolean;
  totalActions: number;
  lastActivity: string;
  categoryCounts?: Record<string, number>;
}

interface SummaryStats {
  totalManagers: number;
  activeManagers: number;
  totalActions: number;
  period: string;
}

interface Summary {
  summary: SummaryStats;
  categoryBreakdown: CategoryBreakdownItem[];
  actionBreakdown: ActionBreakdownItem[];
  managers: ManagerSummaryItem[];
}

interface ActivityLogUser {
  _id: string;
  name: string;
  email: string;
}

interface ActivityLog {
  _id: string;
  user?: ActivityLogUser;
  action: string;
  category: LogCategory;
  description: string;
  createdAt: string;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  total: number;
  pages: number;
}

type ViewMode = 'summary' | 'logs';

// ============================================
// Component
// ============================================

const ManagerActivity: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dateRange, setDateRange] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedManager, setExpandedManager] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  useEffect(() => {
    loadManagers();
    loadSummary();
  }, []);

  useEffect(() => {
    if (viewMode === 'logs') {
      loadActivityLogs();
    }
  }, [viewMode, page, selectedManager, selectedCategory, startDate, endDate]);

  useEffect(() => {
    loadSummary();
  }, [dateRange, selectedManager]);

  const loadManagers = async (): Promise<void> => {
    try {
      const data = await auditLogService.getManagersList();
      setManagers(data as Manager[]);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const loadSummary = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await auditLogService.getManagersSummary(
        dateRange,
        selectedManager || undefined
      );
      setSummary(data as unknown as Summary);
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('সামারি লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page, limit: 50 };
      if (selectedManager) params.managerId = selectedManager;
      if (selectedCategory) params.category = selectedCategory;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = (await auditLogService.getManagersActivity(params)) as unknown as ActivityLogsResponse;
      setActivityLogs(data.logs);
      setTotalLogs(data.total);
      setTotalPages(data.pages);
    } catch (error) {
      console.error('Error loading activity:', error);
      toast.error('অ্যাক্টিভিটি লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: LogCategory): string => {
    const labels: Record<LogCategory, string> = {
      auth: 'অথেনটিকেশন',
      user: 'ইউজার',
      balance: 'ব্যালেন্স',
      meal: 'মিল',
      breakfast: 'নাস্তা',
      settings: 'সেটিংস',
      holiday: 'ছুটি',
      report: 'রিপোর্ট',
      admin: 'এডমিন',
      superadmin: 'সুপার এডমিন',
      system: 'সিস্টেম',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: LogCategory): string => {
    const colors: Record<LogCategory, string> = {
      auth: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      balance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      meal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      breakfast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      settings: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      holiday: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      report: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (date: string): string => {
    return formatDateTimeShort(new Date(date));
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          ম্যানেজার অ্যাক্টিভিটি
        </h1>
        <button
          onClick={() => {
            loadSummary();
            if (viewMode === 'logs') loadActivityLogs();
          }}
          className="btn btn-outline flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          রিফ্রেশ
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiTrendingUp className="inline w-4 h-4 mr-2" />
              সামারি
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'logs'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiActivity className="inline w-4 h-4 mr-2" />
              লগ
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedManager}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setSelectedManager(e.target.value);
                setPage(1);
              }}
              className="input py-2 text-sm min-w-[180px]"
            >
              <option value="">সকল ম্যানেজার</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} {m.isGroupManager && '(গ্রুপ)'}
                </option>
              ))}
            </select>

            {viewMode === 'summary' ? (
              <select
                value={dateRange}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setDateRange(parseInt(e.target.value))
                }
                className="input py-2 text-sm"
              >
                <option value={7}>গত ৭ দিন</option>
                <option value={15}>গত ১৫ দিন</option>
                <option value={30}>গত ৩০ দিন</option>
                <option value={60}>গত ৬০ দিন</option>
                <option value={90}>গত ৯০ দিন</option>
              </select>
            ) : (
              <>
                <select
                  value={selectedCategory}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="input py-2 text-sm"
                >
                  <option value="">সকল ক্যাটাগরি</option>
                  <option value="balance">ব্যালেন্স</option>
                  <option value="meal">মিল</option>
                  <option value="breakfast">নাস্তা</option>
                  <option value="user">ইউজার</option>
                  <option value="settings">সেটিংস</option>
                  <option value="report">রিপোর্ট</option>
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="input py-2 text-sm"
                  placeholder="শুরু তারিখ"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="input py-2 text-sm"
                  placeholder="শেষ তারিখ"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'summary' && summary && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">মোট ম্যানেজার</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {summary.summary.totalManagers}
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <FiActivity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">সক্রিয় ম্যানেজার</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {summary.summary.activeManagers}
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center">
                  <FiTrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">মোট অ্যাক্টিভিটি</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {summary.summary.totalActions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center">
                  <FiCalendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">সময়কাল</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {summary.summary.period}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">ক্যাটাগরি অনুযায়ী</h3>
              <div className="space-y-3">
                {summary.categoryBreakdown.map((item) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(item._id)}`}
                      >
                        {getCategoryLabel(item._id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / summary.summary.totalActions) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right dark:text-gray-300">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">শীর্ষ অ্যাকশন</h3>
              <div className="space-y-3">
                {summary.actionBreakdown.slice(0, 8).map((item) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item._id}</span>
                    <span className="text-sm font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-gray-300">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manager Activity Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
              ম্যানেজার ভিত্তিক অ্যাক্টিভিটি
            </h3>
            <div className="space-y-3">
              {summary.managers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  এই সময়ে কোন অ্যাক্টিভিটি নেই
                </p>
              ) : (
                summary.managers.map((manager) => (
                  <div key={manager._id} className="border dark:border-gray-700 rounded-lg">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() =>
                        setExpandedManager(expandedManager === manager._id ? null : manager._id)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2 dark:text-gray-100">
                            {manager.name}
                            {manager.isGroupManager && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                গ্রুপ ম্যানেজার
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {manager.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg dark:text-gray-100">
                            {manager.totalActions}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">অ্যাক্টিভিটি</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <FiClock className="inline w-4 h-4 mr-1" />
                            {formatDateTimeShort(new Date(manager.lastActivity))}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            শেষ অ্যাক্টিভিটি
                          </p>
                        </div>
                        {expandedManager === manager._id ? (
                          <FiChevronUp className="w-5 h-5 dark:text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedManager === manager._id && (
                      <div className="border-t dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          ক্যাটাগরি ভিত্তিক:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(manager.categoryCounts || {}).map(([cat, count]) => (
                            <span
                              key={cat}
                              className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(cat as LogCategory)}`}
                            >
                              {getCategoryLabel(cat as LogCategory)}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === 'logs' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-gray-100">অ্যাক্টিভিটি লগ</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">মোট: {totalLogs}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              কোন অ্যাক্টিভিটি পাওয়া যায়নি
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        ম্যানেজার
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        অ্যাকশন
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        ক্যাটাগরি
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        বিবরণ
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        সময়
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm dark:text-gray-200">
                              {log.user?.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {log.user?.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm dark:text-gray-300">{log.action}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(log.category)}`}
                          >
                            {getCategoryLabel(log.category)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                            {log.description}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(log.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn btn-outline py-1 px-3 disabled:opacity-50"
                  >
                    আগে
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    পৃষ্ঠা {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline py-1 px-3 disabled:opacity-50"
                  >
                    পরে
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerActivity;
