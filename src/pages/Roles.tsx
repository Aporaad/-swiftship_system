import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, Edit2, X, Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { useRole } from '../hooks/useRole';

const AVAILABLE_PERMISSIONS = [
  { id: 'view_dashboard', label: 'عرض لوحة التحكم', group: 'عام' },
  { id: 'view_orders', label: 'عرض الطلبات', group: 'الطلبات' },
  { id: 'manage_orders', label: 'إدارة الطلبات (إضافة/تعديل)', group: 'الطلبات' },
  { id: 'update_order_status', label: 'تحديث حالة الطلب فقط', group: 'الطلبات' },
  { id: 'delete_orders', label: 'حذف الطلبات', group: 'الطلبات' },
  { id: 'view_customers', label: 'عرض العملاء', group: 'العملاء' },
  { id: 'manage_customers', label: 'إدارة العملاء', group: 'العملاء' },
  { id: 'manage_sources', label: 'إدارة مصادر الطلبات', group: 'المسؤول' },
  { id: 'manage_couriers', label: 'إدارة المناديب', group: 'المسؤول' },
  { id: 'manage_users', label: 'إدارة الموظفين والأدوار', group: 'المسؤول' },
  { id: 'view_finance', label: 'عرض البيانات المالية', group: 'المحاسبة' },
  { id: 'manage_finance', label: 'إدارة المالية والمدفوعات', group: 'المحاسبة' },
  { id: 'settings', label: 'إعدادات النظام', group: 'المسؤول' },
];

export default function Roles() {
  const [roles, setRoles] = useState<any[]>([]);
  const { role: currentUserRole, hasPermission, loading: roleLoading } = useRole();
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
    if (!formData.id) return alert('يرجى إدخال معرف الدور');
    
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
      return alert('لا يمكن حذف الأدوار الأساسية للنظام');
    }
    if (!window.confirm(`هل أنت متأكد من حذف دور ${id}؟`)) return;
    try {
      await deleteDoc(doc(db, 'roles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'roles');
    }
  };

  if (loading || roleLoading) return <div className="p-20 text-center text-slate-500 font-bold">جاري تحميل الأدوار...</div>;

  if (currentUserRole !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4"><X className="w-12 h-12 text-red-500" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">عذراً، لا تملك الصلاحية</h2>
        <p className="text-slate-500">إدارة الأدوار مخصصة لمدير النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-600"><Shield className="w-6 h-6" /></div>
          <h1 className="text-xl font-bold text-slate-800">إدارة الأدوار والصلاحيات</h1>
        </div>
        <button onClick={handleOpenAdd} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-purple-700 transition shadow-sm">
          <Plus className="w-4 h-4"/> إنشاء دور جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{r.title || r.id}</h3>
                <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{r.id}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenEdit(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                {!['Admin', 'Employee', 'Courier', 'Accountant'].includes(r.id) && (
                  <button onClick={() => handleDelete(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">الصلاحيات الممنوحة:</div>
              <div className="flex flex-wrap gap-2">
                {r.permissions?.map((pId: string) => {
                  const perm = AVAILABLE_PERMISSIONS.find(ap => ap.id === pId);
                  return (
                    <span key={pId} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                      {perm?.label || pId}
                    </span>
                  );
                })}
                {(!r.permissions || r.permissions.length === 0) && (
                  <span className="text-slate-400 text-xs italic">لا توجد صلاحيات محددة</span>
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
