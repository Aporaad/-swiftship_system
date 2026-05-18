import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Search, Edit2, X, Plus, UserX, UserCheck, Trash2, Users as UsersIcon, Shield } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';
import { notificationService } from '../services/notificationService';
import ConfirmModal from '../components/ConfirmModal';

export default function Users() {
  const { settings, t } = useSettings();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const { role, hasPermission, profile: currentUserDoc, loading: roleLoading } = useRole();

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  useEffect(() => {
    if (roleLoading) return;
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubRoles();
  }, [roleLoading]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    role: '',
    disabled: false,
    commissionRate: 0,
    username: '',
    systemPin: ''
  });

  const [addFormData, setAddFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    systemPin: '',
    role: 'Employee',
    commissionRate: 0
  });

  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsub;
  }, [roleLoading]);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName || '',
      username: user.username || '',
      role: user.role || 'Employee',
      disabled: user.disabled || false,
      commissionRate: user.commissionRate || 0,
      systemPin: user.systemPin || ''
    });
    setIsEditModalOpen(true);
  };

  const ROOT_EMAIL = 'alsrhyarslan5@gmail.com';

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    // Check if username is taken if changed
    if (editFormData.username && editFormData.username !== selectedUser.username) {
      const q = query(collection(db, 'users'), where('username', '==', editFormData.username));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== selectedUser.id) {
        return notificationService.notify({
          title: settings.language === 'ar' ? 'خطأ' : 'Error',
          message: settings.language === 'ar' ? 'هذا المعرف مستخدم بالفعل' : 'This ID/Username is already taken',
          type: 'error'
        });
      }
    }

    // Prevent changing root user role
    const isRoot = selectedUser.email === ROOT_EMAIL;
    const finalRole = isRoot ? 'Admin' : editFormData.role;
    const finalDisabled = isRoot ? false : editFormData.disabled;

    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        fullName: editFormData.fullName,
        username: editFormData.username,
        role: finalRole,
        disabled: finalDisabled,
        commissionRate: editFormData.commissionRate,
        systemPin: editFormData.systemPin,
        updatedAt: Date.now()
      });
      notificationService.notify({
        title: settings.language === 'ar' ? 'تحديث مستخدم' : 'User Updated',
        message: settings.language === 'ar' ? `تم تحديث بيانات المستخدم ${editFormData.fullName}` : `User ${editFormData.fullName} has been updated`,
        type: 'info'
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleToggleStatus = async (user: any) => {
    if (user.email === ROOT_EMAIL) {
      return notificationService.notify({
        title: settings.language === 'ar' ? 'فشل العملية' : 'Operation Failed',
        message: settings.language === 'ar' ? 'لا يمكن تعطيل حساب المسؤول الرئيسي' : 'Cannot disable root admin account',
        type: 'error'
      });
    }
    const action = user.disabled ? 'تفعيل' : 'تعطيل';
    
    setConfirmConfig({
      isOpen: true,
      title: settings.language === 'ar' ? `${action} الحساب` : `${action} Account`,
      message: settings.language === 'ar' ? `هل أنت متأكد من ${action} حساب ${user.fullName}؟` : `Are you sure you want to ${action} ${user.fullName}'s account?`,
      type: user.disabled ? 'success' : 'warning' as any,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            disabled: !user.disabled,
            updatedAt: Date.now()
          });
          notificationService.notify({
            title: settings.language === 'ar' ? 'تحديث حالة مستخدم' : 'User Status Updated',
            message: settings.language === 'ar' ? `تم ${action} حساب المستخدم ${user.fullName}` : `User account ${user.fullName} has been ${user.disabled ? 'enabled' : 'disabled'}`,
            type: user.disabled ? 'success' : 'warning'
          });
        } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }
    });
  };

  const handleDeleteUser = async (id: string, name: string) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.email === ROOT_EMAIL) {
      return notificationService.notify({
        title: settings.language === 'ar' ? 'فشل العملية' : 'Operation Failed',
        message: settings.language === 'ar' ? 'لا يمكن حذف حساب المسؤول الرئيسي' : 'Cannot delete root admin account',
        type: 'error'
      });
    }
    setConfirmConfig({
      isOpen: true,
      title: settings.language === 'ar' ? 'حذف المستخدم' : 'Delete User',
      message: settings.language === 'ar' ? `هل أنت متأكد من رغبتك في حذف المستخدم ${name}؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete user ${name}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', id));
          notificationService.notify({
            title: settings.language === 'ar' ? 'حذف مستخدم' : 'User Deleted',
            message: settings.language === 'ar' ? `تم حذف المستخدم ${name} نهائياً` : `User ${name} has been deleted`,
            type: 'error'
          });
        } catch(err: any) {
          console.error(err);
          notificationService.notify({
            title: settings.language === 'ar' ? 'خطأ في الحذف' : 'Delete Error',
            message: settings.language === 'ar' ? `تعذر حذف المستخدم: ${err.message}` : `Could not delete user: ${err.message}`,
            type: 'error'
          });
        }
      }
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      // Check if email or username already exists
      const emailQuery = query(collection(db, 'users'), where('email', '==', addFormData.email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) throw new Error(settings.language === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email is already in use');

      if (addFormData.username) {
        const usernameQuery = query(collection(db, 'users'), where('username', '==', addFormData.username));
        const usernameSnap = await getDocs(usernameQuery);
        if (!usernameSnap.empty) throw new Error(settings.language === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'Username is already taken');
      }

      const tempId = 'user_' + Date.now();
      await setDoc(doc(db, 'users', tempId), {
        fullName: addFormData.fullName,
        email: addFormData.email.toLowerCase(),
        username: addFormData.username,
        systemPin: addFormData.systemPin,
        role: addFormData.role,
        commissionRate: addFormData.commissionRate,
        disabled: false,
        createdAt: Date.now()
      });

      notificationService.notify({
        title: settings.language === 'ar' ? 'إضافة موظف' : 'Employee Added',
        message: settings.language === 'ar' ? `تمت إضافة الموظف ${addFormData.fullName} بنجاح. سيتمكن من الدخول عند تسجيله ببريده عبر Google.` : `Employee ${addFormData.fullName} added successfully. They can now sign in using their Google account.`,
        type: 'success'
      });
      
      setIsAddModalOpen(false);
      setAddFormData({ fullName: '', username: '', email: '', systemPin: '', role: 'Employee', commissionRate: 0 });
    } catch(err: any) {
      console.error("Error adding user:", err);
      notificationService.notify({
        title: settings.language === 'ar' ? 'خطأ في الإضافة' : 'Addition Error',
        message: err.message,
        type: 'error'
      });
    } finally {
      setAddLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'Admin':
        return <span className="bg-slate-900 dark:bg-slate-800 text-slate-100 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-700 uppercase">{t('admin')}</span>;
      case 'Employee':
        return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-xl text-[10px] font-black border border-blue-200 dark:border-blue-800">{t('user')}</span>;
      case 'Courier':
        return <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-200 dark:border-emerald-800">{t('courier')}</span>;
      case 'Accountant':
        return <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-xl text-[10px] font-black border border-amber-200 dark:border-amber-800">{settings.language === 'ar' ? 'محاسب' : 'Accountant'}</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-3 py-1 rounded-xl text-[10px] font-black">{role || '...'}</span>;
    }
  };

  const filteredUsers = users
    .filter(o => 
      (o.fullName?.toLowerCase().includes(search.toLowerCase()) ||
       o.email?.toLowerCase().includes(search.toLowerCase())) &&
      (roleFilter === 'all' || o.role === roleFilter) &&
      (statusFilter === 'all' || (statusFilter === 'active' ? !o.disabled : o.disabled))
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
      return 0;
    });

  if (loading || roleLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 dark:text-slate-400 font-bold">
        {settings.language === 'ar' ? 'جاري التحميل والتحقق من الصلاحيات...' : 'Checking permissions and loading data...'}
      </div>
    );
  }

  if (!hasPermission('manage_users') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{settings.language === 'ar' ? 'هذه الصفحة مخصصة للمديرين أو مسؤولي شؤون الموظفين.' : 'This page is restricted to administrators and personnel managers.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-start transition-colors">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><UsersIcon className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{t('users')}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{settings.language === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'User and Permission Management'}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm hover:bg-blue-700 transition transform active:scale-95 shadow-md shadow-blue-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" /> {settings.language === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'}
        </button>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { role: 'Admin', title: t('admin'), color: 'bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800', desc: settings.language === 'ar' ? 'صلاحيات كاملة على الطلبات، المحاسبة، والمستخدمين.' : 'Full access to orders, finance, and users.' },
          { role: 'Accountant', title: settings.language === 'ar' ? 'محاسب' : 'Accountant', color: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800', desc: settings.language === 'ar' ? 'إدارة المالية والمدفوعات والمصادر والتقارير.' : 'Financial, payments, sources, and report management.' },
          { role: 'Employee', title: t('user'), color: 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800', desc: settings.language === 'ar' ? 'إدارة الطلبات والعملاء وتتبع الشحنات.' : 'Order, customer, and shipment tracking management.' }
        ].map((info) => (
          <div key={info.role} className={`p-4 rounded-2xl border ${info.color} transition-all hover:shadow-md`}>
            <div className="font-bold text-sm mb-1">{info.title}</div>
            <p className="text-[11px] opacity-80 leading-relaxed">{info.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الايميل..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50"
            />
          </div>

          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">كل الأدوار</option>
            <option value="Admin">مدير</option>
            <option value="Employee">موظف</option>
            <option value="Accountant">محاسب</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="disabled">معطل</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
            <option value="newest">الأحدث انضماماً</option>
            <option value="name-asc">الاسم (أ-ي)</option>
          </select>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-black">{settings.language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-4">{settings.language === 'ar' ? 'الاسم والبيانات' : 'Name & Info'}</th>
                  <th className="p-4">{t('roles')}</th>
                  <th className="p-4">{settings.language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-4 text-left">{settings.language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 flex-1">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50 cursor-pointer transition-colors ${user.disabled ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{user.fullName || 'بدون اسم'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium" dir="ltr">{user.email}</span>
                          {user.username && (
                            <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-600 font-bold">@{user.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      {user.disabled ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">معطل</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">نشط</span>
                      )}
                    </td>
                    <td className="p-4 text-left flex justify-end gap-2">
                       {user.email !== ROOT_EMAIL && (
                         <button 
                           onClick={() => handleToggleStatus(user)}
                           className={`p-2 rounded-lg transition-colors ${user.disabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                           title={user.disabled ? 'تفعيل المستخدم' : 'تعطيل المستخدم'}
                         >
                           {user.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                         </button>
                       )}
                      <button 
                        onClick={() => handleOpenEdit(user)}
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors p-2 rounded-lg"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {hasPermission('delete_users') && user.email !== ROOT_EMAIL && (
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.fullName)}
                          className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 transition-all p-2 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      لا يوجد مستخدمين.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">إضافة موظف جديد</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input required type="text" value={addFormData.fullName} onChange={(e) => setAddFormData({...addFormData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {settings.language === 'ar' ? 'المعرف (ID/Username)' : 'ID/Username'}
                  </label>
                  <input required type="text" value={addFormData.username} onChange={(e) => setAddFormData({...addFormData, username: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. ahmed123" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {settings.language === 'ar' ? 'رمز الدخول (PIN)' : 'Access PIN'}
                  </label>
                  <input required type="password" minLength={4} value={addFormData.systemPin} onChange={(e) => setAddFormData({...addFormData, systemPin: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني (الرسمي)</label>
                <input required type="email" value={addFormData.email} onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الدور (الصلاحية)</label>
                <select required value={addFormData.role} onChange={(e) => setAddFormData({...addFormData, role: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
                  <option value="Admin">مدير (Admin)</option>
                  <option value="Employee">موظف (Employee)</option>
                  <option value="Accountant">محاسب (Accountant)</option>
                  {roles.filter(r => !['Admin', 'Employee', 'Courier', 'Accountant'].includes(r.id)).map(r => (
                    <option key={r.id} value={r.id}>{r.title || r.id}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button type="submit" disabled={addLoading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-sm transition-all">
                  {addLoading ? 'جاري الإضافة...' : 'حفظ وإضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">تعديل صلاحيات المستخدم</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input required type="text" value={editFormData.fullName} onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {settings.language === 'ar' ? 'المعرف (ID/Username)' : 'ID/Username'}
                </label>
                <input required type="text" value={editFormData.username} onChange={(e) => setEditFormData({...editFormData, username: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {settings.language === 'ar' ? 'رمز الدخول للنظام (PIN)' : 'System Access PIN'}
                </label>
                <div className="relative">
                   <input required type="text" value={editFormData.systemPin} onChange={(e) => setEditFormData({...editFormData, systemPin: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-black text-lg tracking-widest text-center" placeholder="123456" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الدور (الصلاحية)</label>
                <select 
                  required 
                  disabled={selectedUser?.email === ROOT_EMAIL}
                  value={editFormData.role} 
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} 
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="Admin">مدير (Admin)</option>
                  <option value="Employee">موظف (Employee)</option>
                  <option value="Accountant">محاسب (Accountant)</option>
                  {roles.filter(r => !['Admin', 'Employee', 'Courier', 'Accountant'].includes(r.id)).map(r => (
                    <option key={r.id} value={r.id}>{r.title || r.id}</option>
                  ))}
                </select>
              </div>

               {selectedUser?.email !== ROOT_EMAIL && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input type="checkbox" checked={editFormData.disabled} onChange={(e) => setEditFormData({...editFormData, disabled: e.target.checked})} className="w-4 h-4 text-red-600 focus:ring-red-500 border-slate-300 rounded" />
                    <span className="text-sm font-bold text-red-600">تعطيل وإيقاف حساب المستخدم</span>
                  </label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
  );
}

