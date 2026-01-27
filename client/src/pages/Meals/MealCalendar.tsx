import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mealService, holidayService, monthSettingsService } from '../../services/mealService';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isFriday,
  isSaturday,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX, FiLock, FiCalendar, FiClock } from 'react-icons/fi';

// ============================================
// Types
// ============================================

type MealType = 'lunch' | 'dinner';

interface MealStatus {
  date: string;
  isOn: boolean;
  count: number;
  isDefaultOff?: boolean;
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
  nameBn: string;
}

interface MonthSettings {
  lunchRate: number;
  dinnerRate: number;
  isFinalized?: boolean;
}

// ============================================
// Component
// ============================================

const MealCalendar: React.FC = () => {
  const { user, isManager } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealStatus, setMealStatus] = useState<MealStatus[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [monthSettings, setMonthSettings] = useState<MonthSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Bulk toggle state
  const [showBulkToggle, setShowBulkToggle] = useState<boolean>(false);
  const [bulkStartDate, setBulkStartDate] = useState<string>('');
  const [bulkEndDate, setBulkEndDate] = useState<string>('');
  const [bulkAction, setBulkAction] = useState<string>('on');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  useEffect(() => {
    loadMonthData();
  }, [currentMonth, mealType]);

  // Set default bulk dates when month changes
  useEffect(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const monthEnd = endOfMonth(currentMonth);

    setBulkStartDate(
      format(tomorrow > startOfMonth(currentMonth) ? tomorrow : startOfMonth(currentMonth), 'yyyy-MM-dd')
    );
    setBulkEndDate(format(monthEnd, 'yyyy-MM-dd'));
  }, [currentMonth]);

  const loadMonthData = async (): Promise<void> => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDateStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const [statusRes, holidaysRes, settingsRes] = await Promise.all([
        mealService.getMealStatus(startDate, endDateStr, null, mealType),
        holidayService.getHolidays(year, month),
        monthSettingsService.getSettings(year, month),
      ]);

      const statusData = statusRes as { meals?: MealStatus[] } | MealStatus[];
      setMealStatus((statusData as { meals?: MealStatus[] }).meals || (statusData as MealStatus[]));
      setHolidays(holidaysRes as Holiday[]);
      setMonthSettings(settingsRes as MonthSettings);
    } catch (error) {
      console.error('Error loading month data:', error);
      toast.error('ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMeal = async (date: string, currentStatus: boolean): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mealDate = new Date(date);
    mealDate.setHours(0, 0, 0, 0);

    // Check if user can toggle this date
    if (!isManager && mealDate <= today) {
      toast.error('শুধুমাত্র ভবিষ্যতের মিল পরিবর্তন করতে পারবেন');
      return;
    }

    setUpdating(date);
    try {
      await mealService.toggleMeal(date, !currentStatus, null, 1, mealType);
      const mealTypeBn = mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      toast.success(currentStatus ? `${mealTypeBn} অফ করা হয়েছে` : `${mealTypeBn} অন করা হয়েছে`);
      loadMonthData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'মিল পরিবর্তন করতে সমস্যা হয়েছে');
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkToggle = async (): Promise<void> => {
    if (!bulkStartDate || !bulkEndDate) {
      toast.error('শুরু এবং শেষ তারিখ সিলেক্ট করুন');
      return;
    }

    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);

    if (start > end) {
      toast.error('শুরুর তারিখ শেষ তারিখের আগে হতে হবে');
      return;
    }

    setBulkLoading(true);
    try {
      const result = (await mealService.bulkToggle(
        bulkStartDate,
        bulkEndDate,
        bulkAction === 'on',
        mealType
      )) as unknown as { message: string };
      toast.success(result.message);
      setShowBulkToggle(false);
      loadMonthData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'বাল্ক আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setBulkLoading(false);
    }
  };

  const prevMonth = (): void => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = (): void => setCurrentMonth(addMonths(currentMonth, 1));

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStatusForDate = (date: Date): MealStatus | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mealStatus.find((s) => s.date === dateStr);
  };

  const isHoliday = (date: Date): boolean => {
    return holidays.some((h) => isSameDay(new Date(h.date), date));
  };

  const getHolidayName = (date: Date): string => {
    const holiday = holidays.find((h) => isSameDay(new Date(h.date), date));
    return holiday?.nameBn || '';
  };

  const isOddSaturday = (date: Date): boolean => {
    if (!isSaturday(date)) return false;
    const dayOfMonth = date.getDate();
    const saturdayNumber = Math.ceil(dayOfMonth / 7);
    return saturdayNumber % 2 === 1;
  };

  const canToggle = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mealDate = new Date(date);
    mealDate.setHours(0, 0, 0, 0);

    if (isManager) {
      return true; // Manager can toggle current month's meals
    }
    return mealDate > today; // Users can only toggle future dates
  };

  const getLockReason = (date: Date): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mealDate = new Date(date);
    mealDate.setHours(0, 0, 0, 0);

    if (mealDate < today) return 'অতীতের তারিখ';
    if (isSameDay(mealDate, today)) return 'আজকের তারিখ';
    return null;
  };

  // Get first day of month for calendar offset
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentRate = mealType === 'lunch' ? monthSettings?.lunchRate || 0 : monthSettings?.dinnerRate || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">মিল ক্যালেন্ডার</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/meals/history"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FiClock className="w-4 h-4" />
            ইতিহাস
          </Link>
          <button
            onClick={() => setShowBulkToggle(!showBulkToggle)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiCalendar className="w-4 h-4" />
            বাল্ক অন/অফ
          </button>
        </div>
      </div>

      {/* Bulk Toggle Panel */}
      {showBulkToggle && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-4 text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <FiCalendar className="w-5 h-5" />
            তারিখ রেঞ্জে বাল্ক অন/অফ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                শুরুর তারিখ
              </label>
              <input
                type="date"
                value={bulkStartDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBulkStartDate(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                শেষ তারিখ
              </label>
              <input
                type="date"
                value={bulkEndDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBulkEndDate(e.target.value)}
                min={bulkStartDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                অ্যাকশন
              </label>
              <select
                value={bulkAction}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setBulkAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="on">সব অন করুন</option>
                <option value="off">সব অফ করুন</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleBulkToggle}
                disabled={bulkLoading}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  bulkAction === 'on' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {bulkLoading ? 'প্রসেসিং...' : 'আপডেট করুন'}
              </button>
              <button
                onClick={() => setShowBulkToggle(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                বাতিল
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">
            * শুধুমাত্র ভবিষ্যতের তারিখ পরিবর্তন হবে। সর্বোচ্চ ৩১ দিনের রেঞ্জ সিলেক্ট করতে পারবেন।
          </p>
        </div>
      )}

      {/* Meal Type Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setMealType('lunch')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            mealType === 'lunch'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          🍛 দুপুরের খাবার
        </button>
        <button
          onClick={() => setMealType('dinner')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            mealType === 'dinner'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          🍽️ রাতের খাবার
        </button>
      </div>

      {/* Month Navigation */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <FiChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: bn })}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <FiChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Month Stats */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {mealStatus.filter((s) => s.isOn).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">মিল অন</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {mealStatus.filter((s) => !s.isOn).length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">মিল অফ</p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{holidays.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">সরকারি ছুটি</p>
          </div>
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">৳{currentRate}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {mealType === 'lunch' ? 'দুপুর' : 'রাত'} রেট
            </p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'].map((day) => (
            <div key={day} className="text-center py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const status = getStatusForDate(day);
            const isOn = status?.isOn ?? !status?.isDefaultOff;
            const holiday = isHoliday(day);
            const oddSat = isOddSaturday(day);
            const friday = isFriday(day);
            const isAutoOff = holiday || friday || oddSat; // Auto OFF days
            const isUpdatingThis = updating === format(day, 'yyyy-MM-dd');
            const canToggleThis = canToggle(day);
            const today = new Date();
            const isToday = isSameDay(day, today);
            const isPast = day < today && !isToday;
            const lockReason = !isManager ? getLockReason(day) : null;

            // Determine cell style based on status
            const getCellStyle = (): string => {
              if (isAutoOff && !isOn) {
                // Grey for auto-OFF (holiday/Friday/odd Saturday)
                return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
              } else if (isOn) {
                return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50';
              } else {
                return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50';
              }
            };

            return (
              <button
                key={day.toISOString()}
                onClick={() => canToggleThis && handleToggleMeal(format(day, 'yyyy-MM-dd'), isOn)}
                disabled={!canToggleThis || isUpdatingThis}
                className={`aspect-square p-1 rounded-lg border-2 transition-all relative ${getCellStyle()} ${
                  holiday ? 'ring-2 ring-yellow-400' : ''
                } ${!canToggleThis ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
                  isToday ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800' : ''
                }`}
                title={
                  lockReason || (holiday ? getHolidayName(day) : friday ? 'শুক্রবার' : oddSat ? 'বিজোড় শনিবার' : '')
                }
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span
                    className={`text-sm font-medium ${isPast ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-200'}`}
                  >
                    {format(day, 'd')}
                  </span>
                  {isUpdatingThis ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600 mt-1" />
                  ) : (
                    <span className="mt-1">
                      {isOn ? (
                        <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <FiX className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </span>
                  )}
                  {status && status.count > 1 && (
                    <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {status.count}
                    </span>
                  )}
                  {/* Lock indicator for past/today dates */}
                  {!isManager && lockReason && (
                    <span className="absolute bottom-0 right-0 p-0.5">
                      <FiLock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded" />
            <span className="dark:text-gray-300">মিল অন</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded" />
            <span className="dark:text-gray-300">মিল অফ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded" />
            <span className="dark:text-gray-300">অটো অফ (শুক্র/বিজোড় শনি)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 ring-2 ring-yellow-400 rounded" />
            <span className="dark:text-gray-300">সরকারি ছুটি</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800 rounded" />
            <span className="dark:text-gray-300">আজ</span>
          </div>
          <div className="flex items-center gap-2">
            <FiLock className="w-4 h-4 text-gray-500" />
            <span className="dark:text-gray-300">লক (অতীত/আজ)</span>
          </div>
        </div>
      </div>

      {/* Holidays List */}
      {holidays.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 dark:text-gray-100">এই মাসের ছুটি</h3>
          <ul className="space-y-2">
            {holidays.map((holiday) => (
              <li key={holiday._id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {format(new Date(holiday.date), 'dd MMMM', { locale: bn })}
                </span>
                <span className="text-gray-700 dark:text-gray-400">-</span>
                <span className="font-medium dark:text-gray-200">{holiday.nameBn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MealCalendar;
