import api from './api';

export const mealService = {
    // Get meal status for date range
    getMealStatus: async (startDate, endDate, userId = null, mealType = 'lunch') => {
        const params = { startDate, endDate, mealType };
        if (userId) params.userId = userId;
        const response = await api.get('/meals/status', { params });
        return response.data;
    },

    // Toggle meal on/off
    toggleMeal: async (date, isOn, userId = null, count = 1, mealType = 'lunch') => {
        const data = { date, isOn, count, mealType };
        if (userId) data.userId = userId;
        const response = await api.put('/meals/toggle', data);
        return response.data;
    },

    // Update meal count (Manager+)
    updateMealCount: async (date, userId, count, notes = '', mealType = 'lunch') => {
        const response = await api.put('/meals/count', { date, userId, count, notes, mealType });
        return response.data;
    },

    // Get meal summary for a month
    getMealSummary: async (year, month, userId = null, mealType = 'lunch') => {
        const params = { year, month, mealType };
        if (userId) params.userId = userId;
        const response = await api.get('/meals/summary', { params });
        return response.data;
    },

    // Get daily meals for all users (Manager+)
    getDailyMeals: async (date, mealType = 'lunch') => {
        const response = await api.get('/meals/daily', { params: { date, mealType } });
        return response.data;
    },

    // Bulk toggle meals for date range
    bulkToggle: async (startDate, endDate, isOn, mealType = 'lunch', userId = null) => {
        const data = { startDate, endDate, isOn, mealType };
        if (userId) data.userId = userId;
        const response = await api.put('/meals/bulk-toggle', data);
        return response.data;
    },

    // Get meal audit log
    getAuditLog: async (params = {}) => {
        const response = await api.get('/meals/audit-log', { params });
        return response.data;
    },

    // Get audit log for specific user (Manager+)
    getUserAuditLog: async (userId, params = {}) => {
        const response = await api.get(`/meals/audit-log/${userId}`, { params });
        return response.data;
    },

    // Recalculate meals based on current rules (Manager+)
    recalculateMeals: async (year, month, mealType = 'lunch', userId = null) => {
        const data = { year, month, mealType };
        if (userId) data.userId = userId;
        const response = await api.post('/meals/recalculate', data);
        return response.data;
    },

    // Reset meals to default for date range (Admin+)
    resetToDefault: async (startDate, endDate, mealType = 'lunch', userId = null) => {
        const data = { startDate, endDate, mealType };
        if (userId) data.userId = userId;
        const response = await api.post('/meals/reset-to-default', data);
        return response.data;
    }
};

export const breakfastService = {
    // Get breakfast records
    getBreakfasts: async (startDate, endDate) => {
        const response = await api.get('/breakfast', { params: { startDate, endDate } });
        return response.data;
    },

    // Get user's breakfast records
    getUserBreakfasts: async (startDate, endDate) => {
        const response = await api.get('/breakfast/user', { params: { startDate, endDate } });
        return response.data;
    },

    // Submit breakfast cost with equal split (Manager+)
    submitBreakfast: async (date, totalCost, participants, description = '') => {
        const response = await api.post('/breakfast', { date, totalCost, participants, description });
        return response.data;
    },

    // Submit breakfast cost with individual amounts per user (Manager+)
    submitBreakfastIndividual: async (date, participantCosts, description = '') => {
        const response = await api.post('/breakfast', { date, participantCosts, description });
        return response.data;
    },

    // Deduct breakfast cost (Manager+)
    deductBreakfast: async (id) => {
        const response = await api.post(`/breakfast/${id}/deduct`);
        return response.data;
    },

    // Update breakfast with equal split (Manager+)
    updateBreakfast: async (id, data) => {
        const response = await api.put(`/breakfast/${id}`, data);
        return response.data;
    },

    // Update breakfast with individual costs (Manager+)
    updateBreakfastIndividual: async (id, participantCosts, description) => {
        const response = await api.put(`/breakfast/${id}`, { participantCosts, description });
        return response.data;
    },

    // Reverse finalized breakfast (refund) (Manager+)
    reverseBreakfast: async (id, reason) => {
        const response = await api.post(`/breakfast/${id}/reverse`, { reason });
        return response.data;
    },

    // Delete breakfast (Manager+)
    deleteBreakfast: async (id) => {
        const response = await api.delete(`/breakfast/${id}`);
        return response.data;
    }
};

export const userService = {
    // Get all users (Manager+)
    getAllUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },

    // Create new user (Admin+)
    createUser: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },

    // Get user by ID
    getUser: async (id) => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    // Update user profile
    updateUser: async (id, data) => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },

    // Update user role (Admin+)
    updateUserRole: async (id, role) => {
        const response = await api.put(`/users/${id}/role`, { role });
        return response.data;
    },

    // Update user balance (Manager+)
    updateBalance: async (id, amount, balanceType, type, description = '') => {
        const response = await api.put(`/users/${id}/balance`, { amount, balanceType, type, description });
        return response.data;
    },

    // Update user status (Admin+)
    updateUserStatus: async (id, isActive) => {
        const response = await api.put(`/users/${id}/status`, { isActive });
        return response.data;
    },

    // Delete user (SuperAdmin)
    deleteUser: async (id) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },

    // Reset user password (Admin+)
    resetPassword: async (id, newPassword, forceChangeOnLogin = true) => {
        const response = await api.post(`/users/${id}/reset-password`, { newPassword, forceChangeOnLogin });
        return response.data;
    }
};

export const monthSettingsService = {
    // Get month settings
    getSettings: async (year, month) => {
        const params = {};
        if (year && month) {
            params.year = year;
            params.month = month;
        }
        const response = await api.get('/month-settings', { params });
        return response.data;
    },

    // Get current month settings
    getCurrentSettings: async () => {
        const response = await api.get('/month-settings/current');
        return response.data;
    },

    // Create/Update month settings (Manager+)
    saveSettings: async (data) => {
        const response = await api.post('/month-settings', data);
        return response.data;
    },

    // Finalize month (Manager+)
    finalizeMonth: async (id) => {
        const response = await api.put(`/month-settings/${id}/finalize`);
        return response.data;
    },

    // Carry forward balance to next month (Manager+)
    carryForwardBalance: async (id) => {
        const response = await api.post(`/month-settings/${id}/carry-forward`);
        return response.data;
    },

    // Preview month calculation (Manager+)
    previewCalculation: async (id) => {
        const response = await api.get(`/month-settings/${id}/preview`);
        return response.data;
    }
};

export const holidayService = {
    // Get holidays
    getHolidays: async (year, month = null) => {
        const params = { year };
        if (month) params.month = month;
        const response = await api.get('/holidays', { params });
        return response.data;
    },

    // Add holiday (Admin+)
    addHoliday: async (data) => {
        const response = await api.post('/holidays', data);
        return response.data;
    },

    // Update holiday (Admin+)
    updateHoliday: async (id, data) => {
        const response = await api.put(`/holidays/${id}`, data);
        return response.data;
    },

    // Delete holiday (Admin+)
    deleteHoliday: async (id) => {
        const response = await api.delete(`/holidays/${id}`);
        return response.data;
    },

    // Seed default holidays (Admin+)
    seedHolidays: async (year) => {
        const response = await api.post('/holidays/seed', { year });
        return response.data;
    },

    // Sync holidays from API (Admin+)
    syncHolidays: async (year) => {
        const response = await api.post('/holidays/sync', { year });
        return response.data;
    },

    // Preview holidays from API (Admin+)
    previewHolidays: async (year) => {
        const response = await api.get(`/holidays/preview/${year}`);
        return response.data;
    }
};

export const transactionService = {
    // Get user's transactions
    getTransactions: async (params = {}) => {
        const response = await api.get('/transactions', { params });
        return response.data;
    },

    // Get transactions for a specific user (Manager+)
    getUserTransactions: async (userId, params = {}) => {
        const response = await api.get(`/transactions/user/${userId}`, { params });
        return response.data;
    },

    // Get all transactions (Manager+)
    getAllTransactions: async (params = {}) => {
        const response = await api.get('/transactions/all', { params });
        return response.data;
    },

    // Get single transaction (Manager+)
    getTransaction: async (transactionId) => {
        const response = await api.get(`/transactions/${transactionId}`);
        return response.data;
    },

    // Reverse a transaction (Manager+)
    reverseTransaction: async (transactionId, reason) => {
        const response = await api.post(`/transactions/${transactionId}/reverse`, { reason });
        return response.data;
    }
};

export const reportService = {
    // Get monthly report
    getMonthlyReport: async (year, month, userId = null) => {
        const params = { year, month };
        if (userId) params.userId = userId;
        const response = await api.get('/reports/monthly', { params });
        return response.data;
    },

    // Get all users report (Manager+)
    getAllUsersReport: async (year, month) => {
        const response = await api.get('/reports/all-users', { params: { year, month } });
        return response.data;
    },

    // Get daily report (Manager+)
    getDailyReport: async (date, mealType = 'lunch') => {
        const response = await api.get('/reports/daily', { params: { date, mealType } });
        return response.data;
    },

    // Get wallet summary
    getWalletSummary: async (userId = null) => {
        const params = {};
        if (userId) params.userId = userId;
        const response = await api.get('/reports/wallet-summary', { params });
        return response.data;
    },

    // Get top consumers (Manager+)
    getTopConsumers: async (year, month, mealType = 'all', limit = 10) => {
        const response = await api.get('/reports/top-consumers', {
            params: { year, month, mealType, limit }
        });
        return response.data;
    },

    // Get defaulters list (Manager+)
    getDefaulters: async (year, month, threshold = 0, balanceType = 'all') => {
        const response = await api.get('/reports/defaulters', {
            params: { year, month, threshold, balanceType }
        });
        return response.data;
    },

    // Export as CSV (Manager+)
    exportCSV: async (year, month, reportType = 'all-users') => {
        const response = await api.get('/reports/export/csv', {
            params: { year, month, reportType },
            responseType: 'blob'
        });
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report-${year}-${month}-${reportType}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Export as Excel (Manager+)
    exportExcel: async (year, month, reportType = 'all-users') => {
        const response = await api.get('/reports/export/excel', {
            params: { year, month, reportType },
            responseType: 'blob'
        });
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report-${year}-${month}-${reportType}.xls`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Export as JSON for PDF (Manager+)
    getExportData: async (year, month, reportType = 'all-users') => {
        const response = await api.get('/reports/export/json', {
            params: { year, month, reportType }
        });
        return response.data;
    },

    // Get user monthly report (printable format)
    getUserMonthlyReport: async (userId, year, month) => {
        const response = await api.get(`/reports/user/${userId}/monthly`, {
            params: { year, month }
        });
        return response.data;
    }
};

export const ruleOverrideService = {
    // Get all rule overrides (Manager+)
    getOverrides: async (params = {}) => {
        const response = await api.get('/rule-overrides', { params });
        return response.data;
    },

    // Check applicable overrides for a date/user
    checkOverrides: async (date, userId = null, mealType = 'lunch') => {
        const params = { date, mealType };
        if (userId) params.userId = userId;
        const response = await api.get('/rule-overrides/check', { params });
        return response.data;
    },

    // Get effective status with priority resolution
    getEffectiveStatus: async (date, userId = null, mealType = 'lunch') => {
        const params = { date, mealType };
        if (userId) params.userId = userId;
        const response = await api.get('/rule-overrides/effective-status', { params });
        return response.data;
    },

    // Create new override (Manager+)
    createOverride: async (data) => {
        const response = await api.post('/rule-overrides', data);
        return response.data;
    },

    // Update override
    updateOverride: async (id, data) => {
        const response = await api.put(`/rule-overrides/${id}`, data);
        return response.data;
    },

    // Delete override
    deleteOverride: async (id) => {
        const response = await api.delete(`/rule-overrides/${id}`);
        return response.data;
    },

    // Toggle override active status
    toggleOverride: async (id) => {
        const response = await api.post(`/rule-overrides/${id}/toggle`);
        return response.data;
    }
};

export const globalSettingsService = {
    // Get global settings
    getSettings: async () => {
        const response = await api.get('/global-settings');
        return response.data;
    },

    // Update global settings (Admin+)
    updateSettings: async (data) => {
        const response = await api.put('/global-settings', data);
        return response.data;
    },

    // Update default rates (Admin+)
    updateDefaultRates: async (lunch, dinner) => {
        const response = await api.put('/global-settings/default-rates', { lunch, dinner });
        return response.data;
    },

    // Update cutoff times (Admin+)
    updateCutoffTimes: async (lunch, dinner) => {
        const response = await api.put('/global-settings/cutoff-times', { lunch, dinner });
        return response.data;
    },

    // Update weekend policy (Admin+)
    updateWeekendPolicy: async (policy) => {
        const response = await api.put('/global-settings/weekend-policy', policy);
        return response.data;
    },

    // Update holiday policy (Admin+)
    updateHolidayPolicy: async (policy) => {
        const response = await api.put('/global-settings/holiday-policy', policy);
        return response.data;
    },

    // Update registration settings (Admin+)
    updateRegistration: async (settings) => {
        const response = await api.put('/global-settings/registration', settings);
        return response.data;
    },

    // Reset to defaults (Admin+)
    resetToDefaults: async () => {
        const response = await api.post('/global-settings/reset');
        return response.data;
    }
};

export const superAdminService = {
    // Bulk rate update for all month settings
    bulkRateUpdate: async (updateType, rates, options = {}) => {
        const response = await api.put('/super-admin/bulk-rate-update', { updateType, rates, ...options });
        return response.data;
    },

    // Soft delete user
    softDeleteUser: async (userId, reason) => {
        const response = await api.put(`/super-admin/users/${userId}/soft-delete`, { reason });
        return response.data;
    },

    // Restore soft deleted user
    restoreUser: async (userId) => {
        const response = await api.put(`/super-admin/users/${userId}/restore`);
        return response.data;
    },

    // Get all soft deleted users
    getDeletedUsers: async () => {
        const response = await api.get('/super-admin/users/deleted');
        return response.data;
    },

    // Permanently delete user
    permanentDeleteUser: async (userId, confirmation) => {
        const response = await api.delete(`/super-admin/users/${userId}/permanent`, {
            data: { confirmation }
        });
        return response.data;
    },

    // Correct transaction data
    correctTransaction: async (transactionId, correctionData) => {
        const response = await api.put(`/super-admin/transactions/${transactionId}/correct`, correctionData);
        return response.data;
    },

    // Balance correction for user
    balanceCorrection: async (userId, correctionData) => {
        const response = await api.put(`/super-admin/users/${userId}/balance-correction`, correctionData);
        return response.data;
    },

    // Get database stats
    getDatabaseStats: async () => {
        const response = await api.get('/super-admin/db/stats');
        return response.data;
    },

    // Cleanup orphaned records
    cleanupOrphans: async (dryRun = true) => {
        const response = await api.post('/super-admin/db/cleanup-orphans', { dryRun });
        return response.data;
    },

    // Cleanup old data
    cleanupOldData: async (olderThanMonths, dryRun = true) => {
        const response = await api.post('/super-admin/db/cleanup-old-data', { olderThanMonths, dryRun });
        return response.data;
    },

    // Recalculate all balances
    recalculateAllBalances: async (dryRun = true) => {
        const response = await api.post('/super-admin/db/recalculate-all-balances', { dryRun });
        return response.data;
    }
};

export const featureFlagService = {
    // Get all feature flags (Admin+)
    getAllFlags: async (params = {}) => {
        const response = await api.get('/feature-flags', { params });
        return response.data;
    },

    // Get active features for current user
    getActiveFeatures: async () => {
        const response = await api.get('/feature-flags/active');
        return response.data;
    },

    // Check if specific feature is enabled
    isFeatureEnabled: async (key) => {
        const response = await api.get(`/feature-flags/check/${key}`);
        return response.data;
    },

    // Get single feature flag
    getFlag: async (id) => {
        const response = await api.get(`/feature-flags/${id}`);
        return response.data;
    },

    // Create feature flag (SuperAdmin)
    createFlag: async (data) => {
        const response = await api.post('/feature-flags', data);
        return response.data;
    },

    // Update feature flag (SuperAdmin)
    updateFlag: async (id, data) => {
        const response = await api.put(`/feature-flags/${id}`, data);
        return response.data;
    },

    // Toggle feature flag (SuperAdmin)
    toggleFlag: async (id, reason = '') => {
        const response = await api.put(`/feature-flags/${id}/toggle`, { reason });
        return response.data;
    },

    // Update feature config (SuperAdmin)
    updateFlagConfig: async (id, config, reason = '') => {
        const response = await api.put(`/feature-flags/${id}/config`, { config, reason });
        return response.data;
    },

    // Manage beta users (SuperAdmin)
    manageBetaUsers: async (id, action, userIds) => {
        const response = await api.put(`/feature-flags/${id}/beta-users`, { action, userIds });
        return response.data;
    },

    // Delete feature flag (SuperAdmin)
    deleteFlag: async (id) => {
        const response = await api.delete(`/feature-flags/${id}`);
        return response.data;
    },

    // Get categories list
    getCategories: async () => {
        const response = await api.get('/feature-flags/categories/list');
        return response.data;
    }
};

export const notificationService = {
    // Get notifications
    getNotifications: async (params = {}) => {
        const response = await api.get('/notifications', { params });
        return response.data;
    },

    // Get unread count
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    // Mark as read
    markAsRead: async (notificationId) => {
        const response = await api.put(`/notifications/${notificationId}/read`);
        return response.data;
    },

    // Mark all as read
    markAllAsRead: async () => {
        const response = await api.put('/notifications/mark-all-read');
        return response.data;
    },

    // Delete notification
    deleteNotification: async (notificationId) => {
        const response = await api.delete(`/notifications/${notificationId}`);
        return response.data;
    },

    // Clear all notifications
    clearAll: async (readOnly = false) => {
        const response = await api.delete('/notifications/clear-all', {
            params: { readOnly }
        });
        return response.data;
    },

    // Send notification (Admin+)
    sendNotification: async (data) => {
        const response = await api.post('/notifications/send', data);
        return response.data;
    },

    // Get all notifications for admin
    getAdminNotifications: async (params = {}) => {
        const response = await api.get('/notifications/admin/all', { params });
        return response.data;
    }
};

export const groupService = {
    // Get all groups
    getAllGroups: async (params = {}) => {
        const response = await api.get('/groups', { params });
        return response.data;
    },

    // Get single group
    getGroup: async (id) => {
        const response = await api.get(`/groups/${id}`);
        return response.data;
    },

    // Create group (Admin+)
    createGroup: async (data) => {
        const response = await api.post('/groups', data);
        return response.data;
    },

    // Update group (Admin+)
    updateGroup: async (id, data) => {
        const response = await api.put(`/groups/${id}`, data);
        return response.data;
    },

    // Delete group (SuperAdmin)
    deleteGroup: async (id) => {
        const response = await api.delete(`/groups/${id}`);
        return response.data;
    },

    // Get group members
    getMembers: async (id) => {
        const response = await api.get(`/groups/${id}/members`);
        return response.data;
    },

    // Add member to group
    addMember: async (groupId, userId) => {
        const response = await api.post(`/groups/${groupId}/members`, { userId });
        return response.data;
    },

    // Remove member from group
    removeMember: async (groupId, userId) => {
        const response = await api.delete(`/groups/${groupId}/members/${userId}`);
        return response.data;
    },

    // Set group manager (Admin+)
    setManager: async (groupId, userId) => {
        const response = await api.put(`/groups/${groupId}/manager`, { userId });
        return response.data;
    },

    // Bulk add members (Admin+)
    bulkAddMembers: async (groupId, userIds) => {
        const response = await api.post(`/groups/${groupId}/members/bulk`, { userIds });
        return response.data;
    },

    // Get available users (not in any group)
    getAvailableUsers: async () => {
        const response = await api.get('/groups/available-users/list');
        return response.data;
    }
};

export const auditLogService = {
    // Get audit logs (Admin+)
    getLogs: async (params = {}) => {
        const response = await api.get('/audit-logs', { params });
        return response.data;
    },

    // Get audit log categories
    getCategories: async () => {
        const response = await api.get('/audit-logs/categories');
        return response.data;
    },

    // Get audit log actions
    getActions: async (category = null) => {
        const params = {};
        if (category) params.category = category;
        const response = await api.get('/audit-logs/actions', { params });
        return response.data;
    },

    // Get activity summary for dashboard
    getSummary: async (days = 7) => {
        const response = await api.get('/audit-logs/summary', { params: { days } });
        return response.data;
    },

    // Get critical actions (SuperAdmin)
    getCritical: async (limit = 20) => {
        const response = await api.get('/audit-logs/critical', { params: { limit } });
        return response.data;
    },

    // Search audit logs
    search: async (q, params = {}) => {
        const response = await api.get('/audit-logs/search', { params: { q, ...params } });
        return response.data;
    },

    // Get user's audit logs
    getUserLogs: async (userId, params = {}) => {
        const response = await api.get(`/audit-logs/user/${userId}`, { params });
        return response.data;
    },

    // Get single audit log
    getLog: async (id) => {
        const response = await api.get(`/audit-logs/${id}`);
        return response.data;
    },

    // Get my audit history
    getMyHistory: async (params = {}) => {
        const response = await api.get('/audit-logs/my/history', { params });
        return response.data;
    },

    // Undo action (SuperAdmin)
    undoAction: async (id) => {
        const response = await api.post(`/audit-logs/${id}/undo`);
        return response.data;
    }
};
