import React, { useState, useEffect, type ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import {
  useGlobalSettings,
  useUpdateGlobalSettings,
  useResetGlobalSettings,
} from '../../hooks/queries/useGlobalSettings';
import {
  FiSettings,
  FiClock,
  FiCalendar,
  FiSun,
  FiBell,
  FiUserPlus,
  FiRefreshCw,
  FiSave,
  FiAlertTriangle,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import BDTIcon from '../../components/Icons/BDTIcon';

// ============================================
// Types
// ============================================

interface DailyReminder {
  enabled: boolean;
  time: number;
}

interface LowBalanceWarning {
  enabled: boolean;
  threshold: number;
}

interface Notifications {
  dailyReminder: DailyReminder;
  lowBalanceWarning: LowBalanceWarning;
}

interface DefaultRates {
  lunch: number;
  dinner: number;
}

interface DefaultMealStatus {
  lunch: boolean;
  dinner: boolean;
}

interface CutoffTimes {
  lunch: number;
  dinner: number;
}

interface WeekendPolicy {
  fridayOff: boolean;
  saturdayOff: boolean;
  oddSaturdayOff: boolean;
  evenSaturdayOff: boolean;
}

interface HolidayPolicy {
  governmentHolidayOff: boolean;
  optionalHolidayOff: boolean;
  religiousHolidayOff: boolean;
}

interface Registration {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultRole: 'user' | 'manager';
}

interface FormData {
  defaultRates: DefaultRates;
  defaultMealStatus: DefaultMealStatus;
  cutoffTimes: CutoffTimes;
  weekendPolicy: WeekendPolicy;
  holidayPolicy: HolidayPolicy;
  notifications: Notifications;
  registration: Registration;
}

interface GlobalSettings extends FormData {
  updatedAt?: string;
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

interface SectionCardProps {
  icon: IconType | React.FC<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  color?: string;
}

// ============================================
// Component
// ============================================

const AdminSettings: React.FC = () => {
  const { data: settings, isLoading, error, refetch } = useGlobalSettings();
  const updateMutation = useUpdateGlobalSettings();
  const resetMutation = useResetGlobalSettings();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      const globalSettings = settings as GlobalSettings;
      setFormData({
        defaultRates: { ...globalSettings.defaultRates },
        defaultMealStatus: { ...globalSettings.defaultMealStatus },
        cutoffTimes: { ...globalSettings.cutoffTimes },
        weekendPolicy: { ...globalSettings.weekendPolicy },
        holidayPolicy: { ...globalSettings.holidayPolicy },
        notifications: {
          dailyReminder: { ...globalSettings.notifications.dailyReminder },
          lowBalanceWarning: { ...globalSettings.notifications.lowBalanceWarning },
        },
        registration: { ...globalSettings.registration },
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = <K extends keyof FormData>(
    section: K,
    field: keyof FormData[K],
    value: FormData[K][keyof FormData[K]]
  ): void => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
    setHasChanges(true);
  };

  const handleNestedChange = <
    K extends 'notifications',
    S extends keyof FormData[K],
    F extends keyof FormData[K][S]
  >(
    section: K,
    subsection: S,
    field: F,
    value: FormData[K][S][F]
  ): void => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [field]: value,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData) return;
    try {
      await updateMutation.mutateAsync(formData);
      toast.success('সেটিংস সংরক্ষণ হয়েছে');
      setHasChanges(false);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'সেটিংস সংরক্ষণে সমস্যা হয়েছে');
    }
  };

  const handleReset = async (): Promise<void> => {
    try {
      await resetMutation.mutateAsync();
      toast.success('সেটিংস ডিফল্টে রিসেট হয়েছে');
      setShowResetConfirm(false);
    } catch {
      toast.error('রিসেট করতে সমস্যা হয়েছে');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 dark:text-gray-400">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            সেটিংস লোড করতে সমস্যা হয়েছে
          </h2>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        onClick={() => onChange(!enabled)}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </div>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );

  const SectionCard: React.FC<SectionCardProps> = ({ icon: Icon, title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700 bg-primary-50 dark:bg-primary-900/20">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );

  const globalSettings = settings as GlobalSettings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiSettings className="text-primary-600" />
            সিস্টেম সেটিংস
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            গ্লোবাল সেটিংস কনফিগার করুন
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            ডিফল্টে রিসেট
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <FiSave className={`w-4 h-4 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
            সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300">
            আপনার অসংরক্ষিত পরিবর্তন আছে। সংরক্ষণ করতে ভুলবেন না।
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Default Rates */}
        <SectionCard icon={BDTIcon} title="ডিফল্ট মিল রেট">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            মাসের সেটিংস না থাকলে এই রেট ব্যবহার হবে
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                দুপুরের খাবার (৳)
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultRates.lunch}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange('defaultRates', 'lunch', Number(e.target.value))
                }
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                রাতের খাবার (৳)
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultRates.dinner}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange('defaultRates', 'dinner', Number(e.target.value))
                }
                className="input w-full"
              />
            </div>
          </div>
        </SectionCard>

        {/* Cutoff Times */}
        <SectionCard icon={FiClock} title="কাটঅফ টাইম">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            এই সময়ের পর মিল অন/অফ করা যাবে না
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                দুপুরের খাবার (ঘণ্টা)
              </label>
              <select
                value={formData.cutoffTimes.lunch}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  handleChange('cutoffTimes', 'lunch', Number(e.target.value))
                }
                className="input w-full"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0
                      ? '১২:০০ AM'
                      : i < 12
                        ? `${i}:০০ AM`
                        : i === 12
                          ? '১২:০০ PM'
                          : `${i - 12}:০০ PM`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                রাতের খাবার (ঘণ্টা)
              </label>
              <select
                value={formData.cutoffTimes.dinner}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  handleChange('cutoffTimes', 'dinner', Number(e.target.value))
                }
                className="input w-full"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0
                      ? '১২:০০ AM'
                      : i < 12
                        ? `${i}:০০ AM`
                        : i === 12
                          ? '১২:০০ PM'
                          : `${i - 12}:০০ PM`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Weekend Policy */}
        <SectionCard icon={FiCalendar} title="উইকেন্ড পলিসি">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            সাপ্তাহিক ছুটির দিনে মিল অফ থাকবে কি না
          </p>
          <div className="space-y-3">
            <ToggleSwitch
              enabled={formData.weekendPolicy.fridayOff}
              onChange={(val) => handleChange('weekendPolicy', 'fridayOff', val)}
              label="শুক্রবার অফ"
            />
            <ToggleSwitch
              enabled={formData.weekendPolicy.saturdayOff}
              onChange={(val) => handleChange('weekendPolicy', 'saturdayOff', val)}
              label="সব শনিবার অফ"
            />
            <ToggleSwitch
              enabled={formData.weekendPolicy.oddSaturdayOff}
              onChange={(val) => handleChange('weekendPolicy', 'oddSaturdayOff', val)}
              label="বিজোড় শনিবার অফ (১ম, ৩য়, ৫ম)"
            />
            <ToggleSwitch
              enabled={formData.weekendPolicy.evenSaturdayOff}
              onChange={(val) => handleChange('weekendPolicy', 'evenSaturdayOff', val)}
              label="জোড় শনিবার অফ (২য়, ৪র্থ)"
            />
          </div>
        </SectionCard>

        {/* Holiday Policy */}
        <SectionCard icon={FiSun} title="ছুটির পলিসি">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            ছুটির দিনে স্বয়ংক্রিয়ভাবে মিল অফ
          </p>
          <div className="space-y-3">
            <ToggleSwitch
              enabled={formData.holidayPolicy.governmentHolidayOff}
              onChange={(val) => handleChange('holidayPolicy', 'governmentHolidayOff', val)}
              label="সরকারি ছুটিতে অফ"
            />
            <ToggleSwitch
              enabled={formData.holidayPolicy.optionalHolidayOff}
              onChange={(val) => handleChange('holidayPolicy', 'optionalHolidayOff', val)}
              label="ঐচ্ছিক ছুটিতে অফ"
            />
            <ToggleSwitch
              enabled={formData.holidayPolicy.religiousHolidayOff}
              onChange={(val) => handleChange('holidayPolicy', 'religiousHolidayOff', val)}
              label="ধর্মীয় ছুটিতে অফ"
            />
          </div>
        </SectionCard>

        {/* Notification Settings */}
        <SectionCard icon={FiBell} title="নোটিফিকেশন সেটিংস">
          <div className="space-y-5">
            {/* Daily Reminder */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  দৈনিক রিমাইন্ডার
                </span>
                <ToggleSwitch
                  enabled={formData.notifications.dailyReminder.enabled}
                  onChange={(val) =>
                    handleNestedChange('notifications', 'dailyReminder', 'enabled', val)
                  }
                  label=""
                />
              </div>
              {formData.notifications.dailyReminder.enabled && (
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    রিমাইন্ডার সময়
                  </label>
                  <select
                    value={formData.notifications.dailyReminder.time}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      handleNestedChange(
                        'notifications',
                        'dailyReminder',
                        'time',
                        Number(e.target.value)
                      )
                    }
                    className="input w-full"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0
                          ? '১২:০০ AM'
                          : i < 12
                            ? `${i}:০০ AM`
                            : i === 12
                              ? '১২:০০ PM'
                              : `${i - 12}:০০ PM`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Low Balance Warning */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  কম ব্যালেন্স সতর্কতা
                </span>
                <ToggleSwitch
                  enabled={formData.notifications.lowBalanceWarning.enabled}
                  onChange={(val) =>
                    handleNestedChange('notifications', 'lowBalanceWarning', 'enabled', val)
                  }
                  label=""
                />
              </div>
              {formData.notifications.lowBalanceWarning.enabled && (
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    থ্রেশহোল্ড (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.notifications.lowBalanceWarning.threshold}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleNestedChange(
                        'notifications',
                        'lowBalanceWarning',
                        'threshold',
                        Number(e.target.value)
                      )
                    }
                    className="input w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Registration Settings */}
        <SectionCard icon={FiUserPlus} title="রেজিস্ট্রেশন সেটিংস">
          <div className="space-y-4">
            <ToggleSwitch
              enabled={formData.registration.allowRegistration}
              onChange={(val) => handleChange('registration', 'allowRegistration', val)}
              label="নতুন রেজিস্ট্রেশন অনুমতি দিন"
            />
            <ToggleSwitch
              enabled={formData.registration.requireEmailVerification}
              onChange={(val) => handleChange('registration', 'requireEmailVerification', val)}
              label="ইমেইল ভেরিফিকেশন প্রয়োজন"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ডিফল্ট রোল
              </label>
              <select
                value={formData.registration.defaultRole}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  handleChange('registration', 'defaultRole', e.target.value as 'user' | 'manager')
                }
                className="input w-full"
              >
                <option value="user">ইউজার</option>
                <option value="manager">ম্যানেজার</option>
              </select>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Default Meal Status */}
      <SectionCard icon={FiCheck} title="নতুন ইউজারের ডিফল্ট মিল স্ট্যাটাস">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          নতুন ইউজারদের জন্য মিল ডিফল্টভাবে অন/অফ থাকবে
        </p>
        <div className="flex flex-wrap gap-6">
          <ToggleSwitch
            enabled={formData.defaultMealStatus.lunch}
            onChange={(val) => handleChange('defaultMealStatus', 'lunch', val)}
            label="দুপুরের খাবার অন"
          />
          <ToggleSwitch
            enabled={formData.defaultMealStatus.dinner}
            onChange={(val) => handleChange('defaultMealStatus', 'dinner', val)}
            label="রাতের খাবার অন"
          />
        </div>
      </SectionCard>

      {/* Last Updated */}
      {globalSettings?.updatedAt && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500">
          সর্বশেষ আপডেট: {new Date(globalSettings.updatedAt).toLocaleString('bn-BD')}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <FiAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                ডিফল্টে রিসেট করুন?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              সব সেটিংস ডিফল্ট মানে ফিরে যাবে। এই কাজটি আনডু করা যাবে না।
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-outline flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                বাতিল
              </button>
              <button
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <FiRefreshCw
                  className={`w-4 h-4 ${resetMutation.isPending ? 'animate-spin' : ''}`}
                />
                রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
