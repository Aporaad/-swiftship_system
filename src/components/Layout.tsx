import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LayoutDashboard, Package, Users, Truck, LogOut, MapPin, Bell, Search, Settings } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'إدارة الطلبات', path: '/orders', icon: Package },
    { name: 'إدارة العملاء', path: '/customers', icon: Users },
    { name: 'مصادر الطلبات', path: '/sources', icon: MapPin },
    { name: 'المندوبين والموظفين', path: '/users', icon: Truck },
    { name: 'نظام التتبع', path: '/tracking', icon: MapPin },
    { name: 'إعدادات النظام', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex bg-slate-50 text-slate-900 overflow-hidden h-full">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-col shrink-0 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">L</div>
          <span className="text-xl font-bold tracking-tight">لوجي-تراك</span>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-xs font-bold uppercase">
                {auth.currentUser?.email?.substring(0, 2) || 'AD'}
              </div>
              <div className="text-xs truncate">
                <p className="font-bold truncate">{auth.currentUser?.displayName || 'المستخدم'}</p>
                <p className="text-slate-400 truncate">{auth.currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center bg-slate-100 px-4 py-2 rounded-full md:w-96 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input type="text" placeholder="بحث برقم التتبع أو اسم العميل..." className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="p-2 rounded-full hover:bg-slate-100 relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </Link>
            <Link to="/orders" className="hidden md:flex bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold items-center gap-2 hover:bg-blue-700 transition">
              <span>+</span> إضافة طلب جديد
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
