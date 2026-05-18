import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LayoutDashboard, Package, Users, Truck, LogOut, MapPin, Bell, Search, Settings, ShieldCheck, Languages, Moon, Sun, RotateCw } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, hasPermission, loading: roleLoading } = useRole();
  const { settings, updateSettings, t } = useSettings();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser || roleLoading || !role) return;
    
    // In this app, notifications are global or user-specific. 
    // For simplicity, we count unread notifications.
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = settings.language === 'ar' ? 'en' : 'ar';
    updateSettings({ language: newLang });
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: newTheme });
  };

  const navItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, permission: 'view_dashboard' },
    { name: t('orders'), path: '/orders', icon: Package, permission: 'view_orders' },
    { name: t('customers'), path: '/customers', icon: Users, permission: 'view_customers' },
    { name: t('couriers'), path: '/couriers', icon: Truck, permission: 'manage_couriers' },
    { name: t('users'), path: '/users', icon: Users, permission: 'manage_users' },
    { name: t('roles'), path: '/roles', icon: ShieldCheck, permission: 'manage_users' },
    { name: t('sources'), path: '/sources', icon: MapPin, permission: 'manage_sources' },
    { name: t('trackingSystem'), path: '/tracking', icon: MapPin, permission: 'view_orders' },
    { name: t('settings'), path: '/settings', icon: Settings, permission: 'settings' },
  ];

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  if (roleLoading) {
    return (
      <div className="flex bg-slate-900 text-white h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!role && !roleLoading) {
    return (
      <div className="flex bg-slate-900 text-white h-screen flex-col items-center justify-center p-8 text-center">
        <ShieldCheck className="w-16 h-16 text-slate-700 mb-6" />
        <h1 className="text-2xl font-black mb-4">{settings.language === 'ar' ? 'غير مصرح' : 'Unauthorized'}</h1>
        <p className="text-slate-400 max-w-md mb-8">
          {settings.language === 'ar' 
            ? 'هذا الحساب غير مسجل في النظام حالياً. يرجى التواصل مع المدير لتفعيل حسابك.' 
            : 'This account is not currently registered in the system. Please contact the administrator to activate your account.'}
        </p>
        <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold transition-all">
          {t('logout')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden h-full font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-900 text-white flex-col shrink-0 hidden md:flex border-l border-slate-800">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">L</div>
          <span className="text-xl font-black tracking-tight">{settings.companyName}</span>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 dark:bg-slate-800/20 rounded-2xl p-4 flex items-center justify-between gap-3 border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 shrink-0 flex items-center justify-center text-xs font-black uppercase text-blue-400">
                {profile?.fullName?.substring(0, 2) || auth.currentUser?.email?.substring(0, 2) || 'AD'}
              </div>
              <div className="text-xs truncate">
                <p className="font-black truncate text-slate-200">{profile?.fullName || (settings.language === 'ar' ? 'المستخدم' : 'User')}</p>
                <p className="text-slate-500 truncate text-[10px] font-bold">{role === 'Admin' ? t('admin') : role || '...'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 transition-colors">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl md:w-96 border border-slate-200 dark:border-slate-700">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input type="text" placeholder={t('searchPlaceholder')} className="bg-transparent border-none outline-none text-sm w-full dark:placeholder-slate-500" />
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 group"
              title={settings.language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            >
              <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            </button>

            {/* Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              title={settings.theme === 'light' ? (settings.language === 'ar' ? 'الوضع الداكن' : 'Dark Mode') : (settings.language === 'ar' ? 'الوضع الفاتح' : 'Light Mode')}
            >
              {settings.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>
            
            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
            >
              <div className="w-5 h-5 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black">
                {settings.language === 'ar' ? 'EN' : 'AR'}
              </div>
              <span className="hidden lg:inline">
                {settings.language === 'ar' ? 'English' : 'العربية'}
              </span>
            </button>

            {/* Notifications */}
            <Link to="/notifications" title={t('notifications')} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-all active:scale-95">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-lg shadow-red-200 dark:shadow-none animate-bounce-subtle">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Button */}
            <button className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 pl-3 pr-2 py-1.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all shadow-sm group active:scale-95">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs text-slate-800 dark:text-slate-200 leading-none mb-0.5 font-black">{profile?.fullName?.split(' ')[0] || t('user')}</span>
                <span className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-tighter">{role === 'Admin' ? t('admin') : role || '...'}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {profile?.fullName?.substring(0, 1) || 'U'}
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </div>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: settings.theme === 'dark' ? '#1e293b' : '#ffffff',
              color: settings.theme === 'dark' ? '#f1f5f9' : '#1e293b',
              borderRadius: '16px',
              border: settings.theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif'
            }
          }}
        />
      </main>
    </div>
  );
}
