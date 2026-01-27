import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { userService } from '../../services/mealService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiUser,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiShield,
  FiKey,
  FiX,
} from 'react-icons/fi';
import type { User, UserRole } from '../../types';

// ============================================
// Types
// ============================================

interface UserWithDetails extends User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// ============================================
// Component
// ============================================

const ManageUsers: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [roleChange, setRoleChange] = useState<string>('');

  // Password reset states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithDetails | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState<boolean>(true);
  const [resetPasswordLoading, setResetPasswordLoading] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (): Promise<void> => {
    try {
      const response = await userService.getAllUsers();
      setUsers(response as UserWithDetails[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string): Promise<void> => {
    if (!roleChange) return;

    try {
      await userService.updateUserRole(userId, roleChange as UserRole);
      toast.success('রোল পরিবর্তন হয়েছে');
      loadUsers();
      setEditingUser(null);
      setRoleChange('');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'রোল পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean): Promise<void> => {
    try {
      await userService.updateUserStatus(userId, !currentStatus);
      toast.success(currentStatus ? 'ইউজার নিষ্ক্রিয় করা হয়েছে' : 'ইউজার সক্রিয় করা হয়েছে');
      loadUsers();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  const handleDelete = async (userId: string): Promise<void> => {
    if (
      !window.confirm(
        'আপনি কি নিশ্চিত যে এই ইউজার ডিলিট করতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।'
      )
    )
      return;

    try {
      await userService.deleteUser(userId);
      toast.success('ইউজার ডিলিট হয়েছে');
      loadUsers();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  const openResetPasswordModal = (user: UserWithDetails): void => {
    setResetPasswordUser(user);
    setNewPassword('');
    setForceChangeOnLogin(true);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    if (!resetPasswordUser) return;

    setResetPasswordLoading(true);
    try {
      await userService.resetPassword(resetPasswordUser._id, newPassword, forceChangeOnLogin);
      toast.success('পাসওয়ার্ড সফলভাবে রিসেট হয়েছে');
      setShowResetPasswordModal(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

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
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'admin':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
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
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">ইউজার ম্যানেজ</h1>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div key={user._id} className="card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    user.isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <FiUser
                    className={`w-6 h-6 ${
                      user.isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2 dark:text-gray-100">
                    {user.name}
                    {!user.isActive && (
                      <span className="text-xs text-red-500">(নিষ্ক্রিয়)</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getRoleColor(user.role)}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {user._id !== currentUser?._id && user.role !== 'superadmin' && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Role Change */}
                  {editingUser === user._id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={roleChange}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setRoleChange(e.target.value)
                        }
                        className="input py-1 text-sm"
                      >
                        <option value="">রোল নির্বাচন</option>
                        <option value="user">ইউজার</option>
                        <option value="manager">ম্যানেজার</option>
                        {isSuperAdmin && <option value="admin">এডমিন</option>}
                      </select>
                      <button
                        onClick={() => handleRoleChange(user._id)}
                        className="btn btn-primary text-sm py-1"
                      >
                        সেভ
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(null);
                          setRoleChange('');
                        }}
                        className="btn btn-outline text-sm py-1"
                      >
                        বাতিল
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingUser(user._id);
                          setRoleChange(user.role);
                        }}
                        className="btn btn-outline text-sm py-1 flex items-center gap-1"
                      >
                        <FiShield className="w-4 h-4" />
                        রোল পরিবর্তন
                      </button>

                      <button
                        onClick={() => openResetPasswordModal(user)}
                        className="btn btn-outline text-sm py-1 flex items-center gap-1"
                      >
                        <FiKey className="w-4 h-4" />
                        পাসওয়ার্ড রিসেট
                      </button>

                      <button
                        onClick={() => handleStatusToggle(user._id, user.isActive)}
                        className={`btn text-sm py-1 flex items-center gap-1 ${
                          user.isActive ? 'btn-danger' : 'btn-primary'
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <FiUserX className="w-4 h-4" />
                            নিষ্ক্রিয়
                          </>
                        ) : (
                          <>
                            <FiUserCheck className="w-4 h-4" />
                            সক্রিয়
                          </>
                        )}
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="btn btn-danger text-sm py-1 flex items-center gap-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          ডিলিট
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {user._id === currentUser?._id && (
                <span className="text-sm text-gray-400">আপনি</span>
              )}

              {user.role === 'superadmin' && user._id !== currentUser?._id && (
                <span className="text-sm text-gray-400">পরিবর্তন অনুমোদিত নয়</span>
              )}
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            কোন ইউজার পাওয়া যায়নি
          </p>
        )}
      </div>

      {/* Password Reset Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-gray-100">পাসওয়ার্ড রিসেট</h2>
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">ইউজার:</p>
                <p className="font-medium dark:text-gray-100">{resetPasswordUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {resetPasswordUser.email}
                </p>
              </div>

              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      নতুন পাসওয়ার্ড *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(e.target.value)
                      }
                      className="input"
                      placeholder="কমপক্ষে ৬ অক্ষর"
                      minLength={6}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceChangeOnLogin}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setForceChangeOnLogin(e.target.checked)
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm dark:text-gray-300">
                      লগইনের পর পাসওয়ার্ড পরিবর্তন করতে বাধ্য করুন
                    </span>
                  </label>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      সতর্কতা: এই অপারেশনটি ইউজারের পুরানো পাসওয়ার্ড মুছে ফেলবে এবং নতুন
                      পাসওয়ার্ড সেট করবে।
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setResetPasswordUser(null);
                      setNewPassword('');
                    }}
                    className="btn btn-outline"
                    disabled={resetPasswordLoading}
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={resetPasswordLoading}
                  >
                    {resetPasswordLoading ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
