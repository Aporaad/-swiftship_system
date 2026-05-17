import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Save, Globe, Palette, Database, DollarSign, Building, X, Upload, CheckCircle } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { role, hasPermission, loading: roleLoading } = useRole();
  const { settings: globalSettings, updateSettings, t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localSettings, setLocalSettings] = useState(globalSettings);

  useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);

  if (roleLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">{globalSettings.language === 'ar' ? 'جاري التحقق من الصلاحيات...' : 'Checking permissions...'}</div>;
  }

  if (!hasPermission('settings') && role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('accessDenied')}</h2>
        <p className="text-slate-500">{globalSettings.language === 'ar' ? 'إعدادات النظام مخصصة للمديرين فقط.' : 'System settings are restricted to administrators only.'}</p>
      </div>
    );
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(localSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      // Collections to backup
      const collections = ['customers', 'couriers', 'sources', 'orders', 'users', 'roles'];
      const backupData: any = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        settings: localSettings,
        data: {}
      };

      for (const colName of collections) {
        try {
          const snap = await getDocs(collection(db, colName));
          backupData.data[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
          console.error(`Error backing up ${colName}:`, err);
        }
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LogiTrack_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      updateSettings({ lastBackup: new Date().toLocaleString(globalSettings.language === 'ar' ? 'ar-YE' : 'en-US') } as any);
      alert(globalSettings.language === 'ar' ? "تم تصدير النسخة الاحتياطية الكاملة بنجاح!" : "Full backup exported successfully!");
    } catch (error) {
      console.error('Backup failed:', error);
      alert(globalSettings.language === 'ar' ? "فشل تصدير النسخة الاحتياطية" : "Backup export failed");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportLoading(true);
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.settings && !data.data) {
          throw new Error(globalSettings.language === 'ar' ? "ملف النسخة الاحتياطية غير صالح أو تالف." : "Invalid backup file.");
        }

        if (!confirm(globalSettings.language === 'ar' ? "سيتم استبدال الإعدادات الحالية ودمج البيانات. هل أنت متأكد؟" : "This will overwrite settings and merge data. Are you sure?")) {
          return;
        }

        // Apply settings if present
        if (data.settings) {
          await updateSettings(data.settings);
        }

        // Apply collection data if present
        if (data.data) {
          for (const colName in data.data) {
            const items = data.data[colName];
            if (Array.isArray(items)) {
              const batch = writeBatch(db);
              for (const item of items) {
                const { id, ...itemData } = item;
                if (id) {
                  batch.set(doc(db, colName, id), itemData);
                }
              }
              await batch.commit();
            }
          }
        }

        alert(globalSettings.language === 'ar' ? "تم استيراد البيانات والإعدادات بنجاح!" : "Data and settings imported successfully!");
        window.location.reload(); 
      } catch (err) {
        console.error('Import error:', err);
        alert((globalSettings.language === 'ar' ? "خطأ في استيراد النسخة الاحتياطية: " : "Error importing backup: ") + (err as Error).message);
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".json" 
        className="hidden" 
      />

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4 z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">{t('settings')}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{globalSettings.language === 'ar' ? 'تخصيص كامل للنظام والشركة' : 'System & Company Customization'}</p>
          </div>
        </div>
        <button 
          onClick={() => handleSave()} 
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm hover:bg-blue-700 transition disabled:bg-blue-300 dark:disabled:bg-slate-700 shadow-md transform active:scale-95"
        >
          <Save className="w-4 h-4"/>
          {loading ? (globalSettings.language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('saveChanges')}
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">✓</div>
          <span>{globalSettings.language === 'ar' ? 'تم حفظ جميع الإعدادات وتطبيق التغييرات على النظام بنجاح!' : 'All settings saved successfully!'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 dark:bg-purple-900/10 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 relative z-10">
              <Building className="w-5 h-5 text-purple-500" />
              {t('companyIdentity')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'اسم الشركة التجاري' : 'Company Name'}</label>
                <input 
                  type="text" 
                  value={localSettings.companyName}
                  onChange={(e) => setLocalSettings({...localSettings, companyName: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900"
                  placeholder={globalSettings.language === 'ar' ? "مثال: لوجي-تراك العربية" : "e.g. LogiTrack Global"}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input 
                  type="text" 
                  value={localSettings.companyPhone}
                  onChange={(e) => setLocalSettings({...localSettings, companyPhone: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input 
                  type="email" 
                  value={localSettings.companyEmail}
                  onChange={(e) => setLocalSettings({...localSettings, companyEmail: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</label>
                <input 
                  type="text" 
                  value={localSettings.companyWebsite}
                  onChange={(e) => setLocalSettings({...localSettings, companyWebsite: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'الرقم الضريبي (إن وجد)' : 'Tax ID (if any)'}</label>
                <input 
                  type="text" 
                  value={localSettings.taxId}
                  onChange={(e) => setLocalSettings({...localSettings, taxId: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" dir="ltr"
                  placeholder="3000XXXXXXXX00003"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'العنوان التفصيلي' : 'Address'}</label>
                <textarea 
                  rows={2}
                  value={localSettings.companyAddress}
                  onChange={(e) => setLocalSettings({...localSettings, companyAddress: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-slate-800 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900"
                  placeholder={globalSettings.language === 'ar' ? "المدينة، الحي، الشارع، المبنى..." : "City, District, Street..."}
                />
              </div>
            </div>
          </section>

          {/* Finance */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              {t('financeSettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'العملة الرئيسية' : 'Primary Currency'}</label>
                <select 
                  value={localSettings.currency} 
                  onChange={(e) => setLocalSettings({...localSettings, currency: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="SAR">{globalSettings.language === 'ar' ? 'ريال سعودي' : 'SAR'}</option>
                  <option value="USD">{globalSettings.language === 'ar' ? 'دولار أمريكي' : 'USD'}</option>
                  <option value="AED">{globalSettings.language === 'ar' ? 'درهم إماراتي' : 'AED'}</option>
                  <option value="EGP">{globalSettings.language === 'ar' ? 'جنيه مصري' : 'EGP'}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'رمز العملة' : 'Currency Symbol'}</label>
                <input 
                  type="text" 
                  value={localSettings.currencySymbol}
                  onChange={(e) => setLocalSettings({...localSettings, currencySymbol: e.target.value})}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-center text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="md:col-span-2 flex items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl"><DollarSign className="w-5 h-5"/></div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{globalSettings.language === 'ar' ? 'تفعيل الإشعارات المالية التلقائية' : 'Enable Finance Notifications'}</h4>
                  <p className="text-[10px] text-slate-400">{globalSettings.language === 'ar' ? 'إرسال إشعار للعميل عند استلام دفع أو تصفير حساب' : 'Notify customer on payment receipts'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={localSettings.autoNotification} onChange={(e) => setLocalSettings({...localSettings, autoNotification: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Interface */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-500" />
              {t('interfaceLanguage')}
            </h2>
            <div className="space-y-5 text-center">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{globalSettings.language === 'ar' ? 'اللغة الإفتراضية' : 'Default Language'}</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setLocalSettings({...localSettings, language: 'ar'})}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${localSettings.language === 'ar' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >العربية</button>
                  <button 
                    type="button"
                    onClick={() => setLocalSettings({...localSettings, language: 'en'})}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${localSettings.language === 'en' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >ENGLISH</button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{t('theme')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setLocalSettings({...localSettings, theme: 'light'})}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${localSettings.theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white shadow-sm border border-slate-200"></div>
                    <span className="text-[10px] font-black">{globalSettings.language === 'ar' ? 'فاتح' : 'Light'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLocalSettings({...localSettings, theme: 'dark'})}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${localSettings.theme === 'dark' ? 'border-blue-600 bg-slate-800 text-white' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700"></div>
                    <span className="text-[10px] font-black">{globalSettings.language === 'ar' ? 'داكن' : 'Dark'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Backup & Tools */}
          <section className="bg-slate-900 dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none text-white relative overflow-hidden transition-colors border border-slate-800">
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
            <h2 className="text-lg font-black mb-6 flex items-center gap-2 relative z-10 text-slate-200">
              <Database className="w-5 h-5 text-blue-400" />
              {t('backupTools')}
            </h2>
            <div className="space-y-6 relative z-10">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                <h3 className="font-bold text-sm mb-1">{globalSettings.language === 'ar' ? 'البيانات والنسخ' : 'Data & Backup'}</h3>
                <p className="text-[10px] text-slate-400 mb-4 font-bold italic line-clamp-1">{globalSettings.language === 'ar' ? 'إسترجاع، تصدير، وتأمين البيانات' : 'Restore, export, secure'}</p>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    type="button"
                    onClick={handleBackup}
                    disabled={backupLoading}
                    className="w-full bg-blue-500 text-white py-2.5 rounded-xl font-black text-xs hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:text-slate-500 group"
                  >
                    {backupLoading ? (globalSettings.language === 'ar' ? 'جاري التصدير...' : 'Exporting...') : (
                      <>{t('exportBackup')} <Save className="w-3 h-3 group-hover:animate-bounce" /></>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={handleImportClick}
                    disabled={importLoading}
                    className="w-full bg-white/10 text-white py-2.5 rounded-xl font-black text-xs hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    <Upload className="w-3 h-3" />
                    {importLoading ? (globalSettings.language === 'ar' ? 'جاري الاستيراد...' : 'Importing...') : t('importBackup')}
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <h3 className="text-red-400 font-black text-[10px] mb-2 uppercase tracking-widest text-center">{globalSettings.language === 'ar' ? 'أوامر متقدمة' : 'Advanced Commands'}</h3>
                <button 
                  type="button"
                  onClick={() => {
                    if(confirm(globalSettings.language === 'ar' ? 'هل أنت متأكد؟ سيتم حذف جميع بيانات الكاش المحلية (لن يؤثر على البيانات في السيرفر)' : 'Are you sure? System cache will be cleared.')) {
                       localStorage.clear();
                       window.location.reload();
                    }
                  }}
                  className="w-full bg-red-500/20 text-red-500 py-2 rounded-xl font-black text-[10px] hover:bg-red-500 hover:text-white transition-all border border-red-500/30"
                >
                  {globalSettings.language === 'ar' ? 'مسح ملفات النظام المؤقتة' : 'Clear System Cache'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
