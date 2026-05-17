import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, Edit2, X, Plus, Trash2, MapPin } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

export default function Sources() {
  const { role, hasPermission, loading: roleLoading } = useRole();
  const { settings, t } = useSettings();
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [formData, setFormData] = useState({
    source_name: '',
    source_url: '',
    notes: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sources'), (snap) => {
      setSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sources');
    });
    return unsub;
  }, []);

  const handleOpenEdit = (source: any) => {
    setSelectedSource(source);
    setFormData({
      source_name: source.source_name || '',
      source_url: source.source_url || '',
      notes: source.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedSource(null);
    setFormData({ source_name: '', source_url: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSource) {
        await updateDoc(doc(db, 'sources', selectedSource.id), formData);
      } else {
        await addDoc(collection(db, 'sources'), {
          ...formData,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      setSelectedSource(null);
    } catch (err) {
      handleFirestoreError(err, selectedSource ? OperationType.UPDATE : OperationType.CREATE, 'sources');
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, 'sources', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'sources');
    }
  };

  const filteredSources = sources.filter(o => 
    o.source_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (roleLoading) return <div className="p-8 text-center text-slate-500 font-bold">{settings.language === 'ar' ? 'جاري التحقق من الصلاحيات...' : 'Checking permissions...'}</div>;

  if (!hasPermission('manage_sources') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{settings.language === 'ar' ? 'إدارة المصادر مخصصة للمسؤولين فقط.' : 'Order source management is restricted to administrators only.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-start transition-colors">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><MapPin className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{t('sources')}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{settings.language === 'ar' ? 'مصادر طلبات الشحن المسجلة' : 'Registered shipment order sources'}</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm hover:bg-blue-700 transition transform active:scale-95 shadow-md"
        >
          <Plus className="w-4 h-4" /> {settings.language === 'ar' ? 'إضافة مصدر' : 'Add Source'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={settings.language === 'ar' ? 'بحث عن مصدر...' : 'Search for a source...'} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-11 pl-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider relative z-10 sticky top-0">
                <tr>
                  <th className="p-4 font-bold">اسم المصدر</th>
                  <th className="p-4 font-bold">الرابط</th>
                  <th className="p-4 font-bold">ملاحظات</th>
                  <th className="p-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 flex-1">
                {filteredSources.map(source => (
                  <tr key={source.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{source.source_name || 'بدون اسم'}</td>
                    <td className="p-4 text-slate-600 font-medium" dir="ltr">
                      {source.source_url ? <a href={source.source_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{source.source_url}</a> : '-'}
                    </td>
                    <td className="p-4 text-slate-600">{source.notes || '-'}</td>
                    <td className="p-4 text-left gap-2 flex justify-end">
                      <button onClick={() => handleOpenEdit(source)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors p-2 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(source.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 transition-colors p-2 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSources.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                      لا توجد مصادر مطابقة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">{selectedSource ? 'تعديل المصدر' : 'إ إضافة مصدر جديد'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المصدر</label>
                <input 
                  type="text" 
                  value={formData.source_name}
                  onChange={(e) => setFormData({...formData, source_name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الرابط (اختياري)</label>
                <input 
                  type="url" 
                  value={formData.source_url}
                  onChange={(e) => setFormData({...formData, source_url: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  rows={3}
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-200 transition-all"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
