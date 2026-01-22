import React, { useState, useEffect } from 'react';
import { mealService, userService } from '../../services/mealService';
import toast from 'react-hot-toast';
import { format, addDays, subDays } from 'date-fns';
import { bn } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiCheck, FiX, FiUsers } from 'react-icons/fi';

const DailyMeals = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dailyData, setDailyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        loadDailyMeals();
    }, [currentDate]);

    const loadDailyMeals = async () => {
        setLoading(true);
        try {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const response = await mealService.getDailyMeals(dateStr);
            setDailyData(response);
        } catch (error) {
            console.error('Error loading daily meals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMeal = async (userId, currentStatus) => {
        setUpdating(userId);
        try {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            await mealService.toggleMeal(dateStr, !currentStatus, userId);
            toast.success(currentStatus ? 'মিল অফ হয়েছে' : 'মিল অন হয়েছে');
            loadDailyMeals();
        } catch (error) {
            toast.error(error.response?.data?.message || 'পরিবর্তন করতে সমস্যা হয়েছে');
        } finally {
            setUpdating(null);
        }
    };

    const handleUpdateCount = async (userId, count) => {
        try {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            await mealService.updateMealCount(dateStr, userId, parseInt(count));
            toast.success('মিল সংখ্যা আপডেট হয়েছে');
            loadDailyMeals();
        } catch (error) {
            toast.error(error.response?.data?.message || 'আপডেট করতে সমস্যা হয়েছে');
        }
    };

    const prevDay = () => setCurrentDate(subDays(currentDate, 1));
    const nextDay = () => setCurrentDate(addDays(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">দৈনিক মিল</h1>

            {/* Date Navigation */}
            <div className="card">
                <div className="flex items-center justify-between">
                    <button onClick={prevDay} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold">
                            {format(currentDate, 'EEEE, dd MMMM yyyy', { locale: bn })}
                        </h2>
                        <button onClick={goToToday} className="text-sm text-primary-600 hover:underline">
                            আজকে যান
                        </button>
                    </div>
                    <button onClick={nextDay} className="p-2 hover:bg-gray-100 rounded-lg">
                        <FiChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Day Info */}
                {dailyData && (
                    <div className="mt-4 flex flex-wrap gap-4 justify-center">
                        {dailyData.isHoliday && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                                🎉 {dailyData.holidayName}
                            </span>
                        )}
                        {dailyData.isDefaultOff && !dailyData.isHoliday && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                ছুটির দিন
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Summary */}
            {dailyData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-primary-600">{dailyData.totalMealsOn}</p>
                        <p className="text-sm text-gray-500">মিল অন</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-red-600">
                            {dailyData.meals?.length - dailyData.totalMealsOn}
                        </p>
                        <p className="text-sm text-gray-500">মিল অফ</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-blue-600">{dailyData.totalMealCount}</p>
                        <p className="text-sm text-gray-500">মোট মিল সংখ্যা</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-gray-600">{dailyData.meals?.length}</p>
                        <p className="text-sm text-gray-500">মোট ইউজার</p>
                    </div>
                </div>
            )}

            {/* Meals List */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiUsers className="text-primary-600" />
                    সকল ইউজারের মিল স্ট্যাটাস
                </h2>

                <div className="space-y-3">
                    {dailyData?.meals?.map(meal => (
                        <div
                            key={meal.user._id}
                            className={`p-4 rounded-lg border-2 flex items-center justify-between ${meal.isOn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}
                        >
                            <div>
                                <p className="font-medium">{meal.user.name}</p>
                                <p className="text-sm text-gray-500">{meal.user.email}</p>
                                {meal.isManuallySet && (
                                    <span className="text-xs text-gray-400">ম্যানুয়ালি সেট</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Meal Count */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">সংখ্যা:</span>
                                    <input
                                        type="number"
                                        value={meal.count}
                                        onChange={(e) => handleUpdateCount(meal.user._id, e.target.value)}
                                        className="w-16 px-2 py-1 border rounded text-center"
                                        min="0"
                                        max="10"
                                    />
                                </div>

                                {/* Toggle Button */}
                                <button
                                    onClick={() => handleToggleMeal(meal.user._id, meal.isOn)}
                                    disabled={updating === meal.user._id}
                                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${meal.isOn
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                >
                                    {updating === meal.user._id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current" />
                                    ) : meal.isOn ? (
                                        <>
                                            <FiX className="w-4 h-4" />
                                            অফ করুন
                                        </>
                                    ) : (
                                        <>
                                            <FiCheck className="w-4 h-4" />
                                            অন করুন
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DailyMeals;
