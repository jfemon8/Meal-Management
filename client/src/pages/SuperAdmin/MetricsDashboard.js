import React, { useState } from 'react';
import { useMetricsDashboard, useCurrentSystemStats, useErrorLogs, useResolveError } from '../../hooks/queries/useMetrics';
import {
    FiActivity,
    FiCpu,
    FiHardDrive,
    FiClock,
    FiAlertTriangle,
    FiAlertCircle,
    FiInfo,
    FiRefreshCw,
    FiCheck,
    FiX,
    FiServer,
    FiDatabase,
    FiZap,
    FiTrendingUp,
    FiTrendingDown,
    FiChevronDown,
    FiChevronUp,
    FiFilter
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const MetricsDashboard = () => {
    const { data: dashboard, isLoading, error, refetch, isFetching } = useMetricsDashboard();
    const { data: currentSystem } = useCurrentSystemStats();
    const [showErrorLogs, setShowErrorLogs] = useState(false);
    const [errorFilter, setErrorFilter] = useState({ severity: '', source: '' });
    const { data: errorLogs, refetch: refetchErrors } = useErrorLogs({
        ...errorFilter,
        limit: 20
    });
    const resolveErrorMutation = useResolveError();

    const handleResolveError = async (errorId) => {
        try {
            await resolveErrorMutation.mutateAsync({ id: errorId });
            toast.success('এরর রিজলভ করা হয়েছে');
        } catch (err) {
            toast.error('রিজলভ করতে সমস্যা হয়েছে');
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

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <FiAlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        ডেটা লোড করতে সমস্যা হয়েছে
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

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'error': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return <FiAlertTriangle className="w-4 h-4" />;
            case 'error': return <FiAlertCircle className="w-4 h-4" />;
            case 'warning': return <FiAlertTriangle className="w-4 h-4" />;
            default: return <FiInfo className="w-4 h-4" />;
        }
    };

    const system = currentSystem || dashboard?.currentSystem;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiActivity className="text-primary-600" />
                        পারফরম্যান্স ড্যাশবোর্ড
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        রিয়েল-টাইম সিস্টেম মনিটরিং
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    রিফ্রেশ
                </button>
            </div>

            {/* System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${
                                (system?.cpuUsage || currentSystem?.cpu?.usage || 0) > 80
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-green-100 dark:bg-green-900/30'
                            }`}>
                                <FiCpu className={`w-6 h-6 ${
                                    (system?.cpuUsage || currentSystem?.cpu?.usage || 0) > 80
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                }`} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">CPU ব্যবহার</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {(system?.cpuUsage || currentSystem?.cpu?.usage || 0).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                    {currentSystem?.cpu && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {currentSystem.cpu.cores} কোর • Load: {currentSystem.cpu.loadAvg[0].toFixed(2)}
                        </p>
                    )}
                </div>

                {/* Memory */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${
                                (system?.memoryPercentage || currentSystem?.memory?.percentage || 0) > 80
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                                <FiHardDrive className={`w-6 h-6 ${
                                    (system?.memoryPercentage || currentSystem?.memory?.percentage || 0) > 80
                                        ? 'text-red-600'
                                        : 'text-blue-600'
                                }`} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">মেমরি ব্যবহার</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {(system?.memoryPercentage || currentSystem?.memory?.percentage || 0).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {system?.memoryUsed || currentSystem?.memory?.usedFormatted} / {system?.memoryTotal || currentSystem?.memory?.totalFormatted}
                    </p>
                </div>

                {/* Uptime */}
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <FiClock className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">আপটাইম</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {system?.uptime || currentSystem?.system?.uptimeFormatted || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Database */}
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <FiDatabase className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ডেটাবেস সাইজ</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {currentSystem?.database?.dataSizeFormatted || '-'}
                            </p>
                        </div>
                    </div>
                    {currentSystem?.database && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {currentSystem.database.collections} কালেকশন • {currentSystem.database.objects} অবজেক্ট
                        </p>
                    )}
                </div>
            </div>

            {/* Error Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Error Stats */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <FiAlertTriangle className="text-red-500" />
                            এরর সারসংক্ষেপ (২৪ ঘণ্টা)
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dashboard?.errors?.unresolvedCount > 0
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                            {dashboard?.errors?.unresolvedCount || 0} অমীমাংসিত
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">
                                {dashboard?.errors?.bySeverity?.critical || 0}
                            </p>
                            <p className="text-xs text-red-600">Critical</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                                {dashboard?.errors?.bySeverity?.error || 0}
                            </p>
                            <p className="text-xs text-orange-600">Error</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">
                                {dashboard?.errors?.bySeverity?.warning || 0}
                            </p>
                            <p className="text-xs text-yellow-600">Warning</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                                {dashboard?.errors?.bySeverity?.info || 0}
                            </p>
                            <p className="text-xs text-blue-600">Info</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowErrorLogs(!showErrorLogs)}
                        className="w-full py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center justify-center gap-2"
                    >
                        {showErrorLogs ? <FiChevronUp /> : <FiChevronDown />}
                        {showErrorLogs ? 'এরর লগ লুকান' : 'এরর লগ দেখুন'}
                    </button>
                </div>

                {/* API Performance */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                        <FiZap className="text-yellow-500" />
                        API পারফরম্যান্স (২৪ ঘণ্টা)
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">মোট রিকোয়েস্ট</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {dashboard?.apiPerformance?.totalRequests?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">গড় রেসপন্স টাইম</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                {dashboard?.apiPerformance?.avgResponseTime || 0}ms
                            </p>
                        </div>
                    </div>

                    {/* Slow Endpoints */}
                    {dashboard?.apiPerformance?.slowEndpoints?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <FiTrendingDown className="text-red-500" />
                                স্লো এন্ডপয়েন্ট (&gt;1s)
                            </p>
                            <div className="space-y-2">
                                {dashboard.apiPerformance.slowEndpoints.slice(0, 3).map((endpoint, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                                            {endpoint.method} {endpoint.endpoint}
                                        </span>
                                        <span className="text-red-600 font-medium ml-2">
                                            {endpoint.avgResponseTime}ms
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Logs Expandable Section */}
            {showErrorLogs && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                            এরর লগ
                        </h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={errorFilter.severity}
                                onChange={(e) => setErrorFilter({ ...errorFilter, severity: e.target.value })}
                                className="input text-sm py-1"
                            >
                                <option value="">সব Severity</option>
                                <option value="critical">Critical</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                            </select>
                            <button
                                onClick={() => refetchErrors()}
                                className="btn btn-outline btn-sm"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Severity</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Source</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Message</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Count</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Time</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {errorLogs?.errors?.map((err) => (
                                    <tr key={err._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(err.severity)}`}>
                                                {getSeverityIcon(err.severity)}
                                                {err.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {err.source}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                            {err.message}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {err.occurrenceCount}x
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(err.createdAt).toLocaleString('bn-BD')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {!err.isResolved ? (
                                                <button
                                                    onClick={() => handleResolveError(err._id)}
                                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                                    title="রিজলভ করুন"
                                                >
                                                    <FiCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-green-600">রিজলভড</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!errorLogs?.errors || errorLogs.errors.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            কোনো এরর লগ নেই
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top API Endpoints */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <FiServer className="text-blue-500" />
                    সর্বাধিক ব্যবহৃত API Endpoints
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Endpoint</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Method</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Requests</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Avg Time</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {dashboard?.apiPerformance?.endpoints?.slice(0, 10).map((endpoint, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                                        {endpoint.endpoint}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            endpoint.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {endpoint.method}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                                        {endpoint.totalRequests.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        <span className={endpoint.avgResponseTime > 500 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}>
                                            {endpoint.avgResponseTime}ms
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        <span className={endpoint.errorRate > 5 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}>
                                            {endpoint.errorRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!dashboard?.apiPerformance?.endpoints || dashboard.apiPerformance.endpoints.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        কোনো ডেটা নেই
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-400 dark:text-gray-500">
                সর্বশেষ আপডেট: {dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleString('bn-BD') : '-'}
            </div>
        </div>
    );
};

export default MetricsDashboard;
