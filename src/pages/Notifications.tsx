import React, { useState, useEffect } from 'react';
import { Bell, Package, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, auth, safeToDate } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRole } from '../hooks/useRole';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { loading: roleLoading } = useRole();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading) return;
    // Only fetch for current user or global. Since we use 'global' currently, we'll fetch all.
    // In a prod app, you might use where('userId', 'in', [auth.currentUser?.uid, 'global'])
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => {
        const data = d.data() as any;
        return { id: d.id, ...data, createdAt: safeToDate(data.createdAt) };
      }));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  }, [roleLoading]);

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'notifications', id), { read: true });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'order': return <Package className="w-5 h-5 text-blue-500" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          الإشعارات
        </h1>
        <button 
          onClick={markAllAsRead}
          className="text-slate-600 hover:text-blue-600 font-bold text-sm bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg transition"
        >
          تحديد الكل كمقروء
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">جاري تحميل الإشعارات...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد إشعارات جديدة.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-slate-50 transition flex gap-4 cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                onClick={() => markAsRead(notification.id, notification.read)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.read ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100'}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm ${!notification.read ? 'font-black text-slate-800' : 'font-bold text-slate-700'}`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {notification.createdAt ? formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ar }) : ''}
                    </div>
                  </div>
                  <p className={`text-sm ${!notification.read ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
