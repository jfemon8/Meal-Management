/**
 * Meal Management Service - TypeScript Version
 * All API service functions with proper type definitions
 */

import api from './api';
import type {
  Meal,
  MealStatus,
  MealSummary,
  DailyMeals,
  MealAuditLog,
  MealType,
  Breakfast,
  BreakfastParticipant,
  User,
  UserBasic,
  UserRole,
  BalanceType,
  Transaction,
  MonthSettings,
  MonthPreview,
  Holiday,
  HolidayType,
  Group,
  GroupSettings,
  RuleOverride,
  EffectiveStatus,
  GlobalSettings,
  DefaultRates,
  CutoffTimes,
  WeekendPolicy,
  HolidayPolicy,
  FeatureFlag,
  Notification,
  AuditLog,
  AuditLogSummary,
  AuditCategory,
  MonthlyReport,
  DailyReport,
  WalletSummary,
  TopConsumer,
  Defaulter,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '../types';

// ============================================
// Meal Service
// ============================================

interface MealStatusParams {
  startDate: string;
  endDate: string;
  mealType?: MealType;
  userId?: string;
}

interface ToggleMealData {
  date: string;
  isOn: boolean;
  count?: number;
  mealType?: MealType;
  userId?: string;
}

interface BulkToggleData {
  startDate: string;
  endDate: string;
  isOn: boolean;
  mealType?: MealType;
  userId?: string;
}

export const mealService = {
  // Get meal status for date range
  getMealStatus: async (
    startDate: string,
    endDate: string,
    userId: string | null = null,
    mealType: MealType = 'lunch'
  ): Promise<MealStatus[]> => {
    const params: MealStatusParams = { startDate, endDate, mealType };
    if (userId) params.userId = userId;
    const response = await api.get<MealStatus[]>('/meals/status', { params });
    return response.data;
  },

  // Toggle meal on/off
  toggleMeal: async (
    date: string,
    isOn: boolean,
    userId: string | null = null,
    count: number = 1,
    mealType: MealType = 'lunch'
  ): Promise<Meal> => {
    const data: ToggleMealData = { date, isOn, count, mealType };
    if (userId) data.userId = userId;
    const response = await api.put<Meal>('/meals/toggle', data);
    return response.data;
  },

  // Update meal count (Manager+)
  updateMealCount: async (
    date: string,
    userId: string,
    count: number,
    notes: string = '',
    mealType: MealType = 'lunch'
  ): Promise<Meal> => {
    const response = await api.put<Meal>('/meals/count', {
      date,
      userId,
      count,
      notes,
      mealType,
    });
    return response.data;
  },

  // Get meal summary for a month
  getMealSummary: async (
    year: number,
    month: number,
    userId: string | null = null,
    mealType: MealType = 'lunch'
  ): Promise<MealSummary> => {
    const params: Record<string, unknown> = { year, month, mealType };
    if (userId) params.userId = userId;
    const response = await api.get<MealSummary>('/meals/summary', { params });
    return response.data;
  },

  // Get daily meals for all users (Manager+)
  getDailyMeals: async (
    date: string,
    mealType: MealType = 'lunch'
  ): Promise<DailyMeals> => {
    const response = await api.get<DailyMeals>('/meals/daily', {
      params: { date, mealType },
    });
    return response.data;
  },

  // Bulk toggle meals for date range
  bulkToggle: async (
    startDate: string,
    endDate: string,
    isOn: boolean,
    mealType: MealType = 'lunch',
    userId: string | null = null
  ): Promise<{ modifiedCount: number }> => {
    const data: BulkToggleData = { startDate, endDate, isOn, mealType };
    if (userId) data.userId = userId;
    const response = await api.put<{ modifiedCount: number }>(
      '/meals/bulk-toggle',
      data
    );
    return response.data;
  },

  // Get meal audit log
  getAuditLog: async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<MealAuditLog>> => {
    const response = await api.get<PaginatedResponse<MealAuditLog>>(
      '/meals/audit-log',
      { params }
    );
    return response.data;
  },

  // Get audit log for specific user (Manager+)
  getUserAuditLog: async (
    userId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<MealAuditLog>> => {
    const response = await api.get<PaginatedResponse<MealAuditLog>>(
      `/meals/audit-log/${userId}`,
      { params }
    );
    return response.data;
  },

  // Recalculate meals based on current rules (Manager+)
  recalculateMeals: async (
    year: number,
    month: number,
    mealType: MealType = 'lunch',
    userId: string | null = null
  ): Promise<{ recalculatedCount: number }> => {
    const data: Record<string, unknown> = { year, month, mealType };
    if (userId) data.userId = userId;
    const response = await api.post<{ recalculatedCount: number }>(
      '/meals/recalculate',
      data
    );
    return response.data;
  },

  // Reset meals to default for date range (Admin+)
  resetToDefault: async (
    startDate: string,
    endDate: string,
    mealType: MealType = 'lunch',
    userId: string | null = null
  ): Promise<{ resetCount: number }> => {
    const data: Record<string, unknown> = { startDate, endDate, mealType };
    if (userId) data.userId = userId;
    const response = await api.post<{ resetCount: number }>(
      '/meals/reset-to-default',
      data
    );
    return response.data;
  },
};

// ============================================
// Breakfast Service
// ============================================

interface BreakfastSubmitData {
  date: string;
  totalCost: number;
  participants: string[];
  description?: string;
}

interface BreakfastIndividualData {
  date: string;
  participantCosts: Record<string, number>;
  description?: string;
}

export const breakfastService = {
  // Get breakfast records
  getBreakfasts: async (
    startDate: string,
    endDate: string
  ): Promise<Breakfast[]> => {
    const response = await api.get<Breakfast[]>('/breakfast', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Get user's breakfast records
  getUserBreakfasts: async (
    startDate: string,
    endDate: string
  ): Promise<Breakfast[]> => {
    const response = await api.get<Breakfast[]>('/breakfast/user', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Submit breakfast cost with equal split (Manager+)
  submitBreakfast: async (
    date: string,
    totalCost: number,
    participants: string[],
    description: string = ''
  ): Promise<Breakfast> => {
    const response = await api.post<Breakfast>('/breakfast', {
      date,
      totalCost,
      participants,
      description,
    });
    return response.data;
  },

  // Submit breakfast cost with individual amounts per user (Manager+)
  submitBreakfastIndividual: async (
    date: string,
    participantCosts: Record<string, number>,
    description: string = ''
  ): Promise<Breakfast> => {
    const response = await api.post<Breakfast>('/breakfast', {
      date,
      participantCosts,
      description,
    });
    return response.data;
  },

  // Deduct breakfast cost (Manager+)
  deductBreakfast: async (id: string): Promise<Breakfast> => {
    const response = await api.post<Breakfast>(`/breakfast/${id}/deduct`);
    return response.data;
  },

  // Update breakfast with equal split (Manager+)
  updateBreakfast: async (
    id: string,
    data: Partial<BreakfastSubmitData>
  ): Promise<Breakfast> => {
    const response = await api.put<Breakfast>(`/breakfast/${id}`, data);
    return response.data;
  },

  // Update breakfast with individual costs (Manager+)
  updateBreakfastIndividual: async (
    id: string,
    participantCosts: Record<string, number>,
    description?: string
  ): Promise<Breakfast> => {
    const response = await api.put<Breakfast>(`/breakfast/${id}`, {
      participantCosts,
      description,
    });
    return response.data;
  },

  // Reverse finalized breakfast (refund) (Manager+)
  reverseBreakfast: async (id: string, reason: string): Promise<Breakfast> => {
    const response = await api.post<Breakfast>(`/breakfast/${id}/reverse`, {
      reason,
    });
    return response.data;
  },

  // Delete breakfast (Manager+)
  deleteBreakfast: async (id: string): Promise<void> => {
    await api.delete(`/breakfast/${id}`);
  },
};

// ============================================
// User Service
// ============================================

interface UserCreateData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
  group?: string;
}

interface BalanceUpdateData {
  amount: number;
  balanceType: BalanceType;
  type: 'deposit' | 'deduction';
  description?: string;
}

export const userService = {
  // Get all users (Manager+)
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  // Create new user (Admin+)
  createUser: async (userData: UserCreateData): Promise<User> => {
    const response = await api.post<User>('/users', userData);
    return response.data;
  },

  // Get user by ID
  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  // Update user profile
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  // Update user role (Admin+)
  updateUserRole: async (id: string, role: UserRole): Promise<User> => {
    const response = await api.put<User>(`/users/${id}/role`, { role });
    return response.data;
  },

  // Update user balance (Manager+)
  updateBalance: async (
    id: string,
    amount: number,
    balanceType: BalanceType,
    type: 'deposit' | 'deduction',
    description: string = ''
  ): Promise<{ user: User; transaction: Transaction }> => {
    const response = await api.put<{ user: User; transaction: Transaction }>(
      `/users/${id}/balance`,
      { amount, balanceType, type, description }
    );
    return response.data;
  },

  // Update user status (Admin+)
  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await api.put<User>(`/users/${id}/status`, { isActive });
    return response.data;
  },

  // Delete user (SuperAdmin)
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  // Reset user password (Admin+)
  resetPassword: async (
    id: string,
    newPassword: string,
    forceChangeOnLogin: boolean = true
  ): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/users/${id}/reset-password`,
      { newPassword, forceChangeOnLogin }
    );
    return response.data;
  },
};

// ============================================
// Month Settings Service
// ============================================

interface MonthSettingsData {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  lunchRate: number;
  dinnerRate?: number;
  notes?: string;
}

export const monthSettingsService = {
  // Get month settings
  getSettings: async (
    year?: number,
    month?: number
  ): Promise<MonthSettings | MonthSettings[]> => {
    const params: Record<string, number> = {};
    if (year && month) {
      params.year = year;
      params.month = month;
    }
    const response = await api.get<MonthSettings | MonthSettings[]>(
      '/month-settings',
      { params }
    );
    return response.data;
  },

  // Get current month settings
  getCurrentSettings: async (): Promise<MonthSettings | null> => {
    const response = await api.get<MonthSettings | null>(
      '/month-settings/current'
    );
    return response.data;
  },

  // Create/Update month settings (Manager+)
  saveSettings: async (data: MonthSettingsData): Promise<MonthSettings> => {
    const response = await api.post<MonthSettings>('/month-settings', data);
    return response.data;
  },

  // Finalize month (Manager+)
  finalizeMonth: async (id: string): Promise<MonthSettings> => {
    const response = await api.put<MonthSettings>(
      `/month-settings/${id}/finalize`
    );
    return response.data;
  },

  // Carry forward balance to next month (Manager+)
  carryForwardBalance: async (
    id: string
  ): Promise<{ message: string; nextMonth: MonthSettings }> => {
    const response = await api.post<{
      message: string;
      nextMonth: MonthSettings;
    }>(`/month-settings/${id}/carry-forward`);
    return response.data;
  },

  // Preview month calculation (Manager+)
  previewCalculation: async (id: string): Promise<MonthPreview> => {
    const response = await api.get<MonthPreview>(
      `/month-settings/${id}/preview`
    );
    return response.data;
  },
};

// ============================================
// Holiday Service
// ============================================

interface HolidayData {
  date: string;
  name: string;
  nameBn: string;
  type?: HolidayType;
  isRecurring?: boolean;
  recurringMonth?: number;
  recurringDay?: number;
}

export const holidayService = {
  // Get holidays
  getHolidays: async (
    year: number,
    month: number | null = null
  ): Promise<Holiday[]> => {
    const params: Record<string, number> = { year };
    if (month) params.month = month;
    const response = await api.get<Holiday[]>('/holidays', { params });
    return response.data;
  },

  // Add holiday (Admin+)
  addHoliday: async (data: HolidayData): Promise<Holiday> => {
    const response = await api.post<Holiday>('/holidays', data);
    return response.data;
  },

  // Update holiday (Admin+)
  updateHoliday: async (
    id: string,
    data: Partial<HolidayData>
  ): Promise<Holiday> => {
    const response = await api.put<Holiday>(`/holidays/${id}`, data);
    return response.data;
  },

  // Delete holiday (Admin+)
  deleteHoliday: async (id: string): Promise<void> => {
    await api.delete(`/holidays/${id}`);
  },

  // Seed default holidays (Admin+)
  seedHolidays: async (year: number): Promise<{ count: number }> => {
    const response = await api.post<{ count: number }>('/holidays/seed', {
      year,
    });
    return response.data;
  },

  // Sync holidays from API (Admin+)
  syncHolidays: async (
    year: number
  ): Promise<{ synced: number; skipped: number }> => {
    const response = await api.post<{ synced: number; skipped: number }>(
      '/holidays/sync',
      { year }
    );
    return response.data;
  },

  // Preview holidays from API (Admin+)
  previewHolidays: async (year: number): Promise<Holiday[]> => {
    const response = await api.get<Holiday[]>(`/holidays/preview/${year}`);
    return response.data;
  },
};

// ============================================
// Transaction Service
// ============================================

interface TransactionParams extends PaginationParams {
  type?: string;
  balanceType?: BalanceType;
  startDate?: string;
  endDate?: string;
}

export const transactionService = {
  // Get user's transactions
  getTransactions: async (
    params: TransactionParams = {}
  ): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get<PaginatedResponse<Transaction>>(
      '/transactions',
      { params }
    );
    return response.data;
  },

  // Get transactions for a specific user (Manager+)
  getUserTransactions: async (
    userId: string,
    params: TransactionParams = {}
  ): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get<PaginatedResponse<Transaction>>(
      `/transactions/user/${userId}`,
      { params }
    );
    return response.data;
  },

  // Get all transactions (Manager+)
  getAllTransactions: async (
    params: TransactionParams = {}
  ): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get<PaginatedResponse<Transaction>>(
      '/transactions/all',
      { params }
    );
    return response.data;
  },

  // Get single transaction (Manager+)
  getTransaction: async (transactionId: string): Promise<Transaction> => {
    const response = await api.get<Transaction>(
      `/transactions/${transactionId}`
    );
    return response.data;
  },

  // Reverse a transaction (Manager+)
  reverseTransaction: async (
    transactionId: string,
    reason: string
  ): Promise<{ original: Transaction; reversal: Transaction }> => {
    const response = await api.post<{
      original: Transaction;
      reversal: Transaction;
    }>(`/transactions/${transactionId}/reverse`, { reason });
    return response.data;
  },
};

// ============================================
// Report Service
// ============================================

export const reportService = {
  // Get monthly report
  getMonthlyReport: async (
    year: number,
    month: number,
    userId: string | null = null
  ): Promise<MonthlyReport> => {
    const params: Record<string, unknown> = { year, month };
    if (userId) params.userId = userId;
    const response = await api.get<MonthlyReport>('/reports/monthly', {
      params,
    });
    return response.data;
  },

  // Get all users report (Manager+)
  getAllUsersReport: async (
    year: number,
    month: number
  ): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>('/reports/all-users', {
      params: { year, month },
    });
    return response.data;
  },

  // Get daily report (Manager+)
  getDailyReport: async (
    date: string,
    mealType: MealType = 'lunch'
  ): Promise<DailyReport> => {
    const response = await api.get<DailyReport>('/reports/daily', {
      params: { date, mealType },
    });
    return response.data;
  },

  // Get wallet summary
  getWalletSummary: async (
    userId: string | null = null
  ): Promise<WalletSummary> => {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    const response = await api.get<WalletSummary>('/reports/wallet-summary', {
      params,
    });
    return response.data;
  },

  // Get top consumers (Manager+)
  getTopConsumers: async (
    year: number,
    month: number,
    mealType: MealType | 'all' = 'all',
    limit: number = 10
  ): Promise<TopConsumer[]> => {
    const response = await api.get<TopConsumer[]>('/reports/top-consumers', {
      params: { year, month, mealType, limit },
    });
    return response.data;
  },

  // Get defaulters list (Manager+)
  getDefaulters: async (
    year: number,
    month: number,
    threshold: number = 0,
    balanceType: BalanceType | 'all' = 'all'
  ): Promise<Defaulter[]> => {
    const response = await api.get<Defaulter[]>('/reports/defaulters', {
      params: { year, month, threshold, balanceType },
    });
    return response.data;
  },

  // Export as CSV (Manager+)
  exportCSV: async (
    year: number,
    month: number,
    reportType: string = 'all-users'
  ): Promise<void> => {
    const response = await api.get('/reports/export/csv', {
      params: { year, month, reportType },
      responseType: 'blob',
    });
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
  exportExcel: async (
    year: number,
    month: number,
    reportType: string = 'all-users'
  ): Promise<void> => {
    const response = await api.get('/reports/export/excel', {
      params: { year, month, reportType },
      responseType: 'blob',
    });
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
  getExportData: async (
    year: number,
    month: number,
    reportType: string = 'all-users'
  ): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>('/reports/export/json', {
      params: { year, month, reportType },
    });
    return response.data;
  },

  // Get user monthly report (printable format)
  getUserMonthlyReport: async (
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>(
      `/reports/user/${userId}/monthly`,
      { params: { year, month } }
    );
    return response.data;
  },
};

// ============================================
// Rule Override Service
// ============================================

interface RuleOverrideData {
  targetType: 'user' | 'all_users' | 'global';
  targetUser?: string;
  dateType: 'single' | 'range' | 'recurring';
  startDate: string;
  endDate?: string;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  recurringDays?: number[];
  mealType: MealType | 'both';
  action: 'force_on' | 'force_off';
  reason?: string;
  expiresAt?: string;
}

interface RuleOverrideParams extends PaginationParams {
  targetType?: string;
  mealType?: string;
  isActive?: boolean;
}

export const ruleOverrideService = {
  // Get all rule overrides (Manager+)
  getOverrides: async (
    params: RuleOverrideParams = {}
  ): Promise<PaginatedResponse<RuleOverride>> => {
    const response = await api.get<PaginatedResponse<RuleOverride>>(
      '/rule-overrides',
      { params }
    );
    return response.data;
  },

  // Check applicable overrides for a date/user
  checkOverrides: async (
    date: string,
    userId: string | null = null,
    mealType: MealType = 'lunch'
  ): Promise<RuleOverride[]> => {
    const params: Record<string, string> = { date, mealType };
    if (userId) params.userId = userId;
    const response = await api.get<RuleOverride[]>('/rule-overrides/check', {
      params,
    });
    return response.data;
  },

  // Get effective status with priority resolution
  getEffectiveStatus: async (
    date: string,
    userId: string | null = null,
    mealType: MealType = 'lunch'
  ): Promise<EffectiveStatus> => {
    const params: Record<string, string> = { date, mealType };
    if (userId) params.userId = userId;
    const response = await api.get<EffectiveStatus>(
      '/rule-overrides/effective-status',
      { params }
    );
    return response.data;
  },

  // Create new override (Manager+)
  createOverride: async (data: RuleOverrideData): Promise<RuleOverride> => {
    const response = await api.post<RuleOverride>('/rule-overrides', data);
    return response.data;
  },

  // Update override
  updateOverride: async (
    id: string,
    data: Partial<RuleOverrideData>
  ): Promise<RuleOverride> => {
    const response = await api.put<RuleOverride>(`/rule-overrides/${id}`, data);
    return response.data;
  },

  // Delete override
  deleteOverride: async (id: string): Promise<void> => {
    await api.delete(`/rule-overrides/${id}`);
  },

  // Toggle override active status
  toggleOverride: async (id: string): Promise<RuleOverride> => {
    const response = await api.post<RuleOverride>(
      `/rule-overrides/${id}/toggle`
    );
    return response.data;
  },
};

// ============================================
// Global Settings Service
// ============================================

export const globalSettingsService = {
  // Get global settings
  getSettings: async (): Promise<GlobalSettings> => {
    const response = await api.get<GlobalSettings>('/global-settings');
    return response.data;
  },

  // Update global settings (Admin+)
  updateSettings: async (
    data: Partial<GlobalSettings>
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>('/global-settings', data);
    return response.data;
  },

  // Update default rates (Admin+)
  updateDefaultRates: async (
    lunch: number,
    dinner: number
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>(
      '/global-settings/default-rates',
      { lunch, dinner }
    );
    return response.data;
  },

  // Update cutoff times (Admin+)
  updateCutoffTimes: async (
    lunch: string,
    dinner: string
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>(
      '/global-settings/cutoff-times',
      { lunch, dinner }
    );
    return response.data;
  },

  // Update weekend policy (Admin+)
  updateWeekendPolicy: async (
    policy: Partial<WeekendPolicy>
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>(
      '/global-settings/weekend-policy',
      policy
    );
    return response.data;
  },

  // Update holiday policy (Admin+)
  updateHolidayPolicy: async (
    policy: Partial<HolidayPolicy>
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>(
      '/global-settings/holiday-policy',
      policy
    );
    return response.data;
  },

  // Update registration settings (Admin+)
  updateRegistration: async (
    settings: Partial<GlobalSettings['registration']>
  ): Promise<GlobalSettings> => {
    const response = await api.put<GlobalSettings>(
      '/global-settings/registration',
      settings
    );
    return response.data;
  },

  // Reset to defaults (Admin+)
  resetToDefaults: async (): Promise<GlobalSettings> => {
    const response = await api.post<GlobalSettings>('/global-settings/reset');
    return response.data;
  },
};

// ============================================
// Super Admin Service
// ============================================

interface BulkRateUpdateOptions {
  updateType: 'all' | 'unfinalizedOnly' | 'dateRange';
  rates: { lunch: number; dinner: number };
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

interface DatabaseStats {
  users: number;
  meals: number;
  transactions: number;
  breakfasts: number;
  holidays: number;
  monthSettings: number;
}

export const superAdminService = {
  // Bulk rate update for all month settings
  bulkRateUpdate: async (
    updateType: string,
    rates: { lunch: number; dinner: number },
    options: Record<string, unknown> = {}
  ): Promise<{ updatedCount: number }> => {
    const response = await api.put<{ updatedCount: number }>(
      '/super-admin/bulk-rate-update',
      { updateType, rates, ...options }
    );
    return response.data;
  },

  // Soft delete user
  softDeleteUser: async (userId: string, reason: string): Promise<User> => {
    const response = await api.put<User>(
      `/super-admin/users/${userId}/soft-delete`,
      { reason }
    );
    return response.data;
  },

  // Restore soft deleted user
  restoreUser: async (userId: string): Promise<User> => {
    const response = await api.put<User>(
      `/super-admin/users/${userId}/restore`
    );
    return response.data;
  },

  // Get all soft deleted users
  getDeletedUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/super-admin/users/deleted');
    return response.data;
  },

  // Permanently delete user
  permanentDeleteUser: async (
    userId: string,
    confirmation: string
  ): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      `/super-admin/users/${userId}/permanent`,
      { data: { confirmation } }
    );
    return response.data;
  },

  // Correct transaction data
  correctTransaction: async (
    transactionId: string,
    correctionData: {
      amount?: number;
      description?: string;
      reason: string;
    }
  ): Promise<Transaction> => {
    const response = await api.put<Transaction>(
      `/super-admin/transactions/${transactionId}/correct`,
      correctionData
    );
    return response.data;
  },

  // Balance correction for user
  balanceCorrection: async (
    userId: string,
    correctionData: {
      balanceType: BalanceType;
      newBalance: number;
      reason: string;
    }
  ): Promise<{ user: User; transaction: Transaction }> => {
    const response = await api.put<{ user: User; transaction: Transaction }>(
      `/super-admin/users/${userId}/balance-correction`,
      correctionData
    );
    return response.data;
  },

  // Get database stats
  getDatabaseStats: async (): Promise<DatabaseStats> => {
    const response = await api.get<DatabaseStats>('/super-admin/db/stats');
    return response.data;
  },

  // Cleanup orphaned records
  cleanupOrphans: async (
    dryRun: boolean = true
  ): Promise<{ orphanedCount: number; cleanedCount: number }> => {
    const response = await api.post<{
      orphanedCount: number;
      cleanedCount: number;
    }>('/super-admin/db/cleanup-orphans', { dryRun });
    return response.data;
  },

  // Cleanup old data
  cleanupOldData: async (
    olderThanMonths: number,
    dryRun: boolean = true
  ): Promise<{ affectedCount: number; deletedCount: number }> => {
    const response = await api.post<{
      affectedCount: number;
      deletedCount: number;
    }>('/super-admin/db/cleanup-old-data', { olderThanMonths, dryRun });
    return response.data;
  },

  // Recalculate all balances
  recalculateAllBalances: async (
    dryRun: boolean = true
  ): Promise<{ usersAffected: number; discrepancies: unknown[] }> => {
    const response = await api.post<{
      usersAffected: number;
      discrepancies: unknown[];
    }>('/super-admin/db/recalculate-all-balances', { dryRun });
    return response.data;
  },
};

// ============================================
// Feature Flag Service
// ============================================

interface FeatureFlagData {
  key: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  isEnabled?: boolean;
  percentage?: number;
  enabledRoles?: UserRole[];
  config?: Record<string, unknown>;
}

export const featureFlagService = {
  // Get all feature flags (Admin+)
  getAllFlags: async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<FeatureFlag>> => {
    const response = await api.get<PaginatedResponse<FeatureFlag>>(
      '/feature-flags',
      { params }
    );
    return response.data;
  },

  // Get active features for current user
  getActiveFeatures: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/feature-flags/active');
    return response.data;
  },

  // Check if specific feature is enabled
  isFeatureEnabled: async (key: string): Promise<{ enabled: boolean }> => {
    const response = await api.get<{ enabled: boolean }>(
      `/feature-flags/check/${key}`
    );
    return response.data;
  },

  // Get single feature flag
  getFlag: async (id: string): Promise<FeatureFlag> => {
    const response = await api.get<FeatureFlag>(`/feature-flags/${id}`);
    return response.data;
  },

  // Create feature flag (SuperAdmin)
  createFlag: async (data: FeatureFlagData): Promise<FeatureFlag> => {
    const response = await api.post<FeatureFlag>('/feature-flags', data);
    return response.data;
  },

  // Update feature flag (SuperAdmin)
  updateFlag: async (
    id: string,
    data: Partial<FeatureFlagData>
  ): Promise<FeatureFlag> => {
    const response = await api.put<FeatureFlag>(`/feature-flags/${id}`, data);
    return response.data;
  },

  // Toggle feature flag (SuperAdmin)
  toggleFlag: async (id: string, reason: string = ''): Promise<FeatureFlag> => {
    const response = await api.put<FeatureFlag>(`/feature-flags/${id}/toggle`, {
      reason,
    });
    return response.data;
  },

  // Update feature config (SuperAdmin)
  updateFlagConfig: async (
    id: string,
    config: Record<string, unknown>,
    reason: string = ''
  ): Promise<FeatureFlag> => {
    const response = await api.put<FeatureFlag>(`/feature-flags/${id}/config`, {
      config,
      reason,
    });
    return response.data;
  },

  // Manage beta users (SuperAdmin)
  manageBetaUsers: async (
    id: string,
    action: 'add' | 'remove',
    userIds: string[]
  ): Promise<FeatureFlag> => {
    const response = await api.put<FeatureFlag>(
      `/feature-flags/${id}/beta-users`,
      { action, userIds }
    );
    return response.data;
  },

  // Delete feature flag (SuperAdmin)
  deleteFlag: async (id: string): Promise<void> => {
    await api.delete(`/feature-flags/${id}`);
  },

  // Get categories list
  getCategories: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/feature-flags/categories/list');
    return response.data;
  },
};

// ============================================
// Notification Service
// ============================================

interface SendNotificationData {
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  title: string;
  message: string;
  link?: string;
  userIds?: string[];
  roles?: UserRole[];
  sendToAll?: boolean;
}

export const notificationService = {
  // Get notifications
  getNotifications: async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get<PaginatedResponse<Notification>>(
      '/notifications',
      { params }
    );
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get<{ count: number }>(
      '/notifications/unread-count'
    );
    return response.data;
  },

  // Mark as read
  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await api.put<Notification>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const response = await api.put<{ modifiedCount: number }>(
      '/notifications/mark-all-read'
    );
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },

  // Clear all notifications
  clearAll: async (
    readOnly: boolean = false
  ): Promise<{ deletedCount: number }> => {
    const response = await api.delete<{ deletedCount: number }>(
      '/notifications/clear-all',
      { params: { readOnly } }
    );
    return response.data;
  },

  // Send notification (Admin+)
  sendNotification: async (
    data: SendNotificationData
  ): Promise<{ sentCount: number }> => {
    const response = await api.post<{ sentCount: number }>(
      '/notifications/send',
      data
    );
    return response.data;
  },

  // Get all notifications for admin
  getAdminNotifications: async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get<PaginatedResponse<Notification>>(
      '/notifications/admin/all',
      { params }
    );
    return response.data;
  },
};

// ============================================
// Group Service
// ============================================

interface GroupData {
  name: string;
  description?: string;
  code?: string;
  manager?: string;
  settings?: Partial<GroupSettings>;
}

export const groupService = {
  // Get all groups
  getAllGroups: async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Group>> => {
    const response = await api.get<PaginatedResponse<Group>>('/groups', {
      params,
    });
    return response.data;
  },

  // Get single group
  getGroup: async (id: string): Promise<Group> => {
    const response = await api.get<Group>(`/groups/${id}`);
    return response.data;
  },

  // Create group (Admin+)
  createGroup: async (data: GroupData): Promise<Group> => {
    const response = await api.post<Group>('/groups', data);
    return response.data;
  },

  // Update group (Admin+)
  updateGroup: async (id: string, data: Partial<GroupData>): Promise<Group> => {
    const response = await api.put<Group>(`/groups/${id}`, data);
    return response.data;
  },

  // Delete group (SuperAdmin)
  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`);
  },

  // Get group members
  getMembers: async (id: string): Promise<UserBasic[]> => {
    const response = await api.get<UserBasic[]>(`/groups/${id}/members`);
    return response.data;
  },

  // Add member to group
  addMember: async (groupId: string, userId: string): Promise<Group> => {
    const response = await api.post<Group>(`/groups/${groupId}/members`, {
      userId,
    });
    return response.data;
  },

  // Remove member from group
  removeMember: async (groupId: string, userId: string): Promise<Group> => {
    const response = await api.delete<Group>(
      `/groups/${groupId}/members/${userId}`
    );
    return response.data;
  },

  // Set group manager (Admin+)
  setManager: async (groupId: string, userId: string): Promise<Group> => {
    const response = await api.put<Group>(`/groups/${groupId}/manager`, {
      userId,
    });
    return response.data;
  },

  // Bulk add members (Admin+)
  bulkAddMembers: async (
    groupId: string,
    userIds: string[]
  ): Promise<{ addedCount: number }> => {
    const response = await api.post<{ addedCount: number }>(
      `/groups/${groupId}/members/bulk`,
      { userIds }
    );
    return response.data;
  },

  // Get available users (not in any group)
  getAvailableUsers: async (): Promise<UserBasic[]> => {
    const response = await api.get<UserBasic[]>('/groups/available-users/list');
    return response.data;
  },
};

// ============================================
// Audit Log Service
// ============================================

interface AuditLogParams extends PaginationParams {
  category?: AuditCategory;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  isCritical?: boolean;
}

export const auditLogService = {
  // Get audit logs (Admin+)
  getLogs: async (
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>('/audit-logs', {
      params,
    });
    return response.data;
  },

  // Get audit log categories
  getCategories: async (): Promise<AuditCategory[]> => {
    const response = await api.get<AuditCategory[]>('/audit-logs/categories');
    return response.data;
  },

  // Get audit log actions
  getActions: async (category: AuditCategory | null = null): Promise<string[]> => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    const response = await api.get<string[]>('/audit-logs/actions', { params });
    return response.data;
  },

  // Get activity summary for dashboard
  getSummary: async (days: number = 7): Promise<AuditLogSummary> => {
    const response = await api.get<AuditLogSummary>('/audit-logs/summary', {
      params: { days },
    });
    return response.data;
  },

  // Get critical actions (SuperAdmin)
  getCritical: async (limit: number = 20): Promise<AuditLog[]> => {
    const response = await api.get<AuditLog[]>('/audit-logs/critical', {
      params: { limit },
    });
    return response.data;
  },

  // Search audit logs
  search: async (
    q: string,
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>(
      '/audit-logs/search',
      { params: { q, ...params } }
    );
    return response.data;
  },

  // Get user's audit logs
  getUserLogs: async (
    userId: string,
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>(
      `/audit-logs/user/${userId}`,
      { params }
    );
    return response.data;
  },

  // Get single audit log
  getLog: async (id: string): Promise<AuditLog> => {
    const response = await api.get<AuditLog>(`/audit-logs/${id}`);
    return response.data;
  },

  // Get my audit history
  getMyHistory: async (
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>(
      '/audit-logs/my/history',
      { params }
    );
    return response.data;
  },

  // Undo action (SuperAdmin)
  undoAction: async (id: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/audit-logs/${id}/undo`
    );
    return response.data;
  },

  // Get list of all managers (Admin+)
  getManagersList: async (): Promise<UserBasic[]> => {
    const response = await api.get<UserBasic[]>('/audit-logs/managers/list');
    return response.data;
  },

  // Get all managers' activity (Admin+)
  getManagersActivity: async (
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>(
      '/audit-logs/managers/activity',
      { params }
    );
    return response.data;
  },

  // Get managers' activity summary (Admin+)
  getManagersSummary: async (
    days: number = 30,
    managerId: string | null = null
  ): Promise<AuditLogSummary> => {
    const params: Record<string, unknown> = { days };
    if (managerId) params.managerId = managerId;
    const response = await api.get<AuditLogSummary>(
      '/audit-logs/managers/summary',
      { params }
    );
    return response.data;
  },

  // Get specific manager's activity (Admin+)
  getManagerActivity: async (
    managerId: string,
    params: AuditLogParams = {}
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await api.get<PaginatedResponse<AuditLog>>(
      `/audit-logs/managers/${managerId}/activity`,
      { params }
    );
    return response.data;
  },
};

// Export all services as default
export default {
  meal: mealService,
  breakfast: breakfastService,
  user: userService,
  monthSettings: monthSettingsService,
  holiday: holidayService,
  transaction: transactionService,
  report: reportService,
  ruleOverride: ruleOverrideService,
  globalSettings: globalSettingsService,
  superAdmin: superAdminService,
  featureFlag: featureFlagService,
  notification: notificationService,
  group: groupService,
  auditLog: auditLogService,
};
