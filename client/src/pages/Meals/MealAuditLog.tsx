import React, { useState, useEffect, type ChangeEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mealService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import { formatDateBn, formatDateTimeShort, nowBD } from '../../utils/dateUtils';
import {
  FiClock,
  FiUser,
  FiCalendar,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import type { UserRole } from '../../types';

// ============================================
// Types
// ============================================

type MealType = 'lunch' | 'dinner';

type AuditAction =
  | 'toggle_on'
  | 'toggle_off'
  | 'bulk_on'
  | 'bulk_off'
  | 'count_update'
  | 'manager_override';

interface MealState {
  isOn: boolean;
  count: number;
}

interface AuditUser {
  _id: string;
  name: string;
}

interface AuditLog {
  _id: string;
  user?: AuditUser;
  date: string;
  mealType: MealType;
  action: AuditAction;
  previousState?: MealState;
  newState?: MealState;
  changedBy?: AuditUser;
  changedByRole: UserRole;
  notes?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    totalPages: number;
    total: number;
  };
}

interface Badge {
  text: string;
  class: string;
}

// ============================================
// Component
// ============================================

const MealAuditLog: React.FC = () => {
  const { isManager } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [startDate, setStartDate] = useState<string>(
    format(subDays(nowBD(), 30), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(format(nowBD(), 'yyyy-MM-dd'));
  const [mealType, setMealType] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    loadLogs();
  }, [pagination.page]);

  const loadLogs = async (): Promise<void> => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: pagination.page,
        limit: 20,
      };

      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (mealType) {
        params.mealType = mealType;
      }

      const response = (await mealService.getAuditLog(params)) as unknown as AuditLogResponse;
      setLogs(response.logs);
      setPagination((prev) => ({
        ...prev,
        totalPages: response.pagination.totalPages,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('অডিট লগ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (): void => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadLogs();
  };

  const getActionBadge = (action: string): Badge => {
    const badges: Record<string, Badge> = {
      toggle_on: {
        text: 'অন',
        class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      },
      toggle_off: {
        text: 'অফ',
        class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
      bulk_on: {
        text: 'বাল্ক অন',
        class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      },
      bulk_off: {
        text: 'বাল্ক অফ',
        class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
      count_update: {
        text: 'সংখ্যা আপডেট',
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      },
      manager_override: {
        text: 'ম্যানেজার ওভাররাইড',
        class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      },
    };
    return (
      badges[action] || {
        text: action,
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      }
    );
  };

  const getMealTypeBadge = (type: MealType): Badge => {
    if (type === 'lunch') {
      return {
        text: '🍛 দুপুর',
        class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      };
    }
    return {
      text: '🍽️ রাত',
      class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
  };

  const getRoleBadge = (role: UserRole): Badge => {
    const roles: Record<UserRole, Badge> = {
      user: {
        text: 'ইউজার',
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      manager: {
        text: 'ম্যানেজার',
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      },
      admin: {
        text: 'এডমিন',
        class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      },
      superadmin: {
        text: 'সুপার এডমিন',
        class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
    };
    return roles[role] || roles.user;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FiClock className="w-6 h-6" />
          মিল পরিবর্তনের ইতিহাস
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <FiFilter className="w-4 h-4" />
          ফিল্টার
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                শুরুর তারিখ
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                শেষ তারিখ
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                মিল টাইপ
              </label>
              <select
                value={mealType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setMealType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">সব</option>
                <option value="lunch">দুপুরের খাবার</option>
                <option value="dinner">রাতের খাবার</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                ফিল্টার করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        মোট {pagination.total}টি এন্ট্রি পাওয়া গেছে
      </div>

      {/* Audit Log List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            কোনো অডিট লগ পাওয়া যায়নি
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const actionBadge = getActionBadge(log.action);
              const mealBadge = getMealTypeBadge(log.mealType);
              const roleBadge = getRoleBadge(log.changedByRole);

              return (
                <div
                  key={log._id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      {/* Target user and date */}
                      <div className="flex items-center gap-2 text-sm">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <span className="font-medium dark:text-gray-200">
                          {log.user?.name || 'Unknown User'}
                        </span>
                        <span className="text-gray-400">|</span>
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span className="dark:text-gray-300">
                          {formatDateBn(new Date(log.date))}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${mealBadge.class}`}
                        >
                          {mealBadge.text}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${actionBadge.class}`}
                        >
                          {actionBadge.text}
                        </span>
                      </div>

                      {/* State change */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {log.previousState && (
                          <span>
                            {log.previousState.isOn ? 'অন' : 'অফ'}
                            {log.previousState.count > 1 && ` (${log.previousState.count})`}
                          </span>
                        )}
                        <span className="mx-2">→</span>
                        {log.newState && (
                          <span className="font-medium">
                            {log.newState.isOn ? 'অন' : 'অফ'}
                            {log.newState.count > 1 && ` (${log.newState.count})`}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    {/* Changed by info */}
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="text-gray-600 dark:text-gray-400">পরিবর্তনকারী:</span>
                        <span className="font-medium dark:text-gray-200">
                          {log.changedBy?.name || 'Unknown'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBadge.class}`}
                      >
                        {roleBadge.text}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDateTimeShort(new Date(log.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <FiChevronLeft className="w-4 h-4" />
              আগে
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              পৃষ্ঠা {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              পরে
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealAuditLog;
