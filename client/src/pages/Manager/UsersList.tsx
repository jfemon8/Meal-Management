import React, { useState, useEffect, type ChangeEvent } from 'react';
import { userService, transactionService } from '../../services/mealService';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
  FiSearch,
  FiUser,
  FiMail,
  FiPhone,
  FiEye,
  FiX,
  FiCalendar,
  FiShield,
  FiClock,
  FiFilter,
} from 'react-icons/fi';
import type { User, Transaction, UserRole, BalanceType, TransactionType } from '../../types';

// ============================================
// Types
// ============================================

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'inactive';

// ============================================
// Component
// ============================================

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Profile modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (): Promise<void> => {
    try {
      const response = await userService.getAllUsers();
      setUsers(response);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (user: User): Promise<void> => {
    setSelectedUser(user);
    setShowProfileModal(true);
    setProfileLoading(true);

    try {
      // Load recent transactions for this user
      const txnResponse = await transactionService.getUserTransactions(user._id, {
        limit: 10,
      });
      setRecentTransactions(txnResponse.data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setRecentTransactions([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = (): void => {
    setShowProfileModal(false);
    setSelectedUser(null);
    setRecentTransactions([]);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'superadmin':
        return 'সুপার এডমিন';
      case 'admin':
        return 'এডমিন';
      case 'manager':
        return 'ম্যানেজার';
      default:
        return 'ইউজার';
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'manager':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    }
  };

  const getTransactionTypeLabel = (type: TransactionType): string => {
    switch (type) {
      case 'deposit':
        return 'জমা';
      case 'deduction':
        return 'কর্তন';
      case 'adjustment':
        return 'সমন্বয়';
      case 'refund':
        return 'রিফান্ড';
      default:
        return type;
    }
  };

  const getBalanceTypeLabel = (type: BalanceType): string => {
    switch (type) {
      case 'breakfast':
        return 'নাস্তা';
      case 'lunch':
        return 'দুপুর';
      case 'dinner':
        return 'রাত';
      default:
        return type;
    }
  };

  const getBalanceAmount = (
    balances: User['balances'] | undefined,
    type: BalanceType
  ): number => {
    if (!balances) return 0;
    const balance = balances[type];
    if (typeof balance === 'number') return balance;
    if (typeof balance === 'object' && balance !== null) {
      return (balance as { amount?: number }).amount ?? 0;
    }
    return 0;
  };

  const isBalanceFrozen = (
    balances: User['balances'] | undefined,
    type: BalanceType
  ): boolean => {
    if (!balances) return false;
    const balance = balances[type];
    if (typeof balance === 'object' && balance !== null) {
      return (balance as { isFrozen?: boolean }).isFrozen ?? false;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        সকল ইউজার
      </h1>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setRoleFilter(e.target.value as RoleFilter)
              }
              className="input py-2"
            >
              <option value="all">সব রোল</option>
              <option value="user">ইউজার</option>
              <option value="manager">ম্যানেজার</option>
              <option value="admin">এডমিন</option>
              <option value="superadmin">সুপার এডমিন</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
            className="input py-2"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="active">সক্রিয়</option>
            <option value="inactive">নিষ্ক্রিয়</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          মোট {filteredUsers.length} জন ইউজার পাওয়া গেছে
        </p>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold dark:text-gray-100">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FiMail className="w-3 h-3" />
                    {user.email}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getRoleColor(
                      user.role
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    নাস্তা
                  </p>
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    ৳{getBalanceAmount(user.balances, 'breakfast')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    দুপুর
                  </p>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    ৳{getBalanceAmount(user.balances, 'lunch')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">রাত</p>
                  <p className="font-bold text-purple-600 dark:text-purple-400">
                    ৳{getBalanceAmount(user.balances, 'dinner')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    স্ট্যাটাস
                  </p>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>

                {/* View Profile Button */}
                <button
                  onClick={() => handleViewProfile(user)}
                  className="btn btn-outline flex items-center gap-2 py-2"
                >
                  <FiEye className="w-4 h-4" />
                  বিস্তারিত
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            কোন ইউজার পাওয়া যায়নি
          </p>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                ইউজার প্রোফাইল
              </h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <FiUser className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-gray-100">
                    {selectedUser.name}
                  </h3>
                  <span
                    className={`inline-block mt-1 px-3 py-1 text-sm rounded-full ${getRoleColor(
                      selectedUser.role
                    )}`}
                  >
                    {getRoleLabel(selectedUser.role)}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <FiMail className="w-4 h-4" />
                    <span className="text-sm">ইমেইল</span>
                  </div>
                  <p className="font-medium dark:text-gray-200">
                    {selectedUser.email}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <FiPhone className="w-4 h-4" />
                    <span className="text-sm">ফোন</span>
                  </div>
                  <p className="font-medium dark:text-gray-200">
                    {selectedUser.phone || 'দেওয়া হয়নি'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-sm">রেজিস্ট্রেশন</span>
                  </div>
                  <p className="font-medium dark:text-gray-200">
                    {selectedUser.createdAt
                      ? format(new Date(selectedUser.createdAt), 'dd MMM yyyy', {
                          locale: bn,
                        })
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <FiShield className="w-4 h-4" />
                    <span className="text-sm">স্ট্যাটাস</span>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 text-sm rounded-full ${
                      selectedUser.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {selectedUser.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
              </div>

              {/* Balances */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  ওয়ালেট ব্যালেন্স
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ৳{getBalanceAmount(selectedUser.balances, 'breakfast')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      নাস্তা
                    </p>
                    {isBalanceFrozen(selectedUser.balances, 'breakfast') && (
                      <span className="text-xs text-red-500">ফ্রিজ</span>
                    )}
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ৳{getBalanceAmount(selectedUser.balances, 'lunch')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      দুপুর
                    </p>
                    {isBalanceFrozen(selectedUser.balances, 'lunch') && (
                      <span className="text-xs text-red-500">ফ্রিজ</span>
                    )}
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ৳{getBalanceAmount(selectedUser.balances, 'dinner')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      রাত
                    </p>
                    {isBalanceFrozen(selectedUser.balances, 'dinner') && (
                      <span className="text-xs text-red-500">ফ্রিজ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  সাম্প্রতিক ট্রানজ্যাকশন
                </h4>
                {profileLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    কোনো ট্রানজ্যাকশন নেই
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recentTransactions.map((txn) => (
                      <div
                        key={txn._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium dark:text-gray-200">
                            {getTransactionTypeLabel(txn.type)} -{' '}
                            {getBalanceTypeLabel(txn.balanceType)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(txn.createdAt),
                              'dd MMM yyyy, hh:mm a',
                              { locale: bn }
                            )}
                          </p>
                        </div>
                        <p
                          className={`font-bold ${
                            txn.type === 'deposit' || txn.type === 'refund'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {txn.type === 'deposit' || txn.type === 'refund'
                            ? '+'
                            : '-'}
                          ৳{txn.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2FA Status */}
              {selectedUser.twoFactorAuth?.isEnabled !== undefined && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      টু-ফ্যাক্টর অথেনটিকেশন
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        selectedUser.twoFactorAuth?.isEnabled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {selectedUser.twoFactorAuth?.isEnabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={closeProfileModal} className="btn btn-secondary">
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
