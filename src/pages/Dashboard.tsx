import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, limit, getDocs, onSnapshot, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, safeToDate } from '../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Package, Truck, CheckCircle2, AlertCircle, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const { role, hasPermission, profile, loading: roleLoading } = useRole();
  const { settings, t } = useSettings();
  const [stats, setStats] = useState({
    active: 0,
    inTransit: 0,
    local: 0,
    profit: 0,
    delivered: 0
  });

  useEffect(() => {
    if (roleLoading || !auth.currentUser || !role) return;
    
    let q;
    // Base query for latest orders
    q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));

    const unsub = onSnapshot(q, (snap) => {
      let allOrders = snap.docs.map(doc => {
        const data = doc.data() as any;
        return { id: doc.id, ...data, createdAt: safeToDate(data.createdAt) };
      });
      
      // Role based row-level filtering logic
      let visibleOrders = allOrders;
      if (role === 'Courier' && !hasPermission('view_orders')) {
         visibleOrders = allOrders.filter((o: any) => o.delivery_courier_id === auth.currentUser?.uid || o.shipping_courier_id === auth.currentUser?.uid);
      }
      
      setOrders(visibleOrders.slice(0, 5));

      // Compute stats
      let active = 0, inTransit = 0, local = 0, profit = 0, delivered = 0;
      const statsToCompute = hasPermission('view_finance') ? allOrders : visibleOrders;

      statsToCompute.forEach((o: any) => {
          const status = o.order_status || o.orderStatus;
          if (status === 'Shipped' || status === 'In Transit') inTransit++;
          if (status === 'In Local Warehouse') local++;
          if (status === 'Delivered') delivered++;
          if (status !== 'Delivered' && status !== 'Cancelled' && status !== 'Returned') active++;
          
          const commission = parseFloat(o.companyCommission) || 0;
          profit += commission;
      });
      
      setStats({ active, inTransit, local, profit, delivered });

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return unsub;
  }, [role, hasPermission, roleLoading]);

  const getStatusBadge = (status: string) => {
    const statuses: any = {
      'Shipped': { label: settings.language === 'ar' ? 'تم الشحن' : 'Shipped', class: 'bg-blue-100 text-blue-700' },
      'In Transit': { label: settings.language === 'ar' ? 'قيد الشحن' : 'In Transit', class: 'bg-blue-100 text-blue-700' },
      'Processing': { label: settings.language === 'ar' ? 'قيد التجهيز' : 'Processing', class: 'bg-amber-100 text-amber-700' },
      'In Local Warehouse': { label: settings.language === 'ar' ? 'وصل المخزن' : 'In Warehouse', class: 'bg-purple-100 text-purple-700' },
      'Delivered': { label: settings.language === 'ar' ? 'تم التسليم' : 'Delivered', class: 'bg-emerald-100 text-emerald-700' },
      'Out For Delivery': { label: settings.language === 'ar' ? 'خرج للتسليم' : 'Out for Delivery', class: 'bg-indigo-100 text-indigo-700' },
    };
    const s = statuses[status] || { label: status, class: 'bg-slate-100 text-slate-700' };
    return <span className={`${s.class} px-3 py-1 rounded-full text-xs font-bold`}>{s.label}</span>;
  };

  if (roleLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">{settings.language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex justify-between items-start">
             <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2.5 rounded-2xl"><Package className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-4 mb-1 uppercase tracking-wider">{t('activeOrders')}</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{stats.active}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex justify-between items-start">
             <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2.5 rounded-2xl"><Truck className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-4 mb-1 uppercase tracking-wider">{t('inTransit')}</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{stats.inTransit}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex justify-between items-start">
             <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2.5 rounded-2xl"><AlertCircle className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-4 mb-1 uppercase tracking-wider">{t('localWait')}</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{stats.local}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-r-4 border-r-emerald-500 flex flex-col justify-between transition-colors">
          <div className="flex justify-between items-start">
             <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-2xl"><CheckCircle2 className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-4 mb-1 uppercase tracking-wider">{t('delivered')}</p>
          <div className="flex items-end justify-between">
            <div className="flex gap-2 items-baseline">
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{stats.delivered}</h3>
              {hasPermission('view_finance') && (
                <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="no-underline" dir="ltr">{settings.currencySymbol}{stats.profit.toFixed(2)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Split */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[440px]">
        {/* Orders Table */}
        <div className="flex-[2] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              {role === 'Courier' ? (settings.language === 'ar' ? 'شحناتي الأخيرة الموكلة إليّ' : 'Recent Assigned Shipments') : (settings.language === 'ar' ? 'آخر الطلبات الواردة بالنظام' : 'Recent System Orders')}
            </h4>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-4 font-black">{t('trackingNumber')}</th>
                  <th className="p-4 font-black">{t('orderStatus')}</th>
                  <th className="p-4 font-black">{t('paymentStatus')}</th>
                  <th className="p-4 font-black">{t('date')}</th>
                  <th className="p-4 font-black">{t('total')}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{order.trackingNumber}</td>
                    <td className="p-4">{getStatusBadge(order.orderStatus || order.order_status)}</td>
                    <td className="p-4">
                      {order.paymentStatus === 'Paid' ? (
                         <span className="text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-xl text-[10px] border border-emerald-100 dark:border-emerald-800">{t('paid')} ({order.amountPaid} {settings.currencySymbol})</span>
                      ) : order.paymentStatus === 'COD' || order.paymentStatus === 'Partial Paid' ? (
                         <span className="text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-xl text-[10px] border border-amber-100 dark:border-amber-800">{t('cod')} ({order.totalCost - (order.amountPaid || 0)} {settings.currencySymbol})</span>
                      ) : (
                         <span className="text-red-500 dark:text-red-400 font-black bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-xl text-[10px] border border-red-100 dark:border-red-800">{t('unpaid')} ({order.totalCost} {settings.currencySymbol})</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">
                       {order.createdAt ? format(order.createdAt, 'dd MMM yyyy', { locale: settings.language === 'ar' ? ar : undefined }) : '...'}
                    </td>
                    <td className="p-4 font-black text-slate-800 dark:text-slate-200">{settings.currencySymbol}{order.totalCost?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                   <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-600 font-bold">{settings.language === 'ar' ? 'لا يوجد طلبات حالية مسجلة' : 'No current orders registered'}</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tracking Highlight Card */}
        {orders[0] && (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col transition-colors">
            <h4 className="font-black text-slate-800 dark:text-white mb-6">{settings.language === 'ar' ? 'موجز الشحنة الأحدث' : 'Latest Shipment Brief'}</h4>
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800 shadow-inner">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">{settings.language === 'ar' ? 'تتبع رقم المسار:' : 'Tracking ID:'}</p>
              <p className="font-mono font-black text-2xl text-slate-800 dark:text-blue-400">{orders[0].trackingNumber}</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
               <div className="relative">
                 <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse"></div>
                 <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center relative z-10 border border-blue-100 dark:border-blue-800 shadow-xl shadow-blue-900/10">
                   <Package className="w-10 h-10" />
                 </div>
               </div>
               <div className="space-y-2">
                 <p className="font-black text-slate-800 dark:text-white text-xl">{settings.language === 'ar' ? 'الحالة:' : 'Status:'} {getStatusBadge(orders[0].order_status || orders[0].orderStatus)}</p>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-bold max-w-[240px] leading-relaxed italic">{settings.language === 'ar' ? 'يتم تحديث الحالة تلقائياً فور تحريك الشحنة من قبل المندوب الموكل' : 'Status updates automatically when moved by the courier'}</p>
               </div>
               <Link to="/orders" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-center">
                 {settings.language === 'ar' ? 'عرض كافة التفاصيل' : 'View All Details'}
               </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
