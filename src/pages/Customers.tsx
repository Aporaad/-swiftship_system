import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, onSnapshot, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Search, Edit2, Trash2, X, User, Phone, Mail, MapPin, Receipt, DollarSign, Package, AlertCircle } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

export default function Customers() {
  const { role, hasPermission, loading: roleLoading } = useRole();
  const { settings, t } = useSettings();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', gps_location: '', address: '', notes: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setFormData({ fullName: '', phone: '', email: '', gps_location: '', address: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      fullName: customer.fullName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gps_location: customer.gps_location || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleOpenDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
    setOrdersLoading(true);
    
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setCustomerOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrdersLoading(false);
    }, (err) => {
      console.error(err);
      setOrdersLoading(false);
    });

    return unsub;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await updateDoc(doc(db, 'customers', selectedCustomer.id), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: Date.now()
        });
      }
      setShowModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if(!window.confirm(`هل أنت متأكد من رغبتك في حذف العميل ${name}؟ لا يمكن التراجع عن ذلك.`)) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'customers');
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.fullName && c.fullName.toLowerCase().includes(search.toLowerCase())) || 
    (c.phone && c.phone.includes(search))
  );

  // Financial Stats
  const totalOrdersCount = customerOrders.length;
  const totalAmount = customerOrders.reduce((acc, o) => acc + (parseFloat(o.totalPrice) || 0), 0);
  const totalPaid = customerOrders.reduce((acc, o) => acc + (parseFloat(o.paidAmount) || 0), 0);
  const totalRemaining = totalAmount - totalPaid;

  if (roleLoading) return <div className="p-8 text-center text-slate-500 font-bold">{settings.language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;

  if (!hasPermission('view_customers') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4"><X className="w-12 h-12 text-red-500" /></div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{settings.language === 'ar' ? 'هذه الصفحة مخصصة للمسؤولين عن إدارة العملاء.' : 'This page is restricted to customer management administrators.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-start transition-colors">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><User className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{t('customers')}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{settings.language === 'ar' ? 'قاعدة بيانات عملاء النظام' : 'System customer database'}</p>
          </div>
        </div>
        {hasPermission('manage_customers') && (
          <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm hover:bg-blue-700 transition transform active:scale-95 shadow-md shadow-blue-200 dark:shadow-none"
          >
            <Plus className="w-4 h-4" /> {settings.language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={settings.language === 'ar' ? 'بحث باسم العميل أو رقم الهاتف...' : 'Search by name or phone...'} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-11 pl-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري تحميل العملاء...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">العميل</th>
                  <th className="p-4 font-bold">الهاتف</th>
                  <th className="p-4 font-bold">العنوان</th>
                  <th className="p-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4" onClick={() => handleOpenDetails(customer)}>
                      <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {customer.fullName?.substring(0, 1) || 'U'}
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{customer.fullName || 'بدون اسم'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-mono" dir="ltr">{customer.phone}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">
                       <div className="text-xs">{customer.address || '-'}</div>
                       {customer.gps_location && <div className="text-[10px] text-blue-400 mt-0.5 truncate">{customer.gps_location}</div>}
                    </td>
                    <td className="p-4 text-left flex justify-end gap-2">
                      <button onClick={() => handleOpenDetails(customer)} title="عرض التفاصيل والتقارير" className="text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 transition-all p-2 rounded-lg">
                        <Receipt className="w-4 h-4" />
                      </button>
                      {hasPermission('manage_customers') && (
                        <>
                          <button onClick={() => handleOpenEdit(customer)} className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 transition-all p-2 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCustomer(customer.id, customer.fullName || 'العميل')} className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 transition-all p-2 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold">
                      لا يوجد عملاء مطابقين للبحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{selectedCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required placeholder="اسم العميل الرباعي" type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 pr-10 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الإيميل</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 pr-10 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono" dir="ltr" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">العنوان السكني</label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input placeholder="المدينة - الحي - الشارع" type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 pr-10 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الموقع الجغرافي (GPS)</label>
                <input placeholder="رابط Google Maps" type="text" value={formData.gps_location} onChange={e => setFormData({...formData, gps_location: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 rounded-xl transition">إلغاء</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details / Report Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-slate-50 rounded-2xl shadow-xl max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col">
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                    {selectedCustomer.fullName?.substring(0, 1)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 leading-none">{selectedCustomer.fullName}</h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono" dir="ltr">{selectedCustomer.phone}</p>
                  </div>
               </div>
               <button onClick={() => setShowDetailsModal(false)} className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition duration-200"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Financial Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">إجمالي الطلبات</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-800">{totalOrdersCount}</span>
                    <Package className="w-8 h-8 text-blue-100" />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">إجمالي المبالغ</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-slate-800">${totalAmount.toFixed(2)}</span>
                    <DollarSign className="w-8 h-8 text-amber-100" />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-r-4 border-r-emerald-500">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">المدفوع</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-emerald-600">${totalPaid.toFixed(2)}</span>
                    <Receipt className="w-8 h-8 text-emerald-100" />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-r-4 border-r-red-500">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">المتبقي (المديونية)</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-red-600">${totalRemaining.toFixed(2)}</span>
                    <AlertCircle className="w-8 h-8 text-red-100" />
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">سجل طلبات العميل</h4>
                    <span className="text-xs font-bold text-slate-400">آخر {customerOrders.length} طلبات</span>
                 </div>
                 {ordersLoading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">جاري تحميل السجل...</div>
                 ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                          <tr>
                            <th className="p-3">رقم التتبع</th>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">الحالة</th>
                            <th className="p-3">المبلغ الإجمالي</th>
                            <th className="p-3">المدفوع</th>
                            <th className="p-3 text-left">المتبقي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {customerOrders.map(order => {
                            const remaining = (parseFloat(order.totalPrice) || 0) - (parseFloat(order.paidAmount) || 0);
                            return (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono font-bold text-slate-700">{order.trackingNumber}</td>
                                <td className="p-3 text-slate-500 font-mono text-[10px]">{new Date(order.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                    {order.order_status || order.orderStatus || 'معلق'}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-800">${order.totalPrice}</td>
                                <td className="p-3 text-emerald-600 font-bold">${order.paidAmount || 0}</td>
                                <td className="p-3 text-left font-bold text-red-500">${remaining.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          {customerOrders.length === 0 && (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic font-bold">لا يوجد طلبات مسجلة لهذا العميل.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 )}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
               <div className="text-[10px] text-slate-400 pr-2">
                 تم الاستخراج في {new Date().toLocaleString('ar-YE')}
               </div>
               <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm active:scale-95">
                 <Receipt className="w-4 h-4" /> طباعة كشف مالي للعميل
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
