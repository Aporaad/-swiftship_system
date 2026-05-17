import { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, onSnapshot, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Package, Truck, CheckCircle2, AlertCircle, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { useRole } from '../hooks/useRole';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const { role, hasPermission, profile, loading: roleLoading } = useRole();
  const [stats, setStats] = useState({
    active: 0,
    inTransit: 0,
    local: 0,
    profit: 0,
    delivered: 0
  });

  useEffect(() => {
    if (roleLoading || !auth.currentUser) return;
    
    let q;
    // Base query for latest orders
    q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));

    const unsub = onSnapshot(q, (snap) => {
      let allOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Role based row-level filtering logic
      let visibleOrders = allOrders;
      if (role === 'Courier' && !hasPermission('view_orders')) {
         visibleOrders = allOrders.filter((o: any) => o.delivery_courier_id === auth.currentUser?.uid || o.shipping_courier_id === auth.currentUser?.uid);
      }
      
      setOrders(visibleOrders);

      // Compute stats - Admins and those with view_finance see global stats, others see their filtered stats
      let active = 0, inTransit = 0, local = 0, profit = 0, delivered = 0;
      
      // For global stats if hasPermission('view_finance'), otherwise use visibleOrders
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
    switch(status) {
      case 'Shipped':
      case 'In Transit':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">تم الشحن</span>;
      case 'Processing':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs">قيد التجهيز</span>;
      case 'In Local Warehouse':
        return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">وصل المخزن</span>;
      case 'Delivered':
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs">تم التسليم</span>;
      case 'Out For Delivery':
        return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">خرج للتسليم</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  if (roleLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="bg-blue-50 text-blue-600 p-2 rounded-xl"><Package className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 text-sm mt-3 mb-1">الطلبات النشطة الموكلة</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">{stats.active}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="bg-amber-50 text-amber-600 p-2 rounded-xl"><Truck className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 text-sm mt-3 mb-1">شحنات قيد النقل / الشحن</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">{stats.inTransit}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="bg-purple-50 text-purple-600 p-2 rounded-xl"><AlertCircle className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 text-sm mt-3 mb-1">شحنات بانتظار التسليم للتوزيع</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">{stats.local}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-r-4 border-r-emerald-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl"><CheckCircle2 className="w-5 h-5"/></div>
          </div>
          <p className="text-slate-500 text-sm mt-3 mb-1">شحنات مسلّمة / الربح المتوقع</p>
          <div className="flex items-end justify-between">
            <div className="flex gap-2 items-baseline">
              <h3 className="text-2xl font-bold text-emerald-700">{stats.delivered}</h3>
              {hasPermission('view_finance') && (
                <span className="text-sm font-bold text-slate-500">
                  <span className="text-emerald-600 no-underline" dir="ltr">${stats.profit.toFixed(2)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Split */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[440px]">
        {/* Orders Table */}
        <div className="flex-[2] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-800">
              {role === 'Courier' ? 'شحناتي الأخيرة الموكلة إليّ' : 'آخر الطلبات (النظام)'}
            </h4>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-medium">رقم التتبع</th>
                  <th className="p-4 font-medium">حالة الطلب</th>
                  <th className="p-4 font-medium">حالة الدفع</th>
                  <th className="p-4 font-medium">تاريخ الطلب</th>
                  <th className="p-4 font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="p-4 font-mono text-slate-700">{order.trackingNumber}</td>
                    <td className="p-4">{getStatusBadge(order.orderStatus)}</td>
                    <td className="p-4">
                      {order.paymentStatus === 'Paid' ? (
                         <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">مدفوع ({order.amountPaid} $)</span>
                      ) : order.paymentStatus === 'COD' || order.paymentStatus === 'Partial Paid' ? (
                         <span className="text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full text-xs">يوجد مستحقات ({order.totalCost - (order.amountPaid || 0)} $)</span>
                      ) : (
                         <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full text-xs">غير مدفوع ({order.totalCost} $)</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                       {format(order.createdAt, 'dd MMM yyyy', { locale: ar })}
                    </td>
                    <td className="p-4 font-bold">${order.totalCost?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                   <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد طلبات حالية</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tracking Highlight Card - Can be mapped to the first active order */}
        {orders[0] && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h4 className="font-bold text-slate-800 mb-4">أحدث شحنة</h4>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">تتبع رقم:</p>
              <p className="font-mono font-bold text-lg">{orders[0].trackingNumber}</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                 <Package className="w-8 h-8" />
               </div>
               <p className="font-bold text-slate-800 text-lg">{getStatusBadge(orders[0].orderStatus)}</p>
               <p className="text-slate-500 text-sm max-w-[200px]">قم بالانتقال لصفحة الطلبات لتحديث حالة التتبع وإضافة الملاحظات</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
