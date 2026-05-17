import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Search, Edit2 } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), formData);
      setShowModal(false);
      setFormData({ fullName: '', phone: '', email: '', gps_location: '', address: '', notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.fullName && c.fullName.toLowerCase().includes(search.toLowerCase())) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">إدارة العملاء</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition"
        >
          <span>+</span> إضافة عميل
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-slate-800">قائمة العملاء</h4>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الرقم..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري تحميل العملاء...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-medium">الاسم</th>
                  <th className="p-4 font-medium">الهاتف</th>
                  <th className="p-4 font-medium">الإيميل</th>
                  <th className="p-4 font-medium">العنوان وموقع GPS</th>
                  <th className="p-4 font-medium text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="p-4 font-bold text-slate-800">{customer.fullName || 'أضيف بدون اسم'}</td>
                    <td className="p-4 text-slate-600 font-mono" dir="ltr">{customer.phone}</td>
                    <td className="p-4 text-slate-600">{customer.email || '-'}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">
                       <div>{customer.address || '-'}</div>
                       <div className="text-xs text-blue-500 mt-1">{customer.gps_location}</div>
                    </td>
                    <td className="p-4 text-left">
                      <button className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg">
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      لا يوجد عملاء.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-slate-800">إضافة عميل جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل (اختياري)</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الإيميل</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">العنوان</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الموقع الجغرافي (GPS URL أو إحداثيات)</label>
                <input type="text" value={formData.gps_location} onChange={e => setFormData({...formData, gps_location: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 rounded-xl transition">إلغاء</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">حفظ العميل</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
