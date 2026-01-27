/**
 * Comprehensive Type Definitions for MealManagement System
 * All types are derived from backend Mongoose models
 */

// ============================================
// Base Types
// ============================================

export type UserRole = 'user' | 'manager' | 'admin' | 'superadmin';
export type MealType = 'lunch' | 'dinner';
export type BalanceType = 'breakfast' | 'lunch' | 'dinner';
export type TransactionType = 'deposit' | 'deduction' | 'adjustment' | 'refund' | 'reversal';
export type HolidayType = 'government' | 'optional' | 'religious';
export type HolidaySource = 'manual' | 'api';
export type TwoFactorMethod = 'totp' | 'sms' | 'email';
export type LoginStatus = 'success' | 'failed';

// ============================================
// User Types
// ============================================

export interface BalanceDetails {
  amount: number;
  isFrozen: boolean;
  frozenAt: string | null;
  frozenBy: string | null;
  frozenReason: string;
}

export interface UserBalances {
  breakfast: BalanceDetails;
  lunch: BalanceDetails;
  dinner: BalanceDetails;
}

export interface BalanceWarning {
  threshold: number;
  notified: boolean;
  lastNotifiedAt: string | null;
}

export interface LoginActivity {
  loginAt: string;
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  location: string;
  status: LoginStatus;
}

export interface EmailNotificationPrefs {
  enabled: boolean;
  lowBalance: boolean;
  mealReminder: boolean;
  monthlyReport: boolean;
  systemUpdates: boolean;
}

export interface PushNotificationPrefs {
  enabled: boolean;
  lowBalance: boolean;
  mealReminder: boolean;
}

export interface SmsNotificationPrefs {
  enabled: boolean;
  lowBalance: boolean;
}

export interface NotificationPreferences {
  email: EmailNotificationPrefs;
  push: PushNotificationPrefs;
  sms: SmsNotificationPrefs;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: string;
}

export interface TwoFactorAuth {
  isEnabled: boolean;
  secret: string | null;
  backupCodes: BackupCode[];
  enabledAt?: string;
  method: TwoFactorMethod;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  group?: string | Group;
  isGroupManager: boolean;
  mustChangePassword: boolean;
  passwordResetBy?: string;
  passwordResetAt?: string;
  permissions: string[];
  balances: UserBalances;
  balanceWarning: BalanceWarning;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  restoredAt?: string;
  restoredBy?: string;
  profileImage?: string;
  loginActivity?: LoginActivity[];
  notificationPreferences: NotificationPreferences;
  twoFactorAuth: TwoFactorAuth;
  createdAt: string;
  updatedAt: string;
}

// Simplified user for lists
export interface UserBasic {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  group?: string | GroupBasic;
}

// ============================================
// Meal Types
// ============================================

export interface Meal {
  _id: string;
  user: string | UserBasic;
  date: string;
  mealType: MealType;
  isOn: boolean;
  count: number;
  modifiedBy?: string | UserBasic;
  isManuallySet: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealStatus {
  date: string;
  isOn: boolean;
  count: number;
  canToggle: boolean;
  reason?: string;
  source?: string;
  priority?: number;
  isManuallySet?: boolean;
  isDefaultOff?: boolean;
}

export interface DailyMealUser {
  _id: string;
  name: string;
  isOn: boolean;
  count: number;
  modifiedBy?: string;
  isManuallySet: boolean;
}

export interface DailyMeals {
  date: string;
  mealType: MealType;
  users: DailyMealUser[];
  totalMeals: number;
  totalUsers: number;
}

export interface MealSummary {
  year: number;
  month: number;
  mealType: MealType;
  totalMeals: number;
  totalDays: number;
  days: {
    date: string;
    isOn: boolean;
    count: number;
    isHoliday: boolean;
    holidayName?: string;
  }[];
}

export interface MealAuditLog {
  _id: string;
  user: UserBasic;
  date: string;
  mealType: MealType;
  previousValue: boolean;
  newValue: boolean;
  modifiedBy: UserBasic;
  reason?: string;
  createdAt: string;
}

// ============================================
// Breakfast Types
// ============================================

export interface BreakfastParticipant {
  user: string | UserBasic;
  cost: number;
  deducted: boolean;
  deductedAt?: string;
}

export interface Breakfast {
  _id: string;
  date: string;
  totalCost: number;
  description: string;
  participants: BreakfastParticipant[];
  submittedBy: string | UserBasic;
  isFinalized: boolean;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string | UserBasic;
  reverseReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Transaction Types
// ============================================

export interface Transaction {
  _id: string;
  user: string | UserBasic;
  type: TransactionType;
  balanceType: BalanceType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  reference?: string;
  referenceModel?: 'Breakfast' | 'Meal' | 'MonthSettings' | 'Transaction';
  originalTransaction?: string;
  reversalReason?: string;
  isReversed: boolean;
  performedBy: string | UserBasic;
  isCorrected: boolean;
  correctedAt?: string;
  correctedBy?: string | UserBasic;
  correctionReason?: string;
  originalAmount?: number;
  originalDescription?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Month Settings Types
// ============================================

export interface MonthSettings {
  _id: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  lunchRate: number;
  dinnerRate: number;
  isFinalized: boolean;
  isCarriedForward: boolean;
  carriedForwardAt?: string;
  carriedForwardBy?: string | UserBasic;
  createdBy: string | UserBasic;
  modifiedBy?: string | UserBasic;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthPreviewUser {
  userId: string;
  name: string;
  lunchCount: number;
  dinnerCount: number;
  lunchCharge: number;
  dinnerCharge: number;
  totalCharge: number;
  currentBalance: number;
  projectedBalance: number;
}

export interface MonthPreview {
  year: number;
  month: number;
  lunchRate: number;
  dinnerRate: number;
  totalLunchMeals: number;
  totalDinnerMeals: number;
  totalLunchCharge: number;
  totalDinnerCharge: number;
  totalCharge: number;
  users: MonthPreviewUser[];
}

// ============================================
// Holiday Types
// ============================================

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  nameBn: string;
  type: HolidayType;
  isRecurring: boolean;
  recurringMonth?: number;
  recurringDay?: number;
  isActive: boolean;
  source: HolidaySource;
  lastSyncedAt?: string;
  addedBy?: string | UserBasic;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Group Types
// ============================================

export interface GroupSettings {
  canManagerAddUsers: boolean;
  canManagerRemoveUsers: boolean;
  canManagerEditUsers: boolean;
  canManagerManageBalance: boolean;
  canManagerViewReports: boolean;
  canManagerManageMeals: boolean;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  code?: string;
  manager?: string | UserBasic;
  settings: GroupSettings;
  isActive: boolean;
  createdBy: string | UserBasic;
  updatedBy?: string | UserBasic;
  memberCount?: number;
  members?: UserBasic[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupBasic {
  _id: string;
  name: string;
  code?: string;
}

// ============================================
// Rule Override Types
// ============================================

export type TargetType = 'user' | 'all_users' | 'global';
export type DateType = 'single' | 'range' | 'recurring';
export type RecurringPattern = 'daily' | 'weekly' | 'monthly';
export type OverrideAction = 'force_on' | 'force_off';
export type CreatedByRole = 'system' | 'user' | 'manager' | 'admin';

export interface RuleOverride {
  _id: string;
  targetType: TargetType;
  targetUser?: string | UserBasic;
  dateType: DateType;
  startDate: string;
  endDate?: string;
  recurringPattern?: RecurringPattern;
  recurringDays?: number[];
  mealType: MealType | 'both';
  action: OverrideAction;
  priority: number;
  createdByRole: CreatedByRole;
  createdBy: string | UserBasic;
  reason: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveStatus {
  isOn: boolean;
  source: string;
  priority: number;
  reason?: string;
  canEdit: boolean;
  override?: RuleOverride;
}

// ============================================
// Global Settings Types
// ============================================

export interface DefaultRates {
  lunch: number;
  dinner: number;
}

export interface CutoffTimes {
  lunch: string;
  dinner: string;
}

export interface WeekendPolicy {
  fridayOff: boolean;
  saturdayOff: boolean;
  alternativeSaturdayOff: boolean;
  oddSaturdayOff: boolean;
}

export interface HolidayPolicy {
  governmentHolidayOff: boolean;
  optionalHolidayOff: boolean;
  religiousHolidayOff: boolean;
}

export interface BreakfastPolicy {
  autoDeduct: boolean;
  requireConfirmation: boolean;
}

export interface DailyReminderSettings {
  enabled: boolean;
  time: string;
}

export interface NotificationSettings {
  dailyReminder: DailyReminderSettings;
  lowBalanceThreshold: number;
}

export interface RegistrationSettings {
  allowRegistration: boolean;
  defaultRole: UserRole;
  requireEmailVerification: boolean;
  requireApproval: boolean;
}

export interface GlobalSettings {
  _id: string;
  defaultRates: DefaultRates;
  cutoffTimes: CutoffTimes;
  weekendPolicy: WeekendPolicy;
  holidayPolicy: HolidayPolicy;
  breakfastPolicy: BreakfastPolicy;
  notifications: NotificationSettings;
  registration: RegistrationSettings;
  systemName: string;
  modifiedBy?: string | UserBasic;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Feature Flag Types
// ============================================

export type FeatureFlagCategory =
  | 'core'
  | 'ui'
  | 'experimental'
  | 'beta'
  | 'maintenance';

export type FeatureFlagType =
  | 'boolean'
  | 'percentage'
  | 'user_list'
  | 'role_based';

export interface FeatureFlag {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  type: FeatureFlagType;
  isEnabled: boolean;
  percentage?: number;
  enabledRoles?: UserRole[];
  betaUsers?: string[];
  config?: Record<string, unknown>;
  createdBy: string | UserBasic;
  updatedBy?: string | UserBasic;
  history?: {
    action: string;
    previousValue: unknown;
    newValue: unknown;
    changedBy: string | UserBasic;
    reason?: string;
    changedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'system';

export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// Audit Log Types
// ============================================

export type AuditCategory =
  | 'auth'
  | 'user'
  | 'meal'
  | 'breakfast'
  | 'transaction'
  | 'settings'
  | 'holiday'
  | 'group'
  | 'system';

export interface AuditLog {
  _id: string;
  user: string | UserBasic;
  action: string;
  category: AuditCategory;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isCritical: boolean;
  createdAt: string;
}

export interface AuditLogSummary {
  totalLogs: number;
  byCategory: Record<AuditCategory, number>;
  byAction: Record<string, number>;
  criticalCount: number;
}

// ============================================
// Report Types
// ============================================

export interface MonthlyReportUser {
  userId: string;
  name: string;
  email: string;
  lunchCount: number;
  dinnerCount: number;
  lunchCharge: number;
  dinnerCharge: number;
  breakfastCharge: number;
  totalCharge: number;
  deposits: number;
  balance: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

export interface MonthlyReport {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  lunchRate: number;
  dinnerRate: number;
  totalLunchMeals: number;
  totalDinnerMeals: number;
  totalLunchCharge: number;
  totalDinnerCharge: number;
  totalBreakfastCharge: number;
  users?: MonthlyReportUser[];
  user?: MonthlyReportUser;
}

export interface DailyReportUser {
  user: {
    _id: string;
    name: string;
  };
  isOn: boolean;
  count: number;
  isManuallySet?: boolean;
}

export interface DailyReportSummary {
  totalUsers: number;
  mealsOn: number;
  mealsOff: number;
  totalMealCount: number;
}

export interface DailyReport {
  date: string;
  mealType: MealType;
  totalMeals: number;
  users: DailyReportUser[];
  summary: DailyReportSummary;
  isHoliday?: boolean;
  holidayName?: string;
  isDefaultOff?: boolean;
}

export interface WalletSummary {
  breakfast: {
    balance: number;
    totalDeposits: number;
    totalDeductions: number;
    isFrozen: boolean;
  };
  lunch: {
    balance: number;
    totalDeposits: number;
    totalDeductions: number;
    isFrozen: boolean;
  };
  dinner: {
    balance: number;
    totalDeposits: number;
    totalDeductions: number;
    isFrozen: boolean;
  };
  totalBalance: number;
}

export interface TopConsumer {
  userId: string;
  name: string;
  email: string;
  mealCount: number;
  totalCharge: number;
}

export interface Defaulter {
  userId: string;
  name: string;
  email: string;
  balance: number;
  balanceType: BalanceType | 'all';
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Auth Types
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  requiresTwoFactor?: boolean;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ============================================
// Form Types (for React Hook Form)
// ============================================

export interface BalanceUpdateForm {
  amount: number;
  balanceType: BalanceType;
  type: 'deposit' | 'deduction';
  description?: string;
}

export interface MealToggleForm {
  date: string;
  isOn: boolean;
  count?: number;
  mealType?: MealType;
  userId?: string;
}

export interface BreakfastSubmitForm {
  date: string;
  totalCost: number;
  participants: string[];
  description?: string;
}

export interface BreakfastIndividualForm {
  date: string;
  participantCosts: Record<string, number>;
  description?: string;
}

export interface MonthSettingsForm {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  lunchRate: number;
  dinnerRate: number;
  notes?: string;
}

export interface HolidayForm {
  date: string;
  name: string;
  nameBn: string;
  type: HolidayType;
  isRecurring?: boolean;
  recurringMonth?: number;
  recurringDay?: number;
}

export interface UserCreateForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
  group?: string;
}

export interface GroupForm {
  name: string;
  description?: string;
  code?: string;
  manager?: string;
  settings?: Partial<GroupSettings>;
}

// ============================================
// Component Prop Types
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

// ============================================
// Utility Types
// ============================================

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Extract ID from object or string
export type WithId<T> = T & { _id: string };

// Omit _id for create operations
export type CreateInput<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;

// Update input (partial without timestamps)
export type UpdateInput<T> = Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>;

// Populated vs unpopulated reference
export type Ref<T> = string | T;

// Extract keys that are strings
export type StringKeys<T> = Extract<keyof T, string>;
