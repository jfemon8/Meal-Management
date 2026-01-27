import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { groupService, userService } from '../../services/mealService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiUser,
  FiEdit2,
  FiKey,
  FiToggleLeft,
  FiToggleRight,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiRefreshCw,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiX,
  FiMail,
  FiPhone,
  FiTrash2,
  FiAlertTriangle,
} from 'react-icons/fi';
import BDTIcon from '../../components/Icons/BDTIcon';
import type { UserRole } from '../../types';

// ============================================
// Types
// ============================================

interface GroupSettings {
  canManagerAddUsers?: boolean;
  canManagerRemoveUsers?: boolean;
  canManagerEditUsers?: boolean;
  canManagerManageBalance?: boolean;
  canManagerViewReports?: boolean;
  canManagerManageMeals?: boolean;
}

interface GroupManager {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  code?: string;
  isActive: boolean;
  memberCount?: number;
  manager?: GroupManager | null;
  settings?: GroupSettings;
}

interface MemberBalances {
  breakfast?: { amount?: number };
  lunch?: { amount?: number };
  dinner?: { amount?: number };
}

interface GroupMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isGroupManager?: boolean;
  balances?: MemberBalances;
  group?: string;
  groupSettings?: GroupSettings;
}

interface EditFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';

// ============================================
// Component
// ============================================

const GroupwiseAdmin: React.FC = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Check if current user is only a group manager (not admin/superadmin)
  const isOnlyGroupManager = user?.isGroupManager && !isAdmin && !isSuperAdmin;

  // Modal states
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<GroupMember | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
  });
  const [newPassword, setNewPassword] = useState<string>('');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await groupService.getAllGroups();
      const allGroups = response as unknown as Group[];

      // Filter groups based on user role
      let filteredByRole = allGroups;
      if (isOnlyGroupManager && user?.group) {
        // Group managers only see their own group
        filteredByRole = allGroups.filter((g) => g._id === user.group);
      }

      setGroups(filteredByRole);

      // Auto-expand the group if user is a group manager with only one group
      if (isOnlyGroupManager && filteredByRole.length === 1) {
        setExpandedGroups([filteredByRole[0]._id]);
        loadGroupMembers(filteredByRole[0]._id);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('গ্রুপ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string): Promise<void> => {
    setLoadingMembers((prev) => ({ ...prev, [groupId]: true }));
    try {
      const members = await groupService.getMembers(groupId);
      setGroupMembers((prev) => ({ ...prev, [groupId]: members as GroupMember[] }));
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('সদস্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoadingMembers((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const toggleGroupExpansion = async (groupId: string): Promise<void> => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups((prev) => prev.filter((id) => id !== groupId));
    } else {
      setExpandedGroups((prev) => [...prev, groupId]);
      // Load members if not already loaded
      if (!groupMembers[groupId]) {
        await loadGroupMembers(groupId);
      }
    }
  };

  const handleEditUser = (member: GroupMember): void => {
    setSelectedUser(member);
    setEditFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      // Update user profile
      await userService.updateUser(selectedUser._id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
      });

      // Update role if changed and allowed (only admins can change roles)
      if (isAdmin && editFormData.role !== selectedUser.role) {
        await userService.updateUserRole(selectedUser._id, editFormData.role as UserRole);
      }

      toast.success('ইউজার আপডেট হয়েছে');
      setShowEditModal(false);

      // Refresh the group members
      if (selectedUser.group) {
        await loadGroupMembers(selectedUser.group);
      }
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = (member: GroupMember): void => {
    setSelectedUser(member);
    setNewPassword('');
    setForceChangeOnLogin(true);
    setShowResetPasswordModal(true);
  };

  const handleSubmitResetPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await userService.resetPassword(selectedUser._id, newPassword, forceChangeOnLogin);
      toast.success('পাসওয়ার্ড রিসেট হয়েছে');
      setShowResetPasswordModal(false);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (member: GroupMember): Promise<void> => {
    const newStatus = !member.isActive;
    const action = newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়';

    if (!window.confirm(`আপনি কি নিশ্চিত যে ${member.name} কে ${action} করতে চান?`)) return;

    try {
      await userService.updateUserStatus(member._id, newStatus);
      toast.success(`${member.name} ${action} করা হয়েছে`);

      // Refresh the group members
      if (member.group) {
        await loadGroupMembers(member.group);
      }
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteUser = async (member: GroupMember): Promise<void> => {
    if (
      !window.confirm(
        `আপনি কি নিশ্চিত যে "${member.name}" ডিলিট করতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।`
      )
    )
      return;

    try {
      await userService.deleteUser(member._id);
      toast.success('ইউজার ডিলিট হয়েছে');

      // Refresh the group members
      if (member.group) {
        await loadGroupMembers(member.group);
      }
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  // Filter groups by search
  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.code && group.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter members by status
  const getFilteredMembers = (members: GroupMember[] | undefined): GroupMember[] => {
    if (!members) return [];
    if (filterStatus === 'all') return members;
    return members.filter((m) => (filterStatus === 'active' ? m.isActive : !m.isActive));
  };

  // Calculate group stats
  const getGroupStats = (
    groupId: string
  ): { total: number; active: number; inactive: number } => {
    const members = groupMembers[groupId] || [];
    return {
      total: members.length,
      active: members.filter((m) => m.isActive).length,
      inactive: members.filter((m) => !m.isActive).length,
    };
  };

  const getRoleBadgeClass = (role: UserRole): string => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiUsers className="text-primary-600" />
            {isOnlyGroupManager ? 'আমার গ্রুপের সদস্য' : 'গ্রুপ ভিত্তিক ইউজার ম্যানেজমেন্ট'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isOnlyGroupManager
              ? 'আপনার গ্রুপের সদস্যদের দেখুন এবং ম্যানেজ করুন'
              : 'গ্রুপ অনুযায়ী ইউজারদের দেখুন এবং ম্যানেজ করুন'}
          </p>
        </div>
        <button
          onClick={loadGroups}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {!isOnlyGroupManager && (
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="গ্রুপ খুঁজুন..."
                className="input pl-10 w-full"
              />
            </div>
          )}
          <div className={`flex items-center gap-2 ${isOnlyGroupManager ? 'w-full' : ''}`}>
            <FiFilter className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFilterStatus(e.target.value as FilterStatus)
              }
              className={`input ${isOnlyGroupManager ? 'flex-1' : ''}`}
            >
              <option value="all">সব ইউজার</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
          </div>
        </div>
      </div>

      {/* Groups Summary */}
      {isOnlyGroupManager ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {groups.reduce((sum, g) => sum + (g.memberCount || 0), 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">মোট সদস্য</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {Object.values(groupMembers)
                .flat()
                .filter((m) => m?.isActive).length || '-'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">সক্রিয়</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {Object.values(groupMembers)
                .flat()
                .filter((m) => m && !m.isActive).length || '-'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">নিষ্ক্রিয়</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {groups.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">মোট গ্রুপ</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {groups.filter((g) => g.isActive).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">সক্রিয় গ্রুপ</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {groups.reduce((sum, g) => sum + (g.memberCount || 0), 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">মোট সদস্য</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {groups.filter((g) => g.manager).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">ম্যানেজার আছে</p>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div key={group._id} className="card overflow-hidden">
            {/* Group Header */}
            <div
              className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-4 mb-0"
              onClick={() => toggleGroupExpansion(group._id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    group.isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <FiUsers
                    className={`w-6 h-6 ${
                      group.isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {group.name}
                    {group.code && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {group.code}
                      </span>
                    )}
                    {!group.isActive && (
                      <span className="text-xs text-red-500">(নিষ্ক্রিয়)</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{group.memberCount || 0} সদস্য</span>
                    {group.manager && (
                      <span className="flex items-center gap-1">
                        <FiShield className="w-4 h-4 text-blue-500" />
                        {group.manager.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {expandedGroups.includes(group._id) && groupMembers[group._id] && (
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      <FiUserCheck className="inline w-4 h-4" /> {getGroupStats(group._id).active}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      <FiUserX className="inline w-4 h-4" /> {getGroupStats(group._id).inactive}
                    </span>
                  </div>
                )}
                {expandedGroups.includes(group._id) ? (
                  <FiChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <FiChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Members List */}
            {expandedGroups.includes(group._id) && (
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                {loadingMembers[group._id] ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : getFilteredMembers(groupMembers[group._id]).length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    {groupMembers[group._id]?.length === 0
                      ? 'কোন সদস্য নেই'
                      : 'ফিল্টার অনুযায়ী কোন সদস্য নেই'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredMembers(groupMembers[group._id]).map((member) => (
                      <div
                        key={member._id}
                        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg ${
                          member.isActive
                            ? 'bg-gray-50 dark:bg-gray-800/50'
                            : 'bg-red-50 dark:bg-red-900/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              member.isActive
                                ? 'bg-primary-100 dark:bg-primary-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            <span
                              className={`font-medium ${
                                member.isActive
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                              {member.name}
                              {member.isGroupManager && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                  গ্রুপ ম্যানেজার
                                </span>
                              )}
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeClass(member.role)}`}
                              >
                                {getRoleLabel(member.role)}
                              </span>
                              {!member.isActive && (
                                <span className="text-xs text-red-500">(নিষ্ক্রিয়)</span>
                              )}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <FiMail className="w-3 h-3" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <FiPhone className="w-3 h-3" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                            {/* Balance Info */}
                            {member.balances && (
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                                <span
                                  className={`flex items-center gap-1 ${
                                    (member.balances.lunch?.amount ?? 0) >= 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  <BDTIcon className="w-3 h-3" />
                                  লাঞ্চ: {member.balances.lunch?.amount?.toFixed(0) || 0}
                                </span>
                                <span
                                  className={`flex items-center gap-1 ${
                                    (member.balances.dinner?.amount ?? 0) >= 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  <BDTIcon className="w-3 h-3" />
                                  ডিনার: {member.balances.dinner?.amount?.toFixed(0) || 0}
                                </span>
                                <span
                                  className={`flex items-center gap-1 ${
                                    (member.balances.breakfast?.amount ?? 0) >= 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  <BDTIcon className="w-3 h-3" />
                                  নাস্তা: {member.balances.breakfast?.amount?.toFixed(0) || 0}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 ml-13 lg:ml-0">
                          {/* Edit */}
                          {(isAdmin ||
                            (isOnlyGroupManager && group.settings?.canManagerEditUsers)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser({
                                  ...member,
                                  group: group._id,
                                  groupSettings: group.settings,
                                });
                              }}
                              className="btn btn-sm btn-outline flex items-center gap-1"
                              title="এডিট"
                            >
                              <FiEdit2 className="w-4 h-4" />
                              <span className="hidden sm:inline">এডিট</span>
                            </button>
                          )}
                          {/* Password Reset */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetPassword({ ...member, group: group._id });
                              }}
                              className="btn btn-sm btn-outline flex items-center gap-1"
                              title="পাসওয়ার্ড রিসেট"
                            >
                              <FiKey className="w-4 h-4" />
                              <span className="hidden sm:inline">পাসওয়ার্ড</span>
                            </button>
                          )}
                          {/* Status Toggle */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleUserStatus({ ...member, group: group._id });
                              }}
                              className={`btn btn-sm flex items-center gap-1 ${
                                member.isActive
                                  ? 'btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'btn-outline text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                              title={member.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            >
                              {member.isActive ? (
                                <>
                                  <FiToggleRight className="w-4 h-4" />
                                  <span className="hidden sm:inline">নিষ্ক্রিয়</span>
                                </>
                              ) : (
                                <>
                                  <FiToggleLeft className="w-4 h-4" />
                                  <span className="hidden sm:inline">সক্রিয়</span>
                                </>
                              )}
                            </button>
                          )}
                          {/* Delete */}
                          {isSuperAdmin && member.role !== 'superadmin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser({ ...member, group: group._id });
                              }}
                              className="btn btn-sm btn-danger flex items-center gap-1"
                              title="ডিলিট"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="card text-center py-8">
            <FiUsers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">কোন গ্রুপ পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  ইউজার এডিট
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      নাম
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEditFormData({ ...editFormData, name: e.target.value })
                      }
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ইমেইল
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEditFormData({ ...editFormData, email: e.target.value })
                      }
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ফোন
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEditFormData({ ...editFormData, phone: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                  {/* Role field - only visible for Admin+ */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        রোল
                      </label>
                      <select
                        value={editFormData.role}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setEditFormData({ ...editFormData, role: e.target.value })
                        }
                        className="input w-full"
                        disabled={selectedUser.role === 'superadmin'}
                      >
                        <option value="user">ইউজার</option>
                        <option value="manager">ম্যানেজার</option>
                        {isSuperAdmin && <option value="admin">এডমিন</option>}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline"
                  >
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <FiAlertTriangle className="text-yellow-500" />
                  পাসওয়ার্ড রিসেট
                </h2>
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                <strong>{selectedUser.name}</strong> এর পাসওয়ার্ড রিসেট করা হবে
              </p>

              <form onSubmit={handleSubmitResetPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      নতুন পাসওয়ার্ড
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(e.target.value)
                      }
                      className="input w-full"
                      placeholder="কমপক্ষে ৬ অক্ষর"
                      required
                      minLength={6}
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      পরবর্তী লগইনে পাসওয়ার্ড পরিবর্তন করতে বাধ্য করুন
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="btn btn-outline"
                  >
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'রিসেট হচ্ছে...' : 'রিসেট করুন'}
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

export default GroupwiseAdmin;
