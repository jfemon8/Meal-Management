import { Request, Response, NextFunction } from 'express';
import { Document, Types, Model } from 'mongoose';

// ==================== Common Types ====================
export type UserRole = 'user' | 'manager' | 'admin' | 'superadmin';
export type MealType = 'lunch' | 'dinner';
export type BalanceType = 'breakfast' | 'lunch' | 'dinner';
export type TransactionType = 'deposit' | 'deduction' | 'adjustment' | 'refund' | 'reversal';
export type HolidayType = 'government' | 'optional' | 'religious';
export type TwoFactorMethod = 'totp' | 'sms' | 'email';

// ==================== Express Extensions ====================
export interface AuthRequest extends Request {
  user?: IUserDocument;
}

export type AuthHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<void> | void;
export type AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => void;

// ==================== Balance Sub-document ====================
export interface IBalance {
  amount: number;
  isFrozen: boolean;
  frozenAt: Date | null;
  frozenBy: Types.ObjectId | null;
  frozenReason: string;
}

export interface IBalances {
  breakfast: IBalance;
  lunch: IBalance;
  dinner: IBalance;
}

// ==================== User ====================
export interface ILoginActivity {
  loginAt: Date;
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  location: string;
  status: 'success' | 'failed';
}

export interface IBackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface ITwoFactorAuth {
  isEnabled: boolean;
  secret: string | null;
  backupCodes: IBackupCode[];
  enabledAt?: Date;
  method: TwoFactorMethod;
}

export interface INotificationPreferences {
  email: {
    enabled: boolean;
    lowBalance: boolean;
    mealReminder: boolean;
    monthlyReport: boolean;
    systemUpdates: boolean;
  };
  push: {
    enabled: boolean;
    lowBalance: boolean;
    mealReminder: boolean;
  };
  sms: {
    enabled: boolean;
    lowBalance: boolean;
  };
}

export interface IUser {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  group: Types.ObjectId | null;
  isGroupManager: boolean;
  mustChangePassword: boolean;
  passwordResetBy: Types.ObjectId | null;
  passwordResetAt: Date | null;
  permissions: string[];
  balances: IBalances;
  balanceWarning: {
    threshold: number;
    notified: boolean;
    lastNotifiedAt: Date | null;
  };
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  deletedReason: string;
  restoredAt: Date | null;
  restoredBy: Types.ObjectId | null;
  profileImage: string;
  loginActivity: ILoginActivity[];
  notificationPreferences: INotificationPreferences;
  twoFactorAuth: ITwoFactorAuth;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  matchPassword(enteredPassword: string): Promise<boolean>;
  getTotalBalance(): number;
  isBalanceFrozen(balanceType: BalanceType): boolean;
  hasLowBalance(): boolean;
  getBalanceDetails(balanceType: BalanceType): IBalance | null;
  hasPermission(permission: string): boolean;
  getAllPermissions(): string[];
}

export type IUserDocument = Document<Types.ObjectId> & IUser & IUserMethods;
export type IUserModel = Model<IUser, {}, IUserMethods>;

// ==================== Meal ====================
export interface IMeal {
  user: Types.ObjectId;
  date: Date;
  mealType: MealType;
  isOn: boolean;
  count: number;
  modifiedBy: Types.ObjectId;
  isManuallySet: boolean;
  notes: string;
}

export type IMealDocument = Document<Types.ObjectId> & IMeal;

// ==================== Transaction ====================
export interface ITransaction {
  user: Types.ObjectId;
  type: TransactionType;
  balanceType: BalanceType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  reference: Types.ObjectId;
  referenceModel: 'Breakfast' | 'Meal' | 'MonthSettings' | 'Transaction';
  originalTransaction: Types.ObjectId | null;
  reversalReason: string;
  isReversed: boolean;
  performedBy: Types.ObjectId;
  isCorrected: boolean;
  correctedAt: Date | null;
  correctedBy: Types.ObjectId | null;
  correctionReason: string;
  originalAmount: number | null;
  originalDescription: string | null;
}

export type ITransactionDocument = Document<Types.ObjectId> & ITransaction;

// ==================== Breakfast ====================
export interface IBreakfastParticipant {
  user: Types.ObjectId;
  amount: number;
  deducted: boolean;
}

export interface IBreakfast {
  date: Date;
  totalCost: number;
  perPersonCost: number;
  participants: IBreakfastParticipant[];
  description: string;
  submittedBy: Types.ObjectId;
  isFinalized: boolean;
  finalizedBy: Types.ObjectId;
  finalizedAt: Date;
}

export type IBreakfastDocument = Document<Types.ObjectId> & IBreakfast;

// ==================== MonthSettings ====================
export interface IMonthSettings {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  lunchRate: number;
  dinnerRate: number;
  isFinalized: boolean;
  finalizedBy: Types.ObjectId;
  finalizedAt: Date;
  createdBy: Types.ObjectId;
}

export type IMonthSettingsDocument = Document<Types.ObjectId> & IMonthSettings;

// ==================== Holiday ====================
export interface IHoliday {
  date: Date;
  name: string;
  nameBn: string;
  type: HolidayType;
  isRecurring: boolean;
  recurringMonth: number;
  recurringDay: number;
  isActive: boolean;
  addedBy: Types.ObjectId;
}

export type IHolidayDocument = Document<Types.ObjectId> & IHoliday;

// ==================== Group ====================
export interface IGroup {
  name: string;
  description: string;
  manager: Types.ObjectId;
  members: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export type IGroupDocument = Document<Types.ObjectId> & IGroup;

// ==================== GlobalSettings ====================
export interface IGlobalSettings {
  type: string;
  defaultRates: { lunch: number; dinner: number };
  defaultMealStatus: { lunch: boolean; dinner: boolean };
  cutoffTimes: { lunch: number; dinner: number };
  weekendPolicy: {
    fridayOff: boolean;
    saturdayOff: boolean;
    oddSaturdayOff: boolean;
    evenSaturdayOff: boolean;
  };
  holidayPolicy: {
    governmentHolidayOff: boolean;
    optionalHolidayOff: boolean;
    religiousHolidayOff: boolean;
  };
  breakfastPolicy: {
    autoDeduct: boolean;
    requireConfirmation: boolean;
  };
  notifications: {
    dailyReminder: { enabled: boolean; time: number };
    lowBalanceWarning: { enabled: boolean; threshold: number };
  };
  registration: {
    allowRegistration: boolean;
    defaultRole: 'user' | 'manager';
    requireEmailVerification: boolean;
  };
  maintenance: {
    isEnabled: boolean;
    message: string;
    messageEn: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    allowedRoles: string[];
    allowedUsers: Types.ObjectId[];
    enabledBy: Types.ObjectId;
    enabledAt: Date;
    reason: string;
  };
  rateRules: {
    enabled: boolean;
    rules: IRateRule[];
  };
  modifiedBy: Types.ObjectId;
}

export interface IRateRule {
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditionType: 'day_of_week' | 'date_range' | 'holiday' | 'user_count' | 'special_event';
  conditionParams: {
    days?: number[];
    startDate?: Date;
    endDate?: Date;
    minUsers?: number;
    maxUsers?: number;
    holidayTypes?: string[];
    eventName?: string;
  };
  adjustment: {
    type: 'fixed' | 'percentage' | 'multiplier';
    value: number;
    applyTo: 'lunch' | 'dinner' | 'both';
  };
  validFrom?: Date;
  validUntil?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IGlobalSettingsDocument extends Document, IGlobalSettings {}

export interface IGlobalSettingsModel extends Model<IGlobalSettingsDocument> {
  getSettings(): Promise<IGlobalSettingsDocument>;
  updateSettings(updates: Partial<IGlobalSettings>, modifiedBy: Types.ObjectId): Promise<IGlobalSettingsDocument>;
}

// ==================== Notification ====================
export interface INotification {
  user: Types.ObjectId;
  type: string;
  title: string;
  titleBn: string;
  message: string;
  messageBn: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt: Date | null;
  channel: 'in_app' | 'email' | 'push' | 'sms';
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt: Date | null;
  error: string;
}

export type INotificationDocument = Document<Types.ObjectId> & INotification;

// ==================== AuditLog ====================
export interface IAuditLog {
  action: string;
  category: string;
  user: Types.ObjectId;
  targetUser: Types.ObjectId;
  targetModel: string;
  targetId: Types.ObjectId;
  details: Record<string, any>;
  changes: { field: string; oldValue: any; newValue: any }[];
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  errorMessage: string;
}

export type IAuditLogDocument = Document<Types.ObjectId> & IAuditLog;

// ==================== RefreshToken ====================
export interface IRefreshToken {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    ip: string;
  };
  replacedByToken: string | null;
}

export type IRefreshTokenDocument = Document<Types.ObjectId> & IRefreshToken;

// ==================== Misc ====================
export interface IFeatureFlag {
  name: string;
  description: string;
  isEnabled: boolean;
  enabledFor: { roles: UserRole[]; users: Types.ObjectId[] };
  metadata: Record<string, any>;
  createdBy: Types.ObjectId;
}

export type IFeatureFlagDocument = Document<Types.ObjectId> & IFeatureFlag;

export interface IRuleOverride {
  name: string;
  description: string;
  ruleType: string;
  conditions: Record<string, any>;
  adjustments: Record<string, any>;
  isActive: boolean;
  priority: number;
  validFrom: Date;
  validUntil: Date;
  createdBy: Types.ObjectId;
}

export type IRuleOverrideDocument = Document<Types.ObjectId> & IRuleOverride;

export interface IPerformanceMetric {
  type: string;
  name: string;
  value: number;
  unit: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export type IPerformanceMetricDocument = Document<Types.ObjectId> & IPerformanceMetric;

export interface IErrorLog {
  error: string;
  message: string;
  stack: string;
  url: string;
  method: string;
  statusCode: number;
  user: Types.ObjectId;
  metadata: Record<string, any>;
}

export type IErrorLogDocument = Document<Types.ObjectId> & IErrorLog;

export interface IMealAuditLog {
  user: Types.ObjectId;
  meal: Types.ObjectId;
  action: string;
  previousState: Record<string, any>;
  newState: Record<string, any>;
  performedBy: Types.ObjectId;
  reason: string;
}

export type IMealAuditLogDocument = Document<Types.ObjectId> & IMealAuditLog;

export interface ILoginHistory {
  user?: Types.ObjectId;  // Optional - failed logins for non-existent users won't have a user
  loginAt: Date;
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  status: 'success' | 'failed';
  failureReason: string;
}

export type ILoginHistoryDocument = Document<Types.ObjectId> & ILoginHistory;

export interface IOTP {
  user: Types.ObjectId;
  email: string;
  otp: string;
  type: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
  attempts: number;
}

export type IOTPDocument = Document<Types.ObjectId> & IOTP;

// ==================== Meal Rules Service Types ====================
export interface MealOffResult {
  isOff: boolean;
  reason: string | null;
  source: string | null;
  holiday?: IHolidayDocument;
}

export interface CutoffResult {
  passed: boolean;
  cutoffHour: number;
  currentHour: number;
  isToday?: boolean;
}

export interface MealTogglePermission {
  canToggle: boolean;
  reason: string | null;
  source: string;
}

export interface EffectiveMealStatus {
  isOn: boolean;
  count: number;
  source: string;
  reason: string;
}
