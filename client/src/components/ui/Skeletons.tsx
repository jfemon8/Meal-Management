import React from 'react';
import { Skeleton } from './skeleton';

/**
 * Specialized skeleton loaders for common UI patterns
 */

// Table skeleton loader
export const TableSkeleton = ({
    rows = 5,
    columns = 4,
    showHeader = true
}: {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
}) => {
    return (
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {showHeader && (
                <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex gap-4">
                        {Array(columns).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-4 flex-1 bg-gray-200 dark:bg-gray-700" />
                        ))}
                    </div>
                </div>
            )}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array(rows).fill(0).map((_, rowIndex) => (
                    <div key={rowIndex} className="p-4">
                        <div className="flex gap-4">
                            {Array(columns).fill(0).map((_, colIndex) => (
                                <Skeleton
                                    key={colIndex}
                                    className="h-4 flex-1 bg-gray-200 dark:bg-gray-700"
                                    style={{ animationDelay: `${rowIndex * 100}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Card skeleton loader
export const CardSkeleton = ({
    hasImage = false,
    lines = 3
}: {
    hasImage?: boolean;
    lines?: number;
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            {hasImage && (
                <Skeleton className="w-full h-48 mb-4 rounded-lg bg-gray-200 dark:bg-gray-700" />
            )}
            <Skeleton className="h-6 w-3/4 mb-4 bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2">
                {Array(lines).fill(0).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="h-4 bg-gray-200 dark:bg-gray-700"
                        style={{ width: `${100 - i * 10}%` }}
                    />
                ))}
            </div>
        </div>
    );
};

// Card grid skeleton
export const CardGridSkeleton = ({
    count = 6,
    columns = 3
}: {
    count?: number;
    columns?: number;
}) => {
    return (
        <div className={`grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`}>
            {Array(count).fill(0).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
};

// Stats card skeleton
export const StatsCardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <Skeleton className="h-4 w-1/2 mb-2 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-8 w-3/4 mb-2 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700" />
        </div>
    );
};

// Stats grid skeleton
export const StatsGridSkeleton = ({ count = 4 }: { count?: number }) => {
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array(count).fill(0).map((_, i) => (
                <StatsCardSkeleton key={i} />
            ))}
        </div>
    );
};

// List skeleton loader
export const ListSkeleton = ({
    items = 5,
    hasAvatar = false
}: {
    items?: number;
    hasAvatar?: boolean;
}) => {
    return (
        <div className="space-y-3">
            {Array(items).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {hasAvatar && (
                        <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    )}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Calendar skeleton loader for meal calendar
export const CalendarSkeleton = () => {
    const days = Array(35).fill(0); // 5 weeks x 7 days

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            {/* Month header */}
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'].map((day, i) => (
                    <div key={i} className="text-center">
                        <Skeleton className="h-4 w-full mx-auto bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((_, i) => (
                    <Skeleton
                        key={i}
                        className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-700"
                        style={{ animationDelay: `${i * 20}ms` }}
                    />
                ))}
            </div>
        </div>
    );
};

// Form skeleton loader
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => {
    return (
        <div className="space-y-4">
            {Array(fields).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
    );
};

// Profile skeleton loader
export const ProfileSkeleton = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-6">
                <Skeleton className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-40 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-5 w-32 bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Dashboard skeleton with stats and recent activity
export const DashboardSkeleton = () => {
    return (
        <div className="space-y-6">
            <StatsGridSkeleton count={4} />
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <CardSkeleton lines={5} />
                <CalendarSkeleton />
            </div>
        </div>
    );
};

// Transaction list skeleton
export const TransactionListSkeleton = ({ items = 10 }: { items?: number }) => {
    return (
        <div className="space-y-2">
            {Array(items).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-700" />
                            <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <Skeleton className="h-5 w-20 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-16 bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Notification skeleton
export const NotificationSkeleton = ({ items = 5 }: { items?: number }) => {
    return (
        <div className="space-y-2">
            {Array(items).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-full bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-20 bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Page header skeleton
export const PageHeaderSkeleton = () => {
    return (
        <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-4 w-72 bg-gray-200 dark:bg-gray-700" />
        </div>
    );
};

// Full page loading skeleton
export const PageSkeleton = ({ type = 'default' }: { type?: 'default' | 'table' | 'form' | 'dashboard' }) => {
    return (
        <div className="p-6">
            <PageHeaderSkeleton />
            {type === 'table' && <TableSkeleton rows={10} columns={5} />}
            {type === 'form' && <FormSkeleton fields={6} />}
            {type === 'dashboard' && <DashboardSkeleton />}
            {type === 'default' && <CardGridSkeleton count={6} />}
        </div>
    );
};

export default {
    TableSkeleton,
    CardSkeleton,
    CardGridSkeleton,
    StatsCardSkeleton,
    StatsGridSkeleton,
    ListSkeleton,
    CalendarSkeleton,
    FormSkeleton,
    ProfileSkeleton,
    DashboardSkeleton,
    TransactionListSkeleton,
    NotificationSkeleton,
    PageHeaderSkeleton,
    PageSkeleton
};
