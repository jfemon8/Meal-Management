import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { groupService } from '../../services/mealService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiUserMinus,
  FiSettings,
  FiShield,
  FiSearch,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';

// ============================================
// Types
// ============================================

interface GroupSettings {
  canManagerAddUsers: boolean;
  canManagerRemoveUsers: boolean;
  canManagerEditUsers: boolean;
  canManagerManageBalance: boolean;
  canManagerViewReports: boolean;
  canManagerManageMeals: boolean;
}

interface GroupManager {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  memberCount?: number;
  manager?: GroupManager | null;
  settings?: GroupSettings;
}

interface GroupMember {
  _id: string;
  name: string;
  email: string;
  isGroupManager?: boolean;
}

interface AvailableUser {
  _id: string;
  name: string;
  email: string;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  settings: GroupSettings;
}

type SettingsKey = keyof GroupSettings;

// ============================================
// Component
// ============================================

const GroupManagement: React.FC = () => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);

  // Selected group for operations
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    settings: {
      canManagerAddUsers: true,
      canManagerRemoveUsers: true,
      canManagerEditUsers: true,
      canManagerManageBalance: true,
      canManagerViewReports: true,
      canManagerManageMeals: true,
    },
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async (): Promise<void> => {
    try {
      const response = await groupService.getAllGroups();
      setGroups(response as unknown as Group[]);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('গ্রুপ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupId: string): Promise<void> => {
    try {
      const response = await groupService.getMembers(groupId);
      setMembers(response as GroupMember[]);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('সদস্য লোড করতে সমস্যা হয়েছে');
    }
  };

  const loadAvailableUsers = async (): Promise<void> => {
    try {
      const response = await groupService.getAvailableUsers();
      setAvailableUsers(response as AvailableUser[]);
    } catch (error) {
      console.error('Error loading available users:', error);
      toast.error('ইউজার লোড করতে সমস্যা হয়েছে');
    }
  };

  const handleCreateGroup = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      await groupService.createGroup(formData);
      toast.success('গ্রুপ সফলভাবে তৈরি হয়েছে');
      setShowCreateModal(false);
      resetForm();
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'গ্রুপ তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const handleUpdateGroup = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      await groupService.updateGroup(selectedGroup._id, formData);
      toast.success('গ্রুপ আপডেট হয়েছে');
      setShowEditModal(false);
      resetForm();
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'গ্রুপ আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteGroup = async (group: Group): Promise<void> => {
    if (
      !window.confirm(
        `আপনি কি নিশ্চিত যে "${group.name}" গ্রুপ ডিলিট করতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।`
      )
    )
      return;

    try {
      await groupService.deleteGroup(group._id);
      toast.success('গ্রুপ ডিলিট হয়েছে');
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'গ্রুপ ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  const handleAddMembers = async (): Promise<void> => {
    if (selectedUsers.length === 0) {
      toast.error('অন্তত একজন ইউজার নির্বাচন করুন');
      return;
    }

    if (!selectedGroup) return;

    try {
      await groupService.bulkAddMembers(selectedGroup._id, selectedUsers);
      toast.success('সদস্য যোগ করা হয়েছে');
      setShowAddMemberModal(false);
      setSelectedUsers([]);
      loadMembers(selectedGroup._id);
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'সদস্য যোগ করতে সমস্যা হয়েছে');
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই সদস্যকে গ্রুপ থেকে সরাতে চান?')) return;

    if (!selectedGroup) return;

    try {
      await groupService.removeMember(selectedGroup._id, userId);
      toast.success('সদস্য সরানো হয়েছে');
      loadMembers(selectedGroup._id);
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'সদস্য সরাতে সমস্যা হয়েছে');
    }
  };

  const handleSetManager = async (userId: string | null): Promise<void> => {
    if (!selectedGroup) return;

    try {
      await groupService.setManager(selectedGroup._id, userId as string);
      toast.success('গ্রুপ ম্যানেজার নির্ধারণ হয়েছে');
      setShowManagerModal(false);
      loadMembers(selectedGroup._id);
      loadGroups();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'ম্যানেজার নির্ধারণ করতে সমস্যা হয়েছে');
    }
  };

  const openEditModal = (group: Group): void => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      code: group.code || '',
      description: group.description || '',
      settings: { ...group.settings } as GroupSettings,
    });
    setShowEditModal(true);
  };

  const openMembersModal = async (group: Group): Promise<void> => {
    setSelectedGroup(group);
    await loadMembers(group._id);
    setShowMembersModal(true);
  };

  const openAddMemberModal = async (): Promise<void> => {
    await loadAvailableUsers();
    setSelectedUsers([]);
    setShowAddMemberModal(true);
  };

  const openManagerModal = async (): Promise<void> => {
    if (!selectedGroup) return;
    await loadMembers(selectedGroup._id);
    setShowManagerModal(true);
  };

  const resetForm = (): void => {
    setFormData({
      name: '',
      code: '',
      description: '',
      settings: {
        canManagerAddUsers: true,
        canManagerRemoveUsers: true,
        canManagerEditUsers: true,
        canManagerManageBalance: true,
        canManagerViewReports: true,
        canManagerManageMeals: true,
      },
    });
    setSelectedGroup(null);
  };

  const toggleUserSelection = (userId: string): void => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.code && group.code.toLowerCase().includes(search.toLowerCase()))
  );

  const settingsOptions: { key: SettingsKey; label: string }[] = [
    { key: 'canManagerAddUsers', label: 'সদস্য যোগ করতে পারবে' },
    { key: 'canManagerRemoveUsers', label: 'সদস্য সরাতে পারবে' },
    { key: 'canManagerEditUsers', label: 'সদস্য তথ্য এডিট করতে পারবে' },
    { key: 'canManagerManageBalance', label: 'ব্যালেন্স ম্যানেজ করতে পারবে' },
    { key: 'canManagerViewReports', label: 'রিপোর্ট দেখতে পারবে' },
    { key: 'canManagerManageMeals', label: 'মিল ম্যানেজ করতে পারবে' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">গ্রুপ ম্যানেজমেন্ট</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            নতুন গ্রুপ
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="নাম বা কোড দিয়ে খুঁজুন..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div key={group._id} className="card">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      group.isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <FiUsers
                      className={`w-6 h-6 ${
                        group.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 dark:text-gray-100">
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
                    {group.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
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

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openMembersModal(group)}
                    className="btn btn-outline text-sm py-1 flex items-center gap-1"
                  >
                    <FiUsers className="w-4 h-4" />
                    সদস্য
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditModal(group)}
                        className="btn btn-outline text-sm py-1 flex items-center gap-1"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        এডিট
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="btn btn-danger text-sm py-1 flex items-center gap-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          ডিলিট
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() =>
                      setExpandedGroup(expandedGroup === group._id ? null : group._id)
                    }
                    className="btn btn-ghost text-sm py-1"
                  >
                    {expandedGroup === group._id ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedGroup === group._id && (
                <div className="pt-4 border-t dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    গ্রুপ ম্যানেজার অনুমতি:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerAddUsers
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerAddUsers ? <FiCheck /> : <FiX />}
                      সদস্য যোগ
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerRemoveUsers
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerRemoveUsers ? <FiCheck /> : <FiX />}
                      সদস্য সরানো
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerEditUsers
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerEditUsers ? <FiCheck /> : <FiX />}
                      সদস্য এডিট
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerManageBalance
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerManageBalance ? <FiCheck /> : <FiX />}
                      ব্যালেন্স ম্যানেজ
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerViewReports
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerViewReports ? <FiCheck /> : <FiX />}
                      রিপোর্ট দেখা
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        group.settings?.canManagerManageMeals
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {group.settings?.canManagerManageMeals ? <FiCheck /> : <FiX />}
                      মিল ম্যানেজ
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            কোন গ্রুপ পাওয়া যায়নি
          </p>
        )}
      </div>

      {/* Create/Edit Group Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-gray-100">
                  {showCreateModal ? 'নতুন গ্রুপ তৈরি' : 'গ্রুপ এডিট'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={showCreateModal ? handleCreateGroup : handleUpdateGroup}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      গ্রুপের নাম *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      গ্রুপ কোড (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input"
                      placeholder="যেমন: GRP001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      বিবরণ (ঐচ্ছিক)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="input"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FiSettings className="inline w-4 h-4 mr-1" />
                      গ্রুপ ম্যানেজার অনুমতি
                    </label>
                    <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {settingsOptions.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.settings[key]}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setFormData({
                                ...formData,
                                settings: {
                                  ...formData.settings,
                                  [key]: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="btn btn-outline"
                  >
                    বাতিল
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {showCreateModal ? 'তৈরি করুন' : 'আপডেট করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-gray-100">
                  {selectedGroup.name} - সদস্য ({members.length})
                </h2>
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedGroup(null);
                    setMembers([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={openAddMemberModal}
                  className="btn btn-primary text-sm flex items-center gap-1"
                >
                  <FiUserPlus className="w-4 h-4" />
                  সদস্য যোগ করুন
                </button>
                {isAdmin && (
                  <button
                    onClick={openManagerModal}
                    className="btn btn-outline text-sm flex items-center gap-1"
                  >
                    <FiShield className="w-4 h-4" />
                    ম্যানেজার নির্ধারণ
                  </button>
                )}
              </div>

              {/* Members list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    কোন সদস্য নেই
                  </p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-medium">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2 dark:text-gray-100">
                            {member.name}
                            {member.isGroupManager && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                ম্যানেজার
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                        title="সরিয়ে দিন"
                      >
                        <FiUserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-gray-100">সদস্য যোগ করুন</h2>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedUsers([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {availableUsers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  কোন ইউজার পাওয়া যায়নি যারা গ্রুপে নেই
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {selectedUsers.length} জন নির্বাচিত
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                    {availableUsers.map((user) => (
                      <label
                        key={user._id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user._id)
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-500'
                            : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium dark:text-gray-100">{user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                        {selectedUsers.includes(user._id) && (
                          <FiCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddMemberModal(false);
                        setSelectedUsers([]);
                      }}
                      className="btn btn-outline"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={handleAddMembers}
                      className="btn btn-primary"
                      disabled={selectedUsers.length === 0}
                    >
                      যোগ করুন ({selectedUsers.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Set Manager Modal */}
      {showManagerModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-gray-100">
                  গ্রুপ ম্যানেজার নির্ধারণ
                </h2>
                <button
                  onClick={() => setShowManagerModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {members.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  প্রথমে গ্রুপে সদস্য যোগ করুন
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {/* Option to remove manager */}
                  {selectedGroup.manager && (
                    <button
                      onClick={() => handleSetManager(null)}
                      className="w-full flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <FiX className="w-5 h-5" />
                      <span>ম্যানেজার সরিয়ে দিন</span>
                    </button>
                  )}

                  {members.map((member) => (
                    <button
                      key={member._id}
                      onClick={() => handleSetManager(member._id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        member.isGroupManager
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 font-medium">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium flex items-center gap-2 dark:text-gray-100">
                          {member.name}
                          {member.isGroupManager && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                              বর্তমান ম্যানেজার
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </p>
                      </div>
                      {member.isGroupManager && (
                        <FiShield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
