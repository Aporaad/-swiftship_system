import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Search, Edit2, X, Plus, UserX, UserCheck, Trash2, Truck, DollarSign, Receipt, Briefcase, History, MapPin, Package, CheckCircle, Clock, User } from 'lucide-react';
import { useRole } from '../hooks/useRole';

export default function Couriers() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const { role, hasPermission, loading: roleLoading } = useRole();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [courierOrders, setCourierOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    disabled: false,
    commissionRate: 0
  });

  const [addFormData, setAddFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    commissionRate: 0
  });

  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'Courier'));
    const unsub = onSnapshot(q, (snap) => {
      setCouriers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsub;
  }, []);

  const handleOpenEdit = (courier: any) => {
    setSelectedCourier(courier);
    setEditFormData({
      fullName: courier.fullName || '',
      disabled: courier.disabled || false,
      commissionRate: courier.commissionRate || 0
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = (courier: any) => {
    setSelectedCourier(courier);
    setIsDetailsModalOpen(true);
    setOrdersLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('delivery_courier_id', '==', courier.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setCourierOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrdersLoading(false);
    }, (err) => {
      console.error(err);
      setOrdersLoading(false);
    });

    return unsub;
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;
    try {
      await updateDoc(doc(db, 'users', selectedCourier.id), {
        fullName: editFormData.fullName,
        disabled: editFormData.disabled,
        commissionRate: editFormData.commissionRate,
        updatedAt: Date.now()
      });
      setIsEditModalOpen(false);
      setSelectedCourier(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleToggleStatus = async (courier: any) => {
    const action = courier.disabled ? 'تفعيل' : 'تعطيل';
    if (!window.confirm(`هل أنت متأكد من ${action} حساب المندوب ${courier.fullName}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', courier.id), {
        disabled: !courier.disabled,
        updatedAt: Date.now()
      });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteCourier = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المندوب ${name}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'users');
    }
  };

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const appName = "Secondary" + Date.now();
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, addFormData.email, addFormData.password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: addFormData.email,
        fullName: addFormData.fullName,
        role: 'Courier',
        commissionRate: addFormData.commissionRate,
        disabled: false,
        createdAt: Date.now()
      });
      
      await signOut(secondaryAuth);
      
      setIsAddModalOpen(false);
      setAddFormData({ fullName: '', email: '', password: '', commissionRate: 0 });
    } catch(err: any) {
      alert("حدث خطأ أثناء إضافة المندوب: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const filteredCouriers = couriers.filter(o => 
    o.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Financial Stats for Selected Courier
  const deliveredOrders = courierOrders.filter(o => (o.order_status || o.orderStatus) === 'تم التسليم');
  const totalDelivered = deliveredOrders.length;
  const totalInTransit = courierOrders.filter(o => ['جاري التوصيل', 'في المستودع'].includes(o.order_status || o.orderStatus)).length;
  
  const totalEarnings = deliveredOrders.reduce((acc, o) => {
    // Assuming shipping cost is in the first shipping entry
    const shippingCost = (parseFloat(o.shippings?.[0]?.cost) || 0);
    const rate = (selectedCourier?.commissionRate || 0) / 100;
    return acc + (shippingCost * rate);
  }, 0);

  if (loading || roleLoading) return <div className="p-20 text-center text-slate-500 font-bold">جاري تحميل بيانات المناديب...</div>;

  if (!hasPermission('manage_couriers') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4"><X className="w-12 h-12 text-red-500" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">عذراً، لا تملك الصلاحية</h2>
        <p className="text-slate-500">هذه الصفحة مخصصة للمديرين أو المسؤولين عن المناديب.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><Truck className="w-6 h-6" /></div>
          <h1 className="text-xl font-bold text-slate-800">إدارة المناديب</h1>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-emerald-700 transition shadow-sm">
          <Plus className="w-4 h-4"/> إضافة مندوب جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col font-sans">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-slate-800">قائمة المناديب</h4>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث باسم المندوب..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-slate-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold">المندوب</th>
                <th className="p-4 font-bold">البريد الإلكتروني</th>
                <th className="p-4 font-bold text-center">العمولة</th>
                <th className="p-4 font-bold">الحالة</th>
                <th className="p-4 font-bold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredCouriers.map(courier => (
                <tr key={courier.id} className={`hover:bg-slate-50 transition-colors ${courier.disabled ? 'opacity-50' : ''}`}>
                  <td className="p-4" onClick={() => handleOpenDetails(courier)}>
                    <div className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        {courier.fullName?.substring(0, 2)}
                      </div>
                      <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{courier.fullName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium font-mono text-xs" dir="ltr">{courier.email}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter">
                      {courier.commissionRate || 0}%
                    </span>
                  </td>
                  <td className="p-4">
                    {courier.disabled ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold">معطل</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">نشط</span>
                    )}
                  </td>
                  <td className="p-4 text-left flex justify-end gap-2">
                    <button onClick={() => handleOpenDetails(courier)} title="عرض سجل التسليمات والمالية" className="text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 transition-all p-2 rounded-lg">
                      <Receipt className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleStatus(courier)} className={`p-2 rounded-lg transition-colors ${courier.disabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
                      {courier.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleOpenEdit(courier)} className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 transition-all p-2 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCourier(courier.id, courier.fullName)} className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 transition-all p-2 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCouriers.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-12 text-center text-slate-400 font-bold italic">لا يوجد مناديب مطابقين للبحث.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details / Report Modal */}
      {isDetailsModalOpen && selectedCourier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-slate-50 rounded-2xl shadow-xl max-w-5xl w-full h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-emerald-50">
                    {selectedCourier.fullName?.substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 leading-none mb-1">{selectedCourier.fullName}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter" dir="ltr">{selectedCourier.email}</span>
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                      <span className="text-[10px] font-black text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">عمولة ثابتة: {selectedCourier.commissionRate}%</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => setIsDetailsModalOpen(false)} className="bg-slate-100 p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all active:scale-95"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              {/* Courier Performance Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><CheckCircle className="w-6 h-6" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">التسليمات المنجزة</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-800">{totalDelivered}</span>
                    <span className="text-xs font-bold text-slate-400">طلب</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors"><Clock className="w-6 h-6" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">قيد التوصيل</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-800">{totalInTransit}</span>
                    <span className="text-xs font-bold text-slate-400">طلب</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm transition-all hover:shadow-md group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><DollarSign className="w-6 h-6" /></div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-left">صافي المستحقات</span>
                  </div>
                  <div className="flex items-baseline gap-1 relative z-10">
                    <span className="text-3xl font-black text-emerald-700">${totalEarnings.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-emerald-400">من التسليمات فعلياً</span>
                  </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-3xl shadow-lg transition-all hover:shadow-xl group flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">إجمالي المنقول</span>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-white">{courierOrders.length}</span>
                    <Truck className="w-8 h-8 text-slate-600 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Delivery History Log */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                      <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">سجل التسليمات (التتبع)</h4>
                    </div>
                    <span className="text-[10px] bg-white px-3 py-1 rounded-full border border-slate-200 font-bold text-slate-400">محدث لغاية اللحظة</span>
                 </div>

                 {ordersLoading ? (
                    <div className="p-20 text-center text-slate-400 font-bold">جاري استخراج السجل من قاعدة البيانات...</div>
                 ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {courierOrders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4 hover:border-emerald-200 transition-all group">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${ (order.order_status || order.orderStatus) === "تم التسليم" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600" }`}>
                              <Package className="w-6 h-6" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                 <span className="font-mono font-black text-slate-800 text-sm truncate pr-2">#{order.trackingNumber}</span>
                                 <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${ (order.order_status || order.orderStatus) === "تم التسليم" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700" }`}>
                                   {order.order_status || order.orderStatus || 'معلق'}
                                 </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mb-2">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.receiver_name || 'مستلم مجهول'}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.receiver_city || '-'}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <DollarSign className="w-3 h-3 text-slate-300" />
                                   <span className="text-[10px] font-black text-slate-500">الحساب: <span className="text-slate-800">${order.totalPrice}</span></span>
                                 </div>
                                 <div className="text-[9px] font-mono font-bold text-slate-300">
                                   {new Date(order.createdAt).toLocaleDateString('ar-YE')}
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                      {courierOrders.length === 0 && (
                        <div className="lg:col-span-2 p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 italic font-bold">
                          لا توجد أي تسليمات مسجلة باسم هذا المندوب في النظام.
                        </div>
                      )}
                    </div>
                 )}
              </div>
            </div>
            
            <div className="p-5 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تتبع حي للمندوب متاح حالياً</span>
               </div>
               <div className="flex gap-3">
                 <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95">
                   <History className="w-4 h-4" /> سجل المسارات
                 </button>
                 <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95">
                   <Receipt className="w-4 h-4" /> استخراج كشف مالي وحوافز
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Courier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <h3 className="font-bold text-emerald-900 text-lg">إضافة مندوب جديد</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-emerald-400 hover:text-emerald-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddCourier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل للمندوب</label>
                <input required type="text" value={addFormData.fullName} onChange={(e) => setAddFormData({...addFormData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input required type="email" value={addFormData.email} onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-left font-mono" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور المؤقتة</label>
                <input required type="password" minLength={6} value={addFormData.password} onChange={(e) => setAddFormData({...addFormData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-left font-mono" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">نسبة العمولة (%)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="number" min="0" max="100" step="0.1" value={addFormData.commissionRate} onChange={(e) => setAddFormData({...addFormData, commissionRate: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl p-3 pl-10 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button type="submit" disabled={addLoading} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-sm transition-all">
                  {addLoading ? 'جاري الإضافة...' : 'حفظ وإضافة المندوب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Courier Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">تعديل بيانات المندوب</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleUpdateCourier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input required type="text" value={editFormData.fullName} onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">نسبة العمولة (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={editFormData.commissionRate} onChange={(e) => setEditFormData({...editFormData, commissionRate: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={editFormData.disabled} onChange={(e) => setEditFormData({...editFormData, disabled: e.target.checked})} className="w-4 h-4 text-red-600 focus:ring-red-500 border-slate-300 rounded" />
                  <span className="text-sm font-bold text-red-600">تعطيل حساب المندوب مؤقتاً</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
