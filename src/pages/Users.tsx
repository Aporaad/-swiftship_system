import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Search, Edit2, X, Plus, UserX, UserCheck } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    role: '',
    disabled: false
  });

  const [addFormData, setAddFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Employee'
  });

  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsub;
  }, []);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName || '',
      role: user.role || 'Employee',
      disabled: user.disabled || false
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        fullName: editFormData.fullName,
        role: editFormData.role,
        disabled: editFormData.disabled,
        updatedAt: Date.now()
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        disabled: !user.disabled,
        updatedAt: Date.now()
      });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      // Use secondary app to create user without logging out current admin
      const appName = "Secondary" + Date.now();
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, addFormData.email, addFormData.password);
      
      // Store user details in Firestore via main db
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: addFormData.email,
        fullName: addFormData.fullName,
        role: addFormData.role,
        disabled: false,
        createdAt: Date.now()
      });
      
      await signOut(secondaryAuth);
      
      setIsAddModalOpen(false);
      setAddFormData({ fullName: '', email: '', password: '', role: 'Employee' });
    } catch(err: any) {
      alert("حدث خطأ أثناء إضافة المستخدم: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'Admin':
        return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">صلاحيات كاملة</span>;
      case 'Employee':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">موظف</span>;
      case 'Courier':
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">مندوب</span>;
      case 'Accountant':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">محاسب</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{role || 'غير محدد'}</span>;
    }
  };

  const filteredUsers = users.filter(o => 
    o.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">الموظفين والمندوبين</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition">
          <Plus className="w-4 h-4"/> إضافة موظف جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-slate-800">قائمة المستخدمين</h4>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الايميل..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">جاري تحميل المستخدمين...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">الاسم</th>
                  <th className="p-4 font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold">الدور</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 flex-1">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50 cursor-pointer transition-colors ${user.disabled ? 'opacity-50' : ''}`}>
                    <td className="p-4 font-bold text-slate-800">{user.fullName || 'بدون اسم'}</td>
                    <td className="p-4 text-slate-600 font-medium" dir="ltr">{user.email}</td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      {user.disabled ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">معطل</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">نشط</span>
                      )}
                    </td>
                    <td className="p-4 text-left flex justify-end gap-2">
                       <button 
                         onClick={() => handleToggleStatus(user)}
                         className={`p-2 rounded-lg transition-colors ${user.disabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                         title={user.disabled ? 'تفعيل المستخدم' : 'تعطيل المستخدم'}
                       >
                         {user.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                       </button>
                      <button 
                        onClick={() => handleOpenEdit(user)}
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors p-2 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني (لتسجيل الدخول)</label>
                <input required type="email" value={addFormData.email} onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left flex-row-reverse" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور المؤقتة</label>
                <input required type="password" minLength={6} value={addFormData.password} onChange={(e) => setAddFormData({...addFormData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left flex-row-reverse" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الدور (الصلاحية)</label>
                <select required value={addFormData.role} onChange={(e) => setAddFormData({...addFormData, role: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
                  <option value="Admin">مدير (Admin)</option>
                  <option value="Employee">موظف (Employee)</option>
                  <option value="Courier">مندوب (Courier)</option>
                  <option value="Accountant">محاسب (Accountant)</option>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">الدور (الصلاحية)</label>
                <select required value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
                  <option value="Admin">مدير (Admin)</option>
                  <option value="Employee">موظف (Employee)</option>
                  <option value="Courier">مندوب (Courier)</option>
                  <option value="Accountant">محاسب (Accountant)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={editFormData.disabled} onChange={(e) => setEditFormData({...editFormData, disabled: e.target.checked})} className="w-4 h-4 text-red-600 focus:ring-red-500 border-slate-300 rounded" />
                  <span className="text-sm font-bold text-red-600">تعطيل وإيقاف حساب المستخدم</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

