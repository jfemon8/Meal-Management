import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
    FiSettings,
    FiTool,
    FiDollarSign,
    FiPower,
    FiCalendar,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiX,
    FiCheck,
    FiClock,
    FiPercent,
    FiHash,
    FiUsers
} from 'react-icons/fi';
import {
    useMaintenanceStatus,
    useEnableMaintenance,
    useDisableMaintenance,
    useScheduleMaintenance,
    useRateRules,
    useToggleRateRules,
    useAddRateRule,
    useUpdateRateRule,
    useDeleteRateRule,
    useTestRateCalculation
} from '../../hooks/queries/useSystemConfig';

const SystemConfig = () => {
    const [activeTab, setActiveTab] = useState('maintenance');
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRuleIndex, setEditingRuleIndex] = useState(null);
    const [testResult, setTestResult] = useState(null);

    // Maintenance form
    const [maintenanceForm, setMaintenanceForm] = useState({
        message: '',
        messageEn: '',
        scheduledStart: '',
        scheduledEnd: '',
        reason: '',
        isScheduled: false
    });

    // Rule form
    const [ruleForm, setRuleForm] = useState({
        name: '',
        description: '',
        conditionType: 'day_of_week',
        conditionParams: { days: [] },
        adjustment: { type: 'percentage', value: 0, applyTo: 'both' },
        priority: 0
    });

    // Test form
    const [testForm, setTestForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        mealType: 'lunch',
        userCount: 10
    });

    // Queries
    const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenanceStatus();
    const { data: rateRulesData, isLoading: rulesLoading } = useRateRules();

    // Mutations
    const enableMaintenance = useEnableMaintenance();
    const disableMaintenance = useDisableMaintenance();
    const scheduleMaintenance = useScheduleMaintenance();
    const toggleRateRules = useToggleRateRules();
    const addRateRule = useAddRateRule();
    const updateRateRule = useUpdateRateRule();
    const deleteRateRule = useDeleteRateRule();
    const testRateCalc = useTestRateCalculation();

    const tabs = [
        { id: 'maintenance', label: 'মেইনটেন্যান্স মোড', icon: FiTool },
        { id: 'rates', label: 'রেট রুলস', icon: FiDollarSign }
    ];

    const conditionTypes = [
        { value: 'day_of_week', label: 'সপ্তাহের দিন' },
        { value: 'date_range', label: 'তারিখ পরিসীমা' },
        { value: 'user_count', label: 'ইউজার সংখ্যা' },
        { value: 'special_event', label: 'বিশেষ ইভেন্ট' }
    ];

    const adjustmentTypes = [
        { value: 'fixed', label: 'নির্দিষ্ট মূল্য' },
        { value: 'percentage', label: 'শতাংশ পরিবর্তন' },
        { value: 'multiplier', label: 'গুণক' }
    ];

    const daysOfWeek = [
        { value: 0, label: 'রবি' },
        { value: 1, label: 'সোম' },
        { value: 2, label: 'মঙ্গল' },
        { value: 3, label: 'বুধ' },
        { value: 4, label: 'বৃহস্পতি' },
        { value: 5, label: 'শুক্র' },
        { value: 6, label: 'শনি' }
    ];

    const handleEnableMaintenance = async () => {
        try {
            if (maintenanceForm.isScheduled) {
                await scheduleMaintenance.mutateAsync({
                    scheduledStart: maintenanceForm.scheduledStart,
                    scheduledEnd: maintenanceForm.scheduledEnd,
                    message: maintenanceForm.message,
                    messageEn: maintenanceForm.messageEn,
                    reason: maintenanceForm.reason
                });
            } else {
                await enableMaintenance.mutateAsync({
                    message: maintenanceForm.message,
                    messageEn: maintenanceForm.messageEn,
                    reason: maintenanceForm.reason
                });
            }
            setShowMaintenanceModal(false);
            setMaintenanceForm({ message: '', messageEn: '', scheduledStart: '', scheduledEnd: '', reason: '', isScheduled: false });
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleDisableMaintenance = async () => {
        if (!window.confirm('মেইনটেন্যান্স মোড বন্ধ করতে চান?')) return;
        try {
            await disableMaintenance.mutateAsync();
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleToggleRateRules = async () => {
        try {
            await toggleRateRules.mutateAsync();
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleSaveRule = async () => {
        try {
            if (editingRuleIndex !== null) {
                await updateRateRule.mutateAsync({ index: editingRuleIndex, ...ruleForm });
            } else {
                await addRateRule.mutateAsync(ruleForm);
            }
            setShowRuleModal(false);
            setEditingRuleIndex(null);
            setRuleForm({
                name: '',
                description: '',
                conditionType: 'day_of_week',
                conditionParams: { days: [] },
                adjustment: { type: 'percentage', value: 0, applyTo: 'both' },
                priority: 0
            });
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleDeleteRule = async (index) => {
        if (!window.confirm('এই রুল মুছে ফেলতে চান?')) return;
        try {
            await deleteRateRule.mutateAsync(index);
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const handleEditRule = (rule, index) => {
        setRuleForm({
            name: rule.name,
            description: rule.description || '',
            conditionType: rule.conditionType,
            conditionParams: rule.conditionParams || { days: [] },
            adjustment: rule.adjustment || { type: 'percentage', value: 0, applyTo: 'both' },
            priority: rule.priority || 0
        });
        setEditingRuleIndex(index);
        setShowRuleModal(true);
    };

    const handleTestRate = async () => {
        try {
            const result = await testRateCalc.mutateAsync(testForm);
            setTestResult(result);
        } catch (error) {
            alert(error.response?.data?.message || 'এরর হয়েছে');
        }
    };

    const formatDateTime = (dateStr) => {
        try {
            return format(parseISO(dateStr), 'd MMM yyyy, h:mm a', { locale: bn });
        } catch {
            return dateStr;
        }
    };

    const toggleDay = (day) => {
        const days = ruleForm.conditionParams.days || [];
        if (days.includes(day)) {
            setRuleForm({
                ...ruleForm,
                conditionParams: { ...ruleForm.conditionParams, days: days.filter(d => d !== day) }
            });
        } else {
            setRuleForm({
                ...ruleForm,
                conditionParams: { ...ruleForm.conditionParams, days: [...days, day] }
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <FiSettings className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">সিস্টেম কনফিগারেশন</h1>
                </div>
                <p className="text-cyan-100">
                    মেইনটেন্যান্স মোড এবং অ্যাডভান্সড রেট রুলস কনফিগার করুন
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Maintenance Tab */}
                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">
                            {/* Current Status */}
                            <div className={`p-6 rounded-lg border ${
                                maintenanceData?.isActive
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {maintenanceData?.isActive ? (
                                            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                                                <FiTool className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                                                <FiPower className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className={`text-lg font-semibold ${
                                                maintenanceData?.isActive
                                                    ? 'text-red-800 dark:text-red-200'
                                                    : 'text-green-800 dark:text-green-200'
                                            }`}>
                                                {maintenanceData?.isActive ? 'মেইনটেন্যান্স মোড চালু' : 'সিস্টেম সচল'}
                                            </h3>
                                            {maintenanceData?.maintenance?.scheduledEnd && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    শেষ হবে: {formatDateTime(maintenanceData.maintenance.scheduledEnd)}
                                                </p>
                                            )}
                                            {maintenanceData?.maintenance?.reason && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    কারণ: {maintenanceData.maintenance.reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {maintenanceData?.isActive ? (
                                        <button
                                            onClick={handleDisableMaintenance}
                                            disabled={disableMaintenance.isPending}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                        >
                                            <FiPower className="w-4 h-4" />
                                            বন্ধ করুন
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowMaintenanceModal(true)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <FiTool className="w-4 h-4" />
                                            চালু করুন
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">মেইনটেন্যান্স মোড সম্পর্কে</h4>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>• মেইনটেন্যান্স মোড চালু থাকলে সাধারণ ইউজাররা সিস্টেম ব্যবহার করতে পারবে না</li>
                                    <li>• শুধুমাত্র SuperAdmin লগইন করতে এবং কাজ করতে পারবেন</li>
                                    <li>• শিডিউল করা মেইনটেন্যান্স নির্দিষ্ট সময়ে স্বয়ংক্রিয়ভাবে শুরু/শেষ হবে</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Rate Rules Tab */}
                    {activeTab === 'rates' && (
                        <div className="space-y-6">
                            {/* Toggle and Add */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleToggleRateRules}
                                        disabled={toggleRateRules.isPending}
                                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                            rateRulesData?.enabled
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {rateRulesData?.enabled ? <FiPower className="w-4 h-4" /> : <FiPower className="w-4 h-4" />}
                                        {rateRulesData?.enabled ? 'চালু আছে' : 'বন্ধ আছে'}
                                    </button>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {rateRulesData?.rules?.length || 0} টি রুল
                                    </span>
                                </div>

                                <button
                                    onClick={() => {
                                        setEditingRuleIndex(null);
                                        setRuleForm({
                                            name: '',
                                            description: '',
                                            conditionType: 'day_of_week',
                                            conditionParams: { days: [] },
                                            adjustment: { type: 'percentage', value: 0, applyTo: 'both' },
                                            priority: 0
                                        });
                                        setShowRuleModal(true);
                                    }}
                                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    নতুন রুল
                                </button>
                            </div>

                            {/* Rules List */}
                            {rulesLoading ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
                            ) : !rateRulesData?.rules?.length ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <FiDollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>কোনো রেট রুল নেই</p>
                                    <p className="text-sm">নতুন রুল যোগ করতে উপরের বাটনে ক্লিক করুন</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rateRulesData.rules.map((rule, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border ${
                                                rule.isActive
                                                    ? 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                                            {rule.name}
                                                        </h4>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            rule.isActive
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                                                        }`}>
                                                            {rule.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                                            প্রায়োরিটি: {rule.priority}
                                                        </span>
                                                    </div>
                                                    {rule.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {rule.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                                                            {conditionTypes.find(c => c.value === rule.conditionType)?.label || rule.conditionType}
                                                        </span>
                                                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                                            {rule.adjustment?.type === 'fixed' && `৳${rule.adjustment.value}`}
                                                            {rule.adjustment?.type === 'percentage' && `${rule.adjustment.value > 0 ? '+' : ''}${rule.adjustment.value}%`}
                                                            {rule.adjustment?.type === 'multiplier' && `×${rule.adjustment.value}`}
                                                        </span>
                                                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded">
                                                            {rule.adjustment?.applyTo === 'both' ? 'লাঞ্চ ও ডিনার' :
                                                             rule.adjustment?.applyTo === 'lunch' ? 'শুধু লাঞ্চ' : 'শুধু ডিনার'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditRule(rule, index)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(index)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Test Calculator */}
                            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-4">রেট ক্যালকুলেটর টেস্ট</h4>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">তারিখ</label>
                                        <input
                                            type="date"
                                            value={testForm.date}
                                            onChange={(e) => setTestForm({ ...testForm, date: e.target.value })}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">মিল টাইপ</label>
                                        <select
                                            value={testForm.mealType}
                                            onChange={(e) => setTestForm({ ...testForm, mealType: e.target.value })}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                        >
                                            <option value="lunch">লাঞ্চ</option>
                                            <option value="dinner">ডিনার</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleTestRate}
                                        disabled={testRateCalc.isPending}
                                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                                    >
                                        টেস্ট করুন
                                    </button>
                                </div>

                                {testResult && (
                                    <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">বেস রেট:</span>
                                                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">৳{testResult.baseRate}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">ফাইনাল রেট:</span>
                                                <span className="ml-2 font-medium text-green-600 dark:text-green-400">৳{testResult.finalRate}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">প্রযোজ্য রুল:</span>
                                                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{testResult.appliedRules?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Maintenance Modal */}
            {showMaintenanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    মেইনটেন্যান্স মোড চালু করুন
                                </h3>
                                <button
                                    onClick={() => setShowMaintenanceModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    বার্তা (বাংলা)
                                </label>
                                <input
                                    type="text"
                                    value={maintenanceForm.message}
                                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, message: e.target.value })}
                                    placeholder="সিস্টেম রক্ষণাবেক্ষণ চলছে..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    বার্তা (English)
                                </label>
                                <input
                                    type="text"
                                    value={maintenanceForm.messageEn}
                                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, messageEn: e.target.value })}
                                    placeholder="System under maintenance..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    কারণ
                                </label>
                                <input
                                    type="text"
                                    value={maintenanceForm.reason}
                                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reason: e.target.value })}
                                    placeholder="ডাটাবেজ আপগ্রেড..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="scheduled"
                                    checked={maintenanceForm.isScheduled}
                                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, isScheduled: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="scheduled" className="text-sm text-gray-700 dark:text-gray-300">
                                    শিডিউল করা মেইনটেন্যান্স
                                </label>
                            </div>

                            {maintenanceForm.isScheduled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            শুরু
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={maintenanceForm.scheduledStart}
                                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledStart: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            শেষ
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={maintenanceForm.scheduledEnd}
                                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledEnd: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowMaintenanceModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleEnableMaintenance}
                                disabled={enableMaintenance.isPending || scheduleMaintenance.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {maintenanceForm.isScheduled ? 'শিডিউল করুন' : 'চালু করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Modal */}
            {showRuleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    {editingRuleIndex !== null ? 'রুল সম্পাদনা' : 'নতুন রেট রুল'}
                                </h3>
                                <button
                                    onClick={() => setShowRuleModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">নাম *</label>
                                <input
                                    type="text"
                                    value={ruleForm.name}
                                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                                    placeholder="সাপ্তাহিক ছুটির দিনে ছাড়"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">বিবরণ</label>
                                <input
                                    type="text"
                                    value={ruleForm.description}
                                    onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">কন্ডিশন টাইপ</label>
                                    <select
                                        value={ruleForm.conditionType}
                                        onChange={(e) => setRuleForm({ ...ruleForm, conditionType: e.target.value, conditionParams: {} })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    >
                                        {conditionTypes.map((ct) => (
                                            <option key={ct.value} value={ct.value}>{ct.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">প্রায়োরিটি</label>
                                    <input
                                        type="number"
                                        value={ruleForm.priority}
                                        onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    />
                                </div>
                            </div>

                            {/* Condition Params */}
                            {ruleForm.conditionType === 'day_of_week' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">দিন নির্বাচন করুন</label>
                                    <div className="flex flex-wrap gap-2">
                                        {daysOfWeek.map((day) => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                                    ruleForm.conditionParams?.days?.includes(day.value)
                                                        ? 'bg-cyan-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {ruleForm.conditionType === 'date_range' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">শুরু</label>
                                        <input
                                            type="date"
                                            value={ruleForm.conditionParams?.startDate || ''}
                                            onChange={(e) => setRuleForm({
                                                ...ruleForm,
                                                conditionParams: { ...ruleForm.conditionParams, startDate: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">শেষ</label>
                                        <input
                                            type="date"
                                            value={ruleForm.conditionParams?.endDate || ''}
                                            onChange={(e) => setRuleForm({
                                                ...ruleForm,
                                                conditionParams: { ...ruleForm.conditionParams, endDate: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Adjustment */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">অ্যাডজাস্টমেন্ট টাইপ</label>
                                    <select
                                        value={ruleForm.adjustment?.type || 'percentage'}
                                        onChange={(e) => setRuleForm({
                                            ...ruleForm,
                                            adjustment: { ...ruleForm.adjustment, type: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    >
                                        {adjustmentTypes.map((at) => (
                                            <option key={at.value} value={at.value}>{at.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">মান</label>
                                    <input
                                        type="number"
                                        value={ruleForm.adjustment?.value || 0}
                                        onChange={(e) => setRuleForm({
                                            ...ruleForm,
                                            adjustment: { ...ruleForm.adjustment, value: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">প্রযোজ্য</label>
                                    <select
                                        value={ruleForm.adjustment?.applyTo || 'both'}
                                        onChange={(e) => setRuleForm({
                                            ...ruleForm,
                                            adjustment: { ...ruleForm.adjustment, applyTo: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                    >
                                        <option value="both">উভয়</option>
                                        <option value="lunch">লাঞ্চ</option>
                                        <option value="dinner">ডিনার</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowRuleModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleSaveRule}
                                disabled={addRateRule.isPending || updateRateRule.isPending || !ruleForm.name}
                                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <FiCheck className="w-4 h-4" />
                                {editingRuleIndex !== null ? 'আপডেট করুন' : 'যোগ করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemConfig;
