import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, Edit2, X, Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

const AVAILABLE_PERMISSIONS = (t: any, lang: string) => [
  { id: 'view_dashboard', label: lang === 'ar' ? 'عرض لوحة التحكم' : 'View Dashboard', group: lang === 'ar' ? 'عام' : 'General' },
  { id: 'view_orders', label: lang === 'ar' ? 'عرض الطلبات' : 'View Orders', group: lang === 'ar' ? 'الطلبات' : 'Orders' },
  { id: 'manage_orders', label: lang === 'ar' ? 'إدارة الطلبات (إضافة/تعديل)' : 'Manage Orders (Add/Edit)', group: lang === 'ar' ? 'الطلبات' : 'Orders' },
  { id: 'update_order_status', label: lang === 'ar' ? 'تحديث حالة الطلب فقط' : 'Update Order Status Only', group: lang === 'ar' ? 'الطلبات' : 'Orders' },
  { id: 'delete_orders', label: lang === 'ar' ? 'حذف الطلبات' : 'Delete Orders', group: lang === 'ar' ? 'الطلبات' : 'Orders' },
  { id: 'view_customers', label: lang === 'ar' ? 'عرض العملاء' : 'View Customers', group: lang === 'ar' ? 'العملاء' : 'Customers' },
  { id: 'manage_customers', label: lang === 'ar' ? 'إدارة العملاء' : 'Manage Customers', group: lang === 'ar' ? 'العملاء' : 'Customers' },
  { id: 'manage_sources', label: lang === 'ar' ? 'إدارة مصادر الطلبات' : 'Manage Order Sources', group: lang === 'ar' ? 'المسؤول' : 'Admin' },
  { id: 'manage_couriers', label: lang === 'ar' ? 'إدارة المناديب' : 'Manage Couriers', group: lang === 'ar' ? 'المسؤول' : 'Admin' },
  { id: 'manage_users', label: lang === 'ar' ? 'إدارة الموظفين والأدوار' : 'Manage Staff & Roles', group: lang === 'ar' ? 'المسؤول' : 'Admin' },
  { id: 'view_finance', label: lang === 'ar' ? 'عرض البيانات المالية' : 'View Financial Data', group: lang === 'ar' ? 'المحاسبة' : 'Accounting' },
  { id: 'manage_finance', label: lang === 'ar' ? 'إدارة المالية والمدفوعات' : 'Manage Finance & Payments', group: lang === 'ar' ? 'المحاسبة' : 'Accounting' },
  { id: 'settings', label: lang === 'ar' ? 'إعدادات النظام' : 'System Settings', group: lang === 'ar' ? 'المسؤول' : 'Admin' },
];

export default function Roles() {
  const { role: currentUserRole, hasPermission, loading: roleLoading } = useRole();
  const { settings, t } = useSettings();
  const currentPermissions = AVAILABLE_PERMISSIONS(t, settings.language);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'roles'), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roles');
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setSelectedRole(null);
    setFormData({ id: '', title: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setSelectedRole(role);
    setFormData({
      id: role.id,
      title: role.title || role.id,
      permissions: role.permissions || []
    });
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return alert(settings.language === 'ar' ? 'يرجى إدخال معرف الدور' : 'Please enter role ID');
    
    try {
      await setDoc(doc(db, 'roles', formData.id), {
        title: formData.title,
        permissions: formData.permissions,
        updatedAt: Date.now()
      });
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'roles');
    }
  };

  const handleDelete = async (id: string) => {
    if (['Admin', 'Employee', 'Courier', 'Accountant'].includes(id)) {
      return alert(settings.language === 'ar' ? 'لا يمكن حذف الأدوار الأساسية للنظام' : 'Cannot delete core roles');
    }
    if (!window.confirm(settings.language === 'ar' ? `هل أنت متأكد من حذف دور ${id}؟` : `Are you sure you want to delete role ${id}?`)) return;
    try {
      await deleteDoc(doc(db, 'roles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'roles');
    }
  };

  if (loading || roleLoading) return <div className="p-20 text-center text-slate-500 font-bold">{settings.language === 'ar' ? 'جاري تحميل الأدوار...' : 'Loading roles...'}</div>;

  if (currentUserRole !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4"><X className="w-12 h-12 text-red-500" /></div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{settings.language === 'ar' ? 'إدارة الأدوار مخصصة لمدير النظام فقط.' : 'Role management is restricted to system administrators.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-start transition-colors">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2.5 rounded-2xl text-white shadow-lg shadow-purple-200 dark:shadow-none"><Shield className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{settings.language === 'ar' ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{settings.language === 'ar' ? 'تخصيص مستويات وصول المستخدمين' : 'Configure user access levels'}</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm hover:bg-purple-700 transition transform active:scale-95 shadow-md shadow-purple-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" /> {settings.language === 'ar' ? 'إنشاء دور جديد' : 'Create New Role'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(r => (
          <div key={r.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-none">{r.title || r.id}</h3>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter" dir="ltr">{r.id}</span>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenEdit(r)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
                {!['Admin', 'Employee', 'Courier', 'Accountant'].includes(r.id) && (
                  <button 
                    onClick={() => handleDelete(r.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest leading-none">
                {settings.language === 'ar' ? 'الصلاحيات الممنوحة:' : 'Assigned Permissions:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.permissions?.map((pId: string) => {
                  const perm = currentPermissions.find(ap => ap.id === pId);
                  return (
                    <span 
                      key={pId} 
                      className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {perm?.label || pId}
                    </span>
                  );
                })}
                {(!r.permissions || r.permissions.length === 0) && (
                  <span className="text-slate-400 text-xs italic">{settings.language === 'ar' ? 'لا توجد صلاحيات محددة' : 'No permissions assigned'}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">{selectedRole ? 'تعديل الدور' : 'إنشاء دور مخصص'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">اسم الدور (بالعربي)</label>
                  <input required placeholder="مثل: مشرف مستودع" type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">المعرف (انجليزي)</label>
                  <input required disabled={!!selectedRole} placeholder="مثل: Warehouse_Supervisor" type="text" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-mono" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">تخصيص الصلاحيات</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div 
                        onClick={() => togglePermission(perm.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${formData.permissions.includes(perm.id) ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'}`}
                      >
                        {formData.permissions.includes(perm.id) && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800">{perm.label}</div>
                        <div className="text-[10px] text-slate-400">{perm.group}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all">حفظ وتحميل الدور</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
