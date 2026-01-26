import React, { useState } from 'react';
import {
    FiFlag,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiToggleLeft,
    FiToggleRight,
    FiFilter,
    FiSearch,
    FiX,
    FiClock,
    FiUsers,
    FiPercent,
    FiGlobe,
    FiChevronDown,
    FiChevronUp,
    FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
    useFeatureFlags,
    useFeatureFlag,
    useCreateFeatureFlag,
    useUpdateFeatureFlag,
    useToggleFeatureFlag,
    useDeleteFeatureFlag,
    useFeatureFlagCategories
} from '../../hooks/queries/useFeatureFlags';

const categoryColors = {
    meal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    transaction: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    user: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    report: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    notification: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    experimental: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const categoryLabels = {
    meal: 'মিল',
    transaction: 'লেনদেন',
    user: 'ইউজার',
    report: 'রিপোর্ট',
    notification: 'নোটিফিকেশন',
    system: 'সিস্টেম',
    experimental: 'পরীক্ষামূলক'
};

const roleLabels = {
    user: 'ইউজার',
    manager: 'ম্যানেজার',
    admin: 'এডমিন',
    superadmin: 'সুপার এডমিন'
};

const FeatureFlags = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterEnabled, setFilterEnabled] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingFlag, setEditingFlag] = useState(null);
    const [expandedFlag, setExpandedFlag] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const { data: flags = [], isLoading } = useFeatureFlags({
        category: filterCategory || undefined,
        enabled: filterEnabled !== '' ? filterEnabled === 'true' : undefined
    });
    const { data: categories = [] } = useFeatureFlagCategories();

    const createMutation = useCreateFeatureFlag();
    const updateMutation = useUpdateFeatureFlag();
    const toggleMutation = useToggleFeatureFlag();
    const deleteMutation = useDeleteFeatureFlag();

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flag.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = async (flag) => {
        try {
            await toggleMutation.mutateAsync({
                id: flag._id,
                reason: flag.isEnabled ? 'ফিচার বন্ধ করা হয়েছে' : 'ফিচার চালু করা হয়েছে'
            });
            toast.success(flag.isEnabled ? 'ফিচার বন্ধ করা হয়েছে' : 'ফিচার চালু করা হয়েছে');
        } catch (error) {
            toast.error('অপারেশন ব্যর্থ');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('ফিচার ফ্ল্যাগ মুছে ফেলা হয়েছে');
            setShowDeleteConfirm(null);
        } catch (error) {
            toast.error('মুছতে ব্যর্থ');
        }
    };

    const getCategoryCounts = () => {
        const counts = {};
        flags.forEach(f => {
            counts[f.category] = (counts[f.category] || 0) + 1;
        });
        return counts;
    };

    const categoryCounts = getCategoryCounts();
    const enabledCount = flags.filter(f => f.isEnabled).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <FiFlag className="text-primary-600" />
                        ফিচার ফ্ল্যাগ ম্যানেজমেন্ট
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        ফিচার রোলআউট এবং A/B টেস্টিং কন্ট্রোল করুন
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <FiPlus className="w-5 h-5" />
                    নতুন ফিচার ফ্ল্যাগ
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">মোট ফ্ল্যাগ</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{flags.length}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">চালু আছে</p>
                    <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">বন্ধ আছে</p>
                    <p className="text-2xl font-bold text-red-600">{flags.length - enabledCount}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-500 dark:text-gray-400">পরীক্ষামূলক</p>
                    <p className="text-2xl font-bold text-orange-600">{categoryCounts.experimental || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="নাম, কী বা বর্ণনা দিয়ে সার্চ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="">সব ক্যাটাগরি</option>
                        {categories.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterEnabled}
                        onChange={(e) => setFilterEnabled(e.target.value)}
                        className="input w-full md:w-32"
                    >
                        <option value="">সব স্ট্যাটাস</option>
                        <option value="true">চালু</option>
                        <option value="false">বন্ধ</option>
                    </select>
                </div>
            </div>

            {/* Feature Flags List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                    <div className="flex-1">
                                        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredFlags.length === 0 ? (
                    <div className="card text-center py-12">
                        <FiFlag className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">কোনো ফিচার ফ্ল্যাগ পাওয়া যায়নি</p>
                    </div>
                ) : (
                    filteredFlags.map(flag => (
                        <div key={flag._id} className="card">
                            <div className="flex items-start gap-4">
                                {/* Toggle */}
                                <button
                                    onClick={() => handleToggle(flag)}
                                    disabled={toggleMutation.isPending}
                                    className={`p-2 rounded-lg transition-colors ${
                                        flag.isEnabled
                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                    }`}
                                >
                                    {flag.isEnabled ? (
                                        <FiToggleRight className="w-8 h-8" />
                                    ) : (
                                        <FiToggleLeft className="w-8 h-8" />
                                    )}
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                            {flag.name}
                                        </h3>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColors[flag.category]}`}>
                                            {categoryLabels[flag.category]}
                                        </span>
                                        {flag.rolloutPercentage < 100 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                                                <FiPercent className="w-3 h-3" />
                                                {flag.rolloutPercentage}%
                                            </span>
                                        )}
                                        {flag.allowedUsers?.length > 0 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                                                <FiUsers className="w-3 h-3" />
                                                বেটা
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{flag.key}</code>
                                        {flag.description && <span className="ml-2">- {flag.description}</span>}
                                    </p>

                                    {/* Environments */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <FiGlobe className="w-4 h-4 text-gray-400" />
                                        {['development', 'staging', 'production'].map(env => (
                                            <span
                                                key={env}
                                                className={`px-2 py-0.5 text-xs rounded ${
                                                    flag.environments?.[env]
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                                }`}
                                            >
                                                {env === 'development' ? 'Dev' : env === 'staging' ? 'Staging' : 'Prod'}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Date Range */}
                                    {(flag.startDate || flag.endDate) && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <FiClock className="w-4 h-4" />
                                            {flag.startDate && <span>শুরু: {new Date(flag.startDate).toLocaleDateString('bn-BD')}</span>}
                                            {flag.endDate && <span>শেষ: {new Date(flag.endDate).toLocaleDateString('bn-BD')}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setExpandedFlag(expandedFlag === flag._id ? null : flag._id)}
                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        {expandedFlag === flag._id ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingFlag(flag);
                                            setShowEditModal(true);
                                        }}
                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <FiEdit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(flag._id)}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <FiTrash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedFlag === flag._id && (
                                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Allowed Roles */}
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">অনুমোদিত রোল</p>
                                            <div className="flex flex-wrap gap-2">
                                                {flag.allowedRoles?.map(role => (
                                                    <span key={role} className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {roleLabels[role] || role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Beta Users */}
                                        {flag.allowedUsers?.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">বেটা ইউজার</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {flag.allowedUsers.map(user => (
                                                        <span key={user._id} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                            {user.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* History */}
                                    {flag.history?.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                <FiClock className="w-4 h-4" />
                                                ইতিহাস (সর্বশেষ ৫টি)
                                            </p>
                                            <div className="space-y-2">
                                                {flag.history.slice(-5).reverse().map((h, idx) => (
                                                    <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded ${
                                                            h.action === 'enabled' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            h.action === 'disabled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {h.action}
                                                        </span>
                                                        <span>{h.changedBy?.name || 'System'}</span>
                                                        <span>-</span>
                                                        <span>{new Date(h.changedAt).toLocaleString('bn-BD')}</span>
                                                        {h.reason && <span className="italic">({h.reason})</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Config */}
                                    {flag.config && Object.keys(flag.config).length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">কনফিগারেশন</p>
                                            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(flag.config, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <FeatureFlagModal
                    onClose={() => setShowCreateModal(false)}
                    onSave={async (data) => {
                        try {
                            await createMutation.mutateAsync(data);
                            toast.success('ফিচার ফ্ল্যাগ তৈরি হয়েছে');
                            setShowCreateModal(false);
                        } catch (error) {
                            toast.error(error.response?.data?.message || 'তৈরি করতে ব্যর্থ');
                        }
                    }}
                    saving={createMutation.isPending}
                    categories={categories}
                />
            )}

            {/* Edit Modal */}
            {showEditModal && editingFlag && (
                <FeatureFlagModal
                    flag={editingFlag}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingFlag(null);
                    }}
                    onSave={async (data) => {
                        try {
                            await updateMutation.mutateAsync({ id: editingFlag._id, ...data });
                            toast.success('ফিচার ফ্ল্যাগ আপডেট হয়েছে');
                            setShowEditModal(false);
                            setEditingFlag(null);
                        } catch (error) {
                            toast.error(error.response?.data?.message || 'আপডেট করতে ব্যর্থ');
                        }
                    }}
                    saving={updateMutation.isPending}
                    categories={categories}
                />
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <FiAlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-semibold">ফিচার ফ্ল্যাগ মুছুন?</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            এই ফিচার ফ্ল্যাগ মুছে ফেললে এটি সব জায়গা থেকে সরে যাবে। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="btn-secondary"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                disabled={deleteMutation.isPending}
                                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? 'মুছছে...' : 'মুছে ফেলুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Feature Flag Modal Component
const FeatureFlagModal = ({ flag, onClose, onSave, saving, categories }) => {
    const [formData, setFormData] = useState({
        key: flag?.key || '',
        name: flag?.name || '',
        description: flag?.description || '',
        category: flag?.category || 'system',
        isEnabled: flag?.isEnabled || false,
        allowedRoles: flag?.allowedRoles || ['user', 'manager', 'admin', 'superadmin'],
        rolloutPercentage: flag?.rolloutPercentage || 100,
        environments: flag?.environments || { development: true, staging: true, production: false },
        startDate: flag?.startDate ? flag.startDate.split('T')[0] : '',
        endDate: flag?.endDate ? flag.endDate.split('T')[0] : ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null
        };
        onSave(submitData);
    };

    const handleRoleToggle = (role) => {
        setFormData(prev => ({
            ...prev,
            allowedRoles: prev.allowedRoles.includes(role)
                ? prev.allowedRoles.filter(r => r !== role)
                : [...prev.allowedRoles, role]
        }));
    };

    const handleEnvToggle = (env) => {
        setFormData(prev => ({
            ...prev,
            environments: {
                ...prev.environments,
                [env]: !prev.environments[env]
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        {flag ? 'ফিচার ফ্ল্যাগ এডিট করুন' : 'নতুন ফিচার ফ্ল্যাগ'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ফিচার কী *
                            </label>
                            <input
                                type="text"
                                value={formData.key}
                                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                                className="input w-full"
                                placeholder="feature_key"
                                required
                                disabled={!!flag}
                            />
                            <p className="text-xs text-gray-500 mt-1">শুধু lowercase, numbers, underscore</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ফিচার নাম *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="input w-full"
                                placeholder="ফিচার নাম"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            বর্ণনা
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="input w-full"
                            rows={2}
                            placeholder="ফিচার সম্পর্কে বিস্তারিত..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ক্যাটাগরি
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="input w-full"
                            >
                                {categories.map(cat => (
                                    <option key={cat.key} value={cat.key}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rollout Percentage */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                রোলআউট % ({formData.rolloutPercentage}%)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.rolloutPercentage}
                                onChange={(e) => setFormData(prev => ({ ...prev, rolloutPercentage: parseInt(e.target.value) }))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Environments */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            এনভায়রনমেন্ট
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {['development', 'staging', 'production'].map(env => (
                                <label key={env} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.environments[env]}
                                        onChange={() => handleEnvToggle(env)}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {env === 'development' ? 'Development' : env === 'staging' ? 'Staging' : 'Production'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Allowed Roles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            অনুমোদিত রোল
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(roleLabels).map(([role, label]) => (
                                <label key={role} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowedRoles.includes(role)}
                                        onChange={() => handleRoleToggle(role)}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                শুরুর তারিখ (ঐচ্ছিক)
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                শেষের তারিখ (ঐচ্ছিক)
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    {/* Enable by default */}
                    {!flag && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isEnabled}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">তৈরি করার সাথে সাথে চালু করুন</span>
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            বাতিল
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeatureFlags;
