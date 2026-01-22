import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mealService, holidayService, monthSettingsService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isFriday, isSaturday, addMonths, subMonths } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX } from 'react-icons/fi';

const MealCalendar = () => {
    const { user, isManager } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [mealStatus, setMealStatus] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [monthSettings, setMonthSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        loadMonthData();
    }, [currentMonth]);

    const loadMonthData = async () => {
        setLoading(true);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            const [statusRes, holidaysRes, settingsRes] = await Promise.all([
                mealService.getMealStatus(startDate, endDate),
                holidayService.getHolidays(year, month),
                monthSettingsService.getSettings(year, month)
            ]);

            setMealStatus(statusRes);
            setHolidays(holidaysRes);
            setMonthSettings(settingsRes);
        } catch (error) {
            console.error('Error loading month data:', error);
            toast.error('ডেটা লোড করতে সমস্যা হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMeal = async (date, currentStatus) => {
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
            await mealService.toggleMeal(date, !currentStatus);
            toast.success(currentStatus ? 'মিল অফ করা হয়েছে' : 'মিল অন করা হয়েছে');
            loadMonthData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'মিল পরিবর্তন করতে সমস্যা হয়েছে');
        } finally {
            setUpdating(null);
        }
    };

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getStatusForDate = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return mealStatus.find(s => s.date === dateStr);
    };

    const isHoliday = (date) => {
        return holidays.some(h => isSameDay(new Date(h.date), date));
    };

    const getHolidayName = (date) => {
        const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
        return holiday?.nameBn || '';
    };

    const isOddSaturday = (date) => {
        if (!isSaturday(date)) return false;
        const dayOfMonth = date.getDate();
        const saturdayNumber = Math.ceil(dayOfMonth / 7);
        return saturdayNumber % 2 === 1;
    };

    const canToggle = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mealDate = new Date(date);
        mealDate.setHours(0, 0, 0, 0);

        if (isManager) {
            return true; // Manager can toggle current month's meals
        }
        return mealDate > today; // Users can only toggle future dates
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">মিল ক্যালেন্ডার</h1>
            </div>

            {/* Month Navigation */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-semibold">
                        {format(currentMonth, 'MMMM yyyy', { locale: bn })}
                    </h2>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <FiChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Month Settings Info */}
                {monthSettings && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <p>মিল রেট: <span className="font-medium">৳{monthSettings.lunchRate || 0}</span></p>
                    </div>
                )}

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'].map(day => (
                        <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
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
                    {days.map(day => {
                        const status = getStatusForDate(day);
                        const isOn = status?.isOn ?? !status?.isDefaultOff;
                        const holiday = isHoliday(day);
                        const oddSat = isOddSaturday(day);
                        const friday = isFriday(day);
                        const isUpdatingThis = updating === format(day, 'yyyy-MM-dd');
                        const canToggleThis = canToggle(day);
                        const today = new Date();
                        const isToday = isSameDay(day, today);
                        const isPast = day < today && !isToday;

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => canToggleThis && handleToggleMeal(format(day, 'yyyy-MM-dd'), isOn)}
                                disabled={!canToggleThis || isUpdatingThis}
                                className={`aspect-square p-1 rounded-lg border-2 transition-all relative ${isOn
                                        ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                        : 'bg-red-100 border-red-300 hover:bg-red-200'
                                    } ${holiday ? 'ring-2 ring-yellow-400' : ''
                                    } ${!canToggleThis ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                    } ${isToday ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                                    }`}
                                title={holiday ? getHolidayName(day) : friday ? 'শুক্রবার' : oddSat ? 'বিজোড় শনিবার' : ''}
                            >
                                <div className="flex flex-col items-center justify-center h-full">
                                    <span className={`text-sm font-medium ${isPast ? 'text-gray-400' : ''}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {isUpdatingThis ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600 mt-1" />
                                    ) : (
                                        <span className="mt-1">
                                            {isOn ? (
                                                <FiCheck className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <FiX className="w-4 h-4 text-red-600" />
                                            )}
                                        </span>
                                    )}
                                    {status?.count > 1 && (
                                        <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                            {status.count}
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
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
                        <span>মিল অন</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
                        <span>মিল অফ</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 ring-2 ring-yellow-400 rounded" />
                        <span>সরকারি ছুটি</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 ring-2 ring-primary-500 ring-offset-2 rounded" />
                        <span>আজ</span>
                    </div>
                </div>
            </div>

            {/* Holidays List */}
            {holidays.length > 0 && (
                <div className="card">
                    <h3 className="font-semibold mb-3">এই মাসের ছুটি</h3>
                    <ul className="space-y-2">
                        {holidays.map(holiday => (
                            <li key={holiday._id} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500">
                                    {format(new Date(holiday.date), 'dd MMMM', { locale: bn })}
                                </span>
                                <span className="text-gray-700">-</span>
                                <span className="font-medium">{holiday.nameBn}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MealCalendar;
