import React, { useState } from 'react';
import { Package, Search, Clock, CheckCircle2, Truck, PackageCheck, AlertCircle, ArrowRight, Home } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';

export default function Tracking() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<any>(null);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      const trackingRef = doc(db, 'public_tracking', trackingNumber.trim());
      const trackingSnap = await getDoc(trackingRef);

      if (trackingSnap.exists()) {
        setTrackingData(trackingSnap.data());
      } else {
        setError('لم يتم العثور على رقم التتبع. يرجى التحقق والمحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء جلب معلومات التتبع.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Ordered':
      case 'Processing':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'Shipped':
      case 'In Transit':
        return <Truck className="w-6 h-6 text-blue-500" />;
      case 'In Local Warehouse':
      case 'Out For Delivery':
        return <Package className="w-6 h-6 text-indigo-500" />;
      case 'Delivered':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'Returned':
      case 'Cancelled':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <PackageCheck className="w-6 h-6 text-slate-500" />;
    }
  };

  const statusTranslations: Record<string, string> = {
    'Pending': 'قيد الانتظار',
    'Ordered': 'تم الطلب',
    'Processing': 'قيد التجهيز',
    'Shipped': 'تم الشحن',
    'In Transit': 'بالشحن الدولي',
    'In Local Warehouse': 'وصل المخزن',
    'Out For Delivery': 'خرج للتسليم',
    'Delivered': 'تم التسليم',
    'Returned': 'مرتجع',
    'Cancelled': 'ملغي',
  };

  const getTranslatedStatus = (status: string) => {
    return statusTranslations[status] || status;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <Package className="w-6 h-6" />
            <span>نظام الشحن برو</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              رجوع
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              <Home className="w-4 h-4" />
              الرئيسية
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">تتبع الشحنة</h1>
          <p className="mt-3 text-slate-500">أدخل رقم التتبع الخاص بك أدناه لمعرفة أحدث مستجدات شحنتك.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="مثال: SHN-192-33"
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-left"
                  dir="ltr"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !trackingNumber.trim()}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shrink-0"
              >
                {loading ? 'جاري البحث...' : 'تتبع الآن'}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center mb-8 border border-red-100">
            <AlertCircle className="w-5 h-5 ml-3 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {trackingData && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">تفاصيل الشحنة</h4>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-slate-500 font-mono">{trackingNumber.toUpperCase()}</p>
                  <span className="text-slate-300">•</span>
                  <p className="text-sm text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                    {trackingData.itemCount || 1} منتج
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                {getStatusIcon(trackingData.status)}
                <span className="font-bold text-slate-800">{getTranslatedStatus(trackingData.status)}</span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-0 relative">
                {[...(trackingData.history || [])].reverse().map((update: any, index: number, arr: any[]) => (
                  <div key={index} className="relative flex gap-6 pb-8 last:pb-0">
                    {/* Line connection */}
                    {index !== arr.length - 1 && (
                      <div className="absolute right-[23px] top-10 bottom-0 w-0.5 bg-slate-200"></div>
                    )}
                    
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 border-4 border-white ${index === 0 ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                        {getStatusIcon(update.status)}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex-1">
                      <h3 className={`text-base font-bold ${index === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                        {getTranslatedStatus(update.status)}
                      </h3>
                      {update.location && (
                        <p className="text-sm text-slate-500 mt-1">{update.location}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {format(update.timestamp, 'dd MMM yyyy - hh:mm a', { locale: ar })}
                      </p>
                    </div>
                  </div>
                ))}

                {(!trackingData.history || trackingData.history.length === 0) && (
                  <p className="text-slate-500 text-center py-4 text-sm font-medium">لا يوجد تفاصيل حركات التتبع متاحة حالياً.</p>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-100 p-6">
              <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-400" />
                المنتجات في هذه الشحنة
              </h4>
              {trackingData.products && trackingData.products.length > 0 ? (
                <div className="space-y-3">
                  {trackingData.products.map((prod: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{prod.productName}</p>
                        <p className="text-xs text-slate-500 mt-1">الكمية: {prod.quantity}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-blue-600 text-base" dir="ltr">${prod.productPrice?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-lg border border-slate-100 border-dashed">تفاصيل المنتجات غير متوفرة لهذه الشحنة.</p>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

