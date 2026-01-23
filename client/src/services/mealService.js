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
    bulkToggle: async (startDate, endDate, isOn, mealType = 'lunch') => {
        const response = await api.put('/meals/bulk-toggle', { startDate, endDate, isOn, mealType });
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

    // Submit breakfast cost (Manager+)
    submitBreakfast: async (date, totalCost, participants, description = '') => {
        const response = await api.post('/breakfast', { date, totalCost, participants, description });
        return response.data;
    },

    // Deduct breakfast cost (Manager+)
    deductBreakfast: async (id) => {
        const response = await api.post(`/breakfast/${id}/deduct`);
        return response.data;
    },

    // Update breakfast (Manager+)
    updateBreakfast: async (id, data) => {
        const response = await api.put(`/breakfast/${id}`, data);
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
