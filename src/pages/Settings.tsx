import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Save, Globe, Palette, Database, DollarSign, Building, X } from 'lucide-react';
import { useRole } from '../hooks/useRole';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { role, hasPermission, loading: roleLoading } = useRole();

  const [settings, setSettings] = useState({
    language: 'ar',
    theme: 'light',
    currency: 'USD',
    companyName: 'لوجي-تراك',
    companyAddress: 'الرياض، المملكة العربية السعودية',
    companyPhone: '+966 50 000 0000',
    companyEmail: 'info@logi-track.com',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings');
      }
    };
    fetchSettings();
  }, []);

  if (roleLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري التحقق من الصلاحيات...</div>;
  }

  if (!hasPermission('settings') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">عذراً، لا تملك الصلاحية</h2>
        <p className="text-slate-500">إعدادات النظام مخصصة للمديرين فقط.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    setBackupLoading(true);
    // Simulate server communication
    setTimeout(() => {
      setBackupLoading(false);
      alert("سيتم إرسال طلب النسخ الاحتياطي إلى الخادم. (ميزة تجريبية)");
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          إعدادات النظام
        </h1>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition disabled:bg-blue-400"
        >
          <Save className="w-4 h-4"/>
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 font-bold">
          تم حفظ الإعدادات بنجاح!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Localization & Theme */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe className="w-5 h-5 text-blue-500" />
            اللغة والمظهر
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">لغة النظام الأساسية</label>
              <select 
                value={settings.language} 
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="ar">العربية (Arabic)</option>
                <option value="en">الإنجليزية (English)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">المظهر (الثيم)</label>
              <select 
                value={settings.theme} 
                onChange={(e) => setSettings({...settings, theme: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="light">فاتح (Light)</option>
                <option value="dark">داكن (Dark)</option>
                <option value="system">مزامنة مع النظام (System)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Currency & Finance */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            العملات والمالية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">العملة الافتراضية</label>
              <select 
                value={settings.currency} 
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="TRY">ليرة تركية (TRY)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-purple-500" />
            معلومات الشركة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">اسم الشركة الأساسي</label>
              <input 
                type="text" 
                value={settings.companyName}
                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف الافتراضي</label>
              <input 
                type="text" 
                value={settings.companyPhone}
                onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني الأساسي</label>
              <input 
                type="email" 
                value={settings.companyEmail}
                onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
              <textarea 
                rows={2}
                value={settings.companyAddress}
                onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Backup */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-5 h-5 text-slate-600" />
            النسخ الاحتياطي (Backup)
          </h2>
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800">نسخ احتياطي للبيانات</h3>
              <p className="text-sm text-slate-500 mt-1">قم بتصدير جميع بيانات العملاء، الطلبات، والمستخدمين.</p>
            </div>
            <button 
              type="button"
              onClick={handleBackup}
              disabled={backupLoading}
              className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-900 transition disabled:bg-slate-400"
            >
              {backupLoading ? 'جاري التحضير...' : 'طلب نسخة احتياطية'}
            </button>
          </div>
        </section>
        
      </form>
    </div>
  );
}
