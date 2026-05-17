import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, orderBy, query, where, addDoc, doc, updateDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Search, Edit2, Truck, Activity, Trash2, DollarSign, CreditCard, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const [orderPayments, setOrderPayments] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  const [items, setItems] = useState<any[]>([{ productName: '', productUrl: '', quantity: '1', productPrice: '0', weight: '0', trackingNumber: '' }]);
  const [shippings, setShippings] = useState<any[]>([{ shippingType: 'Air', company: '', source: '', destination: '', date: '', duration: '', expectedArrival: '', cost: '0', packagingFee: '0' }]);

  const [formData, setFormData] = useState({
    customerId: '',
    trackingNumber: '',
    orderSource: '',
    externalOrderNumber: '',

    shippingCourierId: '',
    shippingCourierFee: '0',
    shippingCourierCommission: '0',

    deliveryCourierId: '',
    deliveryCourierFee: '0',

    currency: 'USD',
    exchangeRate: '1',

    taxes: '0',
    bankCommission: '0',
    packagingFee: '0',
    companyCommission: '0',
    
    paymentType: 'Cash',
    amountPaid: '0',
    notes: ''
  });

  const [updateData, setUpdateData] = useState({
    orderStatus: '',
    location: '',
    amountPaid: '0',
    notes: ''
  });

  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isQuickSourceOpen, setIsQuickSourceOpen] = useState(false);
  const [isQuickCourierOpen, setIsQuickCourierOpen] = useState(false);

  const [quickForm, setQuickForm] = useState({
    name: '', phone: '', address: '', role: 'Courier', url: '', targetField: ''
  });

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setCouriers(allUsers.filter(u => u.role === 'Courier' || u.role === 'Admin' || u.role === 'Employee')); 
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubSources = onSnapshot(collection(db, 'sources'), (snap) => {
      setSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sources'));

    return () => { unsubOrders(); unsubCustomers(); unsubUsers(); unsubSources(); };
  }, []);

  useEffect(() => {
    let unsubPayments = () => {};
    if (selectedOrder && isPaymentModalOpen) {
      unsubPayments = onSnapshot(
        query(collection(db, 'payments'), where('orderId', '==', selectedOrder.id), orderBy('createdAt', 'desc')),
        (snap) => {
          setOrderPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        (error) => {
          // If indexing is needed, this might fail initially, but where works natively if no compound index needed,
          // though since we use orderBy createdAt we might need a composite index on orderId + createdAt.
          // In dev mode, they can click the link. Let's handle it silently here.
          console.error(error);
        }
      );
    }
    return () => unsubPayments();
  }, [selectedOrder, isPaymentModalOpen]);

  const customerMap = customers.reduce((acc, c) => ({...acc, [c.id]: c.fullName}), {} as Record<string, string>);
  const courierMap = couriers.reduce((acc, c) => ({...acc, [c.id]: c.fullName}), {} as Record<string, string>);
  const sourceMap = sources.reduce((acc, s) => ({...acc, [s.id]: s.source_name}), {} as Record<string, string>);

  const handleQuickAddCustomer = async () => {
    if (!quickForm.name || !quickForm.phone) return alert('الاسم ورقم الهاتف للعميل مطلوبان');
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        fullName: quickForm.name, phone: quickForm.phone, address: quickForm.address || '', gps_location: '', notes: ''
      });
      setFormData({...formData, customerId: docRef.id});
      setIsQuickCustomerOpen(false);
      setQuickForm({...quickForm, name: '', phone: '', address: ''});
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, 'customers'); }
  };

  const handleQuickAddSource = async () => {
    if (!quickForm.name) return alert('اسم المصدر مطلوب');
    try {
      const docRef = await addDoc(collection(db, 'sources'), { source_name: quickForm.name, source_url: quickForm.url || '', notes: '' });
      setFormData({...formData, orderSource: docRef.id});
      setIsQuickSourceOpen(false);
      setQuickForm({...quickForm, name: '', url: ''});
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, 'sources'); }
  };

  const handleQuickAddCourier = async (targetField: string) => {
    if (!quickForm.name) return alert('الاسم مطلوب');
    try {
      const docRef = await addDoc(collection(db, 'users'), { fullName: quickForm.name, email: `courier-${Date.now()}@example.com`, role: 'Courier', createdAt: Date.now() });
      if(targetField === 'shipping') setFormData({...formData, shippingCourierId: docRef.id});
      if(targetField === 'delivery') setFormData({...formData, deliveryCourierId: docRef.id});
      setIsQuickCourierOpen(false);
      setQuickForm({...quickForm, name: '', role: 'Courier', targetField: ''});
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, 'users'); }
  };

  const calculatedProductCost = items.reduce((acc, item) => acc + (parseFloat(item.productPrice) || 0) * (parseInt(item.quantity) || 1), 0);
  const calculatedShippingCost = shippings.reduce((acc, sh) => acc + (parseFloat(sh.cost) || 0) + (parseFloat(sh.packagingFee) || 0), 0);
  
  const totalCost = calculatedProductCost 
                    + calculatedShippingCost 
                    + (parseFloat(formData.taxes) || 0)
                    + (parseFloat(formData.bankCommission) || 0)
                    + (parseFloat(formData.packagingFee) || 0);
                    
  const remainingAmount = totalCost - (parseFloat(formData.amountPaid) || 0);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountPaid = parseFloat(formData.amountPaid) || 0;
      let paymentStatus = 'Unpaid';
      if (amountPaid >= totalCost && totalCost > 0) paymentStatus = 'Paid';
      else if (amountPaid > 0) paymentStatus = 'Partial Paid';

      const orderPayload = {
        customerId: formData.customerId,
        trackingNumber: formData.trackingNumber,
        externalOrderNumber: formData.externalOrderNumber,
        orderSource: formData.orderSource,
        
        shipping_courier_id: formData.shippingCourierId,
        shipping_courier_fee: parseFloat(formData.shippingCourierFee) || 0,
        shipping_courier_commission: parseFloat(formData.shippingCourierCommission) || 0,
        
        delivery_courier_id: formData.deliveryCourierId,
        delivery_courier_fee: parseFloat(formData.deliveryCourierFee) || 0,
        
        currency: formData.currency,
        exchangeRate: parseFloat(formData.exchangeRate) || 1,
        
        productsTotal: calculatedProductCost,
        shippingTotal: calculatedShippingCost,
        taxes: parseFloat(formData.taxes) || 0,
        bankCommission: parseFloat(formData.bankCommission) || 0,
        packagingFee: parseFloat(formData.packagingFee) || 0,
        companyCommission: parseFloat(formData.companyCommission) || 0,
        totalCost,
        
        paymentType: formData.paymentType,
        paymentStatus,
        paidAmount: amountPaid,
        remainingAmount: remainingAmount,
        notes: formData.notes,
        
        orderStatus: 'Pending',
        orderDate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderPayload);

      await addDoc(collection(db, `orders/${docRef.id}/trackingUpdates`), {
        status: 'Pending', location: 'تم استلام الطلب وتسجيله بالنظام', timestamp: Date.now(), updatedBy: auth.currentUser?.uid || 'System'
      });

      const batch = writeBatch(db);
      
      // Items
      items.forEach(item => {
        const itemRef = doc(collection(db, `orders/${docRef.id}/items`));
        batch.set(itemRef, {
          productName: item.productName || 'منتج غير مسمى',
          productUrl: item.productUrl || '',
          quantity: parseInt(item.quantity) || 1,
          weight: parseFloat(item.weight) || 0,
          productPrice: parseFloat(item.productPrice) || 0,
          trackingNumber: item.trackingNumber || '',
          createdAt: Date.now()
        });
      });

      // Shippings
      shippings.forEach(sh => {
        const shRef = doc(collection(db, `orders/${docRef.id}/shippings`));
        batch.set(shRef, {
          shippingType: sh.shippingType,
          company: sh.company,
          source: sh.source,
          destination: sh.destination,
          shippingDate: sh.date,
          duration: sh.duration,
          expectedArrival: sh.expectedArrival,
          deliveredDate: '',
          cost: parseFloat(sh.cost) || 0,
          packagingFee: parseFloat(sh.packagingFee) || 0
        });
      });

      batch.set(doc(db, 'public_tracking', formData.trackingNumber.trim()), {
        status: 'Pending', itemCount: items.length, 
        courierId: formData.deliveryCourierId || '',
        history: [{ status: 'Pending', location: 'تم استلام الطلب وتسجيله بالنظام', timestamp: Date.now(), updatedBy: auth.currentUser?.uid || 'System' }]
      });

      await batch.commit();
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };
  
  const resetForm = () => {
    setItems([{ productName: '', productUrl: '', quantity: '1', productPrice: '0', weight: '0', trackingNumber: '' }]);
    setShippings([{ shippingType: 'Air', company: '', source: '', destination: '', date: '', duration: '', expectedArrival: '', cost: '0', packagingFee: '0' }]);
    setFormData({
      customerId: '', trackingNumber: '', orderSource: '', externalOrderNumber: '',
      shippingCourierId: '', shippingCourierFee: '0', shippingCourierCommission: '0',
      deliveryCourierId: '', deliveryCourierFee: '0',
      currency: 'USD', exchangeRate: '1', taxes: '0', bankCommission: '0', packagingFee: '0', companyCommission: '0',
      paymentType: 'Cash', amountPaid: '0', notes: ''
    });
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const amount = parseFloat(paymentData.amount);
      if (!amount || amount <= 0) return alert('الرجاء إدخال مبلغ صحيح');
      
      const newPaidAmount = (selectedOrder.paidAmount || 0) + amount;
      const tc = selectedOrder.totalCost || 0;
      const newRemaining = tc - newPaidAmount;
      
      let paymentStatus = 'Unpaid';
      if (newPaidAmount >= tc && tc > 0) paymentStatus = 'Paid';
      else if (newPaidAmount > 0) paymentStatus = 'Partial';

      const batch = writeBatch(db);
      
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        orderId: selectedOrder.id,
        amount: amount,
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
        createdBy: auth.currentUser?.uid || 'System',
        createdAt: Date.now()
      });

      const orderRef = doc(db, 'orders', selectedOrder.id);
      batch.update(orderRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        paymentStatus: paymentStatus,
        updatedAt: Date.now()
      });

      await batch.commit();
      
      setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
      // Update local state temporarily for UX, or let onSnapshot handle it (it does via orders listener, but we might need to wait for it).
      setSelectedOrder({...selectedOrder, paidAmount: newPaidAmount, remainingAmount: newRemaining});
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'payments');
    }
  };

  const handlePrintInvoice = async (order: any) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      const companyInfo = docSnap.exists() ? docSnap.data() : {
        companyName: 'لوجي-تراك',
        companyPhone: '',
        companyAddress: '',
        companyEmail: ''
      };

      const printWindow = window.open('', '_blank');
      if (!printWindow) return alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
      
      const invoiceHtml = `
        <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة - ${order.trackingNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-contact { color: #666; font-size: 14px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #1e40af; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: right; }
            th { background: #f9fafb; font-weight: bold; }
            .totals { width: 300px; margin-right: auto; }
            .totals table { margin-bottom: 0; }
            .totals td { border: none; padding: 8px 12px; }
            .totals tr.bold { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyInfo.companyName}</div>
            <div class="company-contact">${companyInfo.companyPhone} | ${companyInfo.companyEmail}</div>
            <div class="company-contact">${companyInfo.companyAddress}</div>
          </div>
          
          <div class="invoice-details">
            <div>
              <div class="title">فاتورة ضريبية</div>
              <div>رقم التتبع: <strong>${order.trackingNumber}</strong></div>
              <div>التاريخ: ${order.createdAt ? format(order.createdAt, 'yyyy-MM-dd') : '-'}</div>
            </div>
            <div>
              <div class="title">بيانات العميل</div>
              <div>الاسم: <strong>${customerMap[order.customer_id] || '-'}</strong></div>
              <div>العنوان: ${order.shippingInfo?.destination || '-'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>الصنف (المنتج)</th>
                <th>الكمية</th>
                <th>رقم التتبع الخاص</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((item: any) => `
                <tr>
                  <td>${item.productName || item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td dir="ltr" style="text-align: right">${item.trackingNumber || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>قيمة المشتريات:</td>
                <td dir="ltr">$${(order.itemsTotal || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>أجور الشحن:</td>
                <td dir="ltr">$${(order.shippingTotal || 0).toFixed(2)}</td>
              </tr>
              <tr class="bold">
                <td>الإجمالي المستحق:</td>
                <td dir="ltr">$${(order.totalCost || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>المبلغ المدفوع:</td>
                <td dir="ltr" style="color: green">$${(order.paidAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>المبلغ المتبقي:</td>
                <td dir="ltr" style="color: red">$${(order.remainingAmount || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 50px; text-align: center; color: #666; font-size: 14px;">
            شكراً لتعاملكم معنا!
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();

    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء طباعة الفاتورة');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const newAmountPaid = parseFloat(updateData.amountPaid) || 0;
      const tc = selectedOrder.totalCost || 0;
      let paymentStatus = 'Unpaid';
      if (newAmountPaid >= tc) paymentStatus = 'Paid';
      else if (newAmountPaid > 0) paymentStatus = 'Partial';

      const updates = {
        orderStatus: updateData.orderStatus,
        paid_amount: newAmountPaid, // Fix DB field consistency: we used paidAmount in creation
        remaining_amount: tc - newAmountPaid,
        payment_status: paymentStatus, // Fix: paymentStatus used in creation
        notes: updateData.notes,
        updatedAt: Date.now()
      };

      // Ensure consistent field naming in update as we did in create: 
      // We used paidAmount, paymentStatus, remainingAmount in orderPayload.
      const compatibleUpdates = {
        order_status: updateData.orderStatus,
        paidAmount: newAmountPaid,
        paymentStatus,
        remainingAmount: tc - newAmountPaid,
        notes: updateData.notes,
        updatedAt: Date.now()
      }

      await updateDoc(doc(db, 'orders', selectedOrder.id), compatibleUpdates);

      if (updateData.orderStatus !== selectedOrder.orderStatus || updateData.location) {
        const trackPayload = { status: updateData.orderStatus, location: updateData.location || 'تحديث حالة الشحنة', timestamp: Date.now(), updatedBy: auth.currentUser?.uid || 'System' };
        await addDoc(collection(db, `orders/${selectedOrder.id}/trackingUpdates`), trackPayload);
        await updateDoc(doc(db, 'public_tracking', selectedOrder.trackingNumber.trim()), { status: updateData.orderStatus, history: arrayUnion(trackPayload) });
        
        // Add a global notification for track update
        await addDoc(collection(db, 'notifications'), {
          type: 'order',
          title: 'تحديث حالة طلب',
          message: `تم تحديث حالة الطلب رقم (${selectedOrder.trackingNumber}) إلى: ${updateData.orderStatus}`,
          userId: 'global',
          createdAt: Date.now(),
          read: false
        });
      }

      setIsUpdateModalOpen(false);
      setSelectedOrder(null);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'orders'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">إدارة الطلبات</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm hover:bg-blue-700 transition">
          <Plus className="w-4 h-4"/> إضافة طلب جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
           <div className="relative w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="بحث برقم التتبع أو العميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50" />
          </div>
        </div>
        {loading ? <div className="p-8 text-center text-slate-500">جاري التحميل...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">رقم التتبع</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">المصدر</th>
                  <th className="p-4">التكلفة / المدفوع</th>
                  <th className="p-4">مندوب التوصيل</th>
                  <th className="p-4">تاريخ الطلب</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {orders.filter(o => o.trackingNumber?.toLowerCase().includes(search.toLowerCase()) || (customerMap[o.customerId] || '').toLowerCase().includes(search.toLowerCase())).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-slate-700">{order.trackingNumber}</td>
                    <td className="p-4 font-bold text-slate-900">{customerMap[order.customerId] || '-'}</td>
                    <td className="p-4">{sourceMap[order.orderSource] || '-'}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800" dir="ltr">${order.totalCost?.toFixed(2)}</div>
                      <div className="text-xs text-emerald-600 font-bold" dir="ltr">Paid: ${order.paidAmount?.toFixed(2)}</div>
                    </td>
                    <td className="p-4">{courierMap[order.delivery_courier_id] || '-'}</td>
                    <td className="p-4 text-xs text-slate-500">{order.createdAt ? format(order.createdAt, 'dd MMM yyyy') : '-'}</td>
                    <td className="p-4 flex gap-2 justify-end">
                      <button title="طباعة الفاتورة" onClick={() => handlePrintInvoice(order)} className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button title="إدارة المدفوعات" onClick={() => { setSelectedOrder(order); setIsPaymentModalOpen(true); }} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg">
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button title="تحديث الحالة" onClick={() => { setSelectedOrder(order); setUpdateData({ orderStatus: order.order_status || order.orderStatus, location: '', amountPaid: order.paidAmount?.toString() || '0', notes: order.notes || '' }); setIsUpdateModalOpen(true); }} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-0 flex flex-col" style={{maxHeight:'90vh'}}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
               <h2 className="text-xl font-bold text-slate-800">إنشاء طلب جديد</h2>
               <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-lg">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="addOrderForm" onSubmit={handleAddOrder} className="space-y-10">
                {/* 1. Basic Info */}
                <section>
                   <h3 className="text-base font-bold text-blue-700 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
                     البيانات الأساسية للطلب
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Customer */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-sm font-bold text-slate-700">العميل <span className="text-red-500">*</span></label>
                          <button type="button" onClick={() => { setIsQuickCustomerOpen(!isQuickCustomerOpen); setIsQuickSourceOpen(false); setIsQuickCourierOpen(false); }} className="text-xs text-blue-600 font-bold hover:underline">+ عميل جديد</button>
                        </div>
                        {isQuickCustomerOpen ? (
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-2">
                            <input type="text" placeholder="الاسم" value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})} className="w-full text-sm border-0 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" />
                            <input type="text" placeholder="رقم الهاتف" value={quickForm.phone} onChange={e => setQuickForm({...quickForm, phone: e.target.value})} className="w-full text-sm border-0 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" />
                            <button type="button" onClick={handleQuickAddCustomer} className="w-full bg-blue-600 text-white font-bold text-sm rounded-lg py-1.5 hover:bg-blue-700 transition">حفظ واختيار</button>
                          </div>
                        ) : (
                          <select required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white outline-none">
                            <option value="">اختر العميل...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Source */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-sm font-bold text-slate-700">المصدر <span className="text-red-500">*</span></label>
                          <button type="button" onClick={() => { setIsQuickSourceOpen(!isQuickSourceOpen); setIsQuickCustomerOpen(false); setIsQuickCourierOpen(false); }} className="text-xs text-blue-600 font-bold hover:underline">+ مصدر جديد</button>
                        </div>
                        {isQuickSourceOpen ? (
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-2">
                            <input type="text" placeholder="اسم المصدر" value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})} className="w-full text-sm border-0 rounded-lg p-2 focus:ring-2 focus:ring-blue-500" />
                            <button type="button" onClick={handleQuickAddSource} className="w-full bg-blue-600 text-white font-bold text-sm rounded-lg py-1.5 hover:bg-blue-700 transition">حفظ واختيار</button>
                          </div>
                        ) : (
                          <select required value={formData.orderSource} onChange={e => setFormData({...formData, orderSource: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white outline-none">
                            <option value="">اختر المصدر...</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Track & IDs */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">رقم التتبع للطلب <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <input required type="text" value={formData.trackingNumber} onChange={e => setFormData({...formData, trackingNumber: e.target.value})} className="flex-1 w-full border border-slate-200 rounded-xl p-3 bg-slate-50 min-w-0" dir="ltr" />
                            <button type="button" onClick={() => setFormData({...formData, trackingNumber: 'TRK-'+Date.now().toString().slice(-6)})} className="bg-slate-200 text-slate-700 px-3 rounded-xl font-bold text-xs">توليد</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">رقم الطلب (خارجي - شي إن الخ)</label>
                          <input type="text" value={formData.externalOrderNumber} onChange={e => setFormData({...formData, externalOrderNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50" dir="ltr" />
                        </div>
                      </div>

                   </div>
                </section>

                <hr className="border-slate-100" />

                {/* 2. Couriers & Roles */}
                <section>
                   <h3 className="text-base font-bold text-purple-700 mb-4 border-b border-purple-100 pb-2 flex items-center justify-between">
                     <span>إدارة المندوبين والتوصيل</span>
                     <button type="button" onClick={() => { setIsQuickCourierOpen(!isQuickCourierOpen); setQuickForm({...quickForm, targetField: ''}); }} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-lg">إضافة مندوب للنظام +</button>
                   </h3>
                   
                   {isQuickCourierOpen && (
                     <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-6 flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-purple-800">اسم المندوب الجديد</label>
                          <input type="text" value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})} className="w-full mt-1 border-0 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div className="flex-1">
                           <label className="text-xs font-bold text-purple-800">تعيين في حقل</label>
                           <select value={quickForm.targetField} onChange={e => setQuickForm({...quickForm, targetField: e.target.value})} className="w-full mt-1 border-0 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 font-bold">
                             <option value="">لا تعين (إضافة فقط)</option>
                             <option value="shipping">مندوب الشحن الدولي</option>
                             <option value="delivery">مندوب التوصيل المحلي</option>
                           </select>
                        </div>
                        <button type="button" onClick={() => handleQuickAddCourier(quickForm.targetField)} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-purple-700">حفظ المندوب</button>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2"><Truck className="w-4 h-4"/> مندوب الشحن (للشركة)</h4>
                       <div className="space-y-4">
                         <div>
                            <select value={formData.shippingCourierId} onChange={e => setFormData({...formData, shippingCourierId: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 outline-none">
                              <option value="">اختر مندوب الشحن...</option>
                              {couriers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                            </select>
                         </div>
                         <div className="flex gap-4">
                           <div className="flex-1">
                             <label className="text-xs text-slate-500 font-bold">رسوم المندوب</label>
                             <input type="number" step="0.01" value={formData.shippingCourierFee} onChange={e => setFormData({...formData, shippingCourierFee: e.target.value})} className="w-full border-b border-slate-300 p-2 bg-transparent outline-none" dir="ltr" />
                           </div>
                           <div className="flex-1">
                             <label className="text-xs text-slate-500 font-bold">نسبة عمولته (%)</label>
                             <input type="number" step="0.1" value={formData.shippingCourierCommission} onChange={e => setFormData({...formData, shippingCourierCommission: e.target.value})} className="w-full border-b border-slate-300 p-2 bg-transparent outline-none" dir="ltr" />
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2"><Truck className="w-4 h-4"/> مندوب التوصيل (للعميل)</h4>
                       <div className="space-y-4">
                         <div>
                            <select value={formData.deliveryCourierId} onChange={e => setFormData({...formData, deliveryCourierId: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 outline-none">
                              <option value="">اختر مندوب التوصيل...</option>
                              {couriers.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                            </select>
                         </div>
                         <div>
                           <label className="text-xs text-slate-500 font-bold">رسوم التوصيل</label>
                           <input type="number" step="0.01" value={formData.deliveryCourierFee} onChange={e => setFormData({...formData, deliveryCourierFee: e.target.value})} className="w-full border-b border-slate-300 p-2 bg-transparent outline-none" dir="ltr" />
                         </div>
                       </div>
                     </div>
                   </div>
                </section>

                <hr className="border-slate-100" />

                {/* 3. Products */}
                <section>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-base font-bold text-teal-700">المنتجات</h3>
                    <button type="button" onClick={() => setItems([...items, { productName: '', productUrl: '', quantity: '1', productPrice: '0', weight: '0', trackingNumber: '' }])} className="text-teal-700 bg-teal-50 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm">+ إضافة منتج آخر</button>
                  </div>
                  
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative grid grid-cols-1 md:grid-cols-12 gap-4">
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm z-10">✕</button>
                        )}
                        <div className="col-span-3">
                          <label className="block text-xs font-bold text-slate-500 mb-1">المنتج <span className="text-red-500">*</span></label>
                          <input required type="text" value={item.productName} onChange={e => { const n = [...items]; n[index].productName = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm focus:ring-1 focus:ring-teal-500 outline-none" />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-bold text-slate-500 mb-1">الرابط</label>
                          <input type="url" value={item.productUrl} onChange={e => { const n = [...items]; n[index].productUrl = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm focus:ring-1 focus:ring-teal-500 outline-none" dir="ltr" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">رقم تتبع (يخص المنتج)</label>
                          <input type="text" value={item.trackingNumber} onChange={e => { const n = [...items]; n[index].trackingNumber = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm focus:ring-1 focus:ring-teal-500 outline-none" dir="ltr" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">الكمية</label>
                          <input required type="number" min="1" value={item.quantity} onChange={e => { const n = [...items]; n[index].quantity = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm text-center font-bold" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">الوزن (kg)</label>
                          <input type="number" step="0.01" value={item.weight} onChange={e => { const n = [...items]; n[index].weight = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm text-center" dir="ltr" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">السعر <span className="text-red-500">*</span></label>
                          <input required type="number" step="0.01" value={item.productPrice} onChange={e => { const n = [...items]; n[index].productPrice = e.target.value; setItems(n); }} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm text-center font-bold" dir="ltr" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-left">
                     <span className="bg-teal-50 text-teal-800 px-4 py-2 rounded-lg font-bold text-sm">إجمالي المنتجات: ${calculatedProductCost.toFixed(2)}</span>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* 4. Shipping Details */}
                <section>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-base font-bold text-orange-700">تفاصيل الشحن (من المصدر إلى الشركة)</h3>
                    <button type="button" onClick={() => setShippings([...shippings, { shippingType: 'Air', company: '', source: '', destination: '', date: '', duration: '', expectedArrival: '', cost: '0', packagingFee: '0' }])} className="text-orange-700 bg-orange-50 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm">+ إضافة شحنة</button>
                  </div>
                  
                  <div className="space-y-4">
                    {shippings.map((sh, index) => (
                      <div key={index} className="bg-orange-50/30 border border-orange-200 rounded-xl p-5 relative">
                        {shippings.length > 1 && (
                          <button type="button" onClick={() => setShippings(shippings.filter((_, i) => i !== index))} className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-sm z-10">✕</button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">نوع الشحن</label>
                            <select value={sh.shippingType} onChange={e => { const n = [...shippings]; n[index].shippingType = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm">
                              <option value="Air">جوي (Air)</option>
                              <option value="Land">بري (Land)</option>
                              <option value="Sea">بحري (Sea)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">شركة الشحن</label>
                            <input type="text" value={sh.company} onChange={e => { const n = [...shippings]; n[index].company = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" placeholder="ARAMEX, DHL..." />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">مصدر الشحن (من)</label>
                            <input type="text" value={sh.source} onChange={e => { const n = [...shippings]; n[index].source = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">وجهة الشحن (إلى)</label>
                            <input type="text" value={sh.destination} onChange={e => { const n = [...shippings]; n[index].destination = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">تاريخ الشحن</label>
                            <input type="date" value={sh.date} onChange={e => { const n = [...shippings]; n[index].date = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">وقت المتوقع (ETA)</label>
                            <input type="date" value={sh.expectedArrival} onChange={e => { const n = [...shippings]; n[index].expectedArrival = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">مدة الشحن</label>
                            <input type="text" value={sh.duration} onChange={e => { const n = [...shippings]; n[index].duration = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-200 rounded-lg text-sm" placeholder="مثال: 5 أيام" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">رسوم التغليف التابعة</label>
                            <input type="number" step="0.01" value={sh.packagingFee} onChange={e => { const n = [...shippings]; n[index].packagingFee = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-300 bg-white font-bold rounded-lg text-sm" dir="ltr" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-red-600 block mb-1">تكلفة الشحن الكلية</label>
                            <input type="number" step="0.01" value={sh.cost} onChange={e => { const n = [...shippings]; n[index].cost = e.target.value; setShippings(n); }} className="w-full p-2.5 border border-orange-400 bg-white shadow-inner font-bold rounded-lg text-sm text-red-600" dir="ltr" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-left">
                     <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-bold text-sm">إجمالي عمليات الشحن والتغليف المرفق: ${calculatedShippingCost.toFixed(2)}</span>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* 5. Financials */}
                <section>
                  <h3 className="text-base font-bold text-emerald-800 mb-4 border-b border-emerald-100 pb-2">الملخص المالي والحسابات</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">رسوم تغليف النظام</label>
                      <input type="number" step="0.01" value={formData.packagingFee} onChange={e => setFormData({...formData, packagingFee: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-white font-bold" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">ضرائب (Taxes)</label>
                      <input type="number" step="0.01" value={formData.taxes} onChange={e => setFormData({...formData, taxes: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-white font-bold" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">عمولة بنك/طريقة الدفع</label>
                      <input type="number" step="0.01" value={formData.bankCommission} onChange={e => setFormData({...formData, bankCommission: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-white font-bold" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-indigo-700 mb-1 block">عمولة الشركة (نسبة/مبلغ)</label>
                      <input type="number" step="0.01" value={formData.companyCommission} onChange={e => setFormData({...formData, companyCommission: e.target.value})} className="w-full p-3 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-bold" dir="ltr" />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">العملة الأساسية للطلب</label>
                      <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-white font-bold uppercase" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">سعر الصرف (إن وجد)</label>
                      <input type="number" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 bg-white font-bold" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-800 mb-1 block">طريقة الدفع</label>
                      <select value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value})} className="w-full p-3 rounded-lg border border-emerald-200 bg-emerald-50 font-bold outline-none">
                        <option value="Cash">نقد (Cash)</option>
                        <option value="BankTransfer">حوالة بنكية</option>
                        <option value="CreditCard">بطاقة إئتمان</option>
                        <option value="Wallet">محفظة إلكترونية</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-800 mb-1 block">المبلغ المدفوع مقدمًا</label>
                      <input type="number" step="0.01" value={formData.amountPaid} onChange={e => setFormData({...formData, amountPaid: e.target.value})} className="w-full p-3 rounded-lg border-2 border-emerald-400 bg-white font-black text-emerald-800" dir="ltr" />
                    </div>
                  </div>

                  <div className="bg-emerald-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg">
                     <div className="flex-1 space-y-2 w-full">
                       <div className="flex justify-between text-emerald-200/70 text-sm"><span>إجمالي المنتجات:</span> <span dir="ltr">${calculatedProductCost.toFixed(2)}</span></div>
                       <div className="flex justify-between text-emerald-200/70 text-sm border-b border-emerald-800 pb-2"><span>الشحن والضرائب والإضافات:</span> <span dir="ltr">+${(totalCost - calculatedProductCost).toFixed(2)}</span></div>
                       <div className="flex justify-between text-lg font-bold pt-1 text-emerald-300"><span>المبلغ المتبقي للتحصيل:</span> <span dir="ltr">${remainingAmount.toFixed(2)}</span></div>
                     </div>
                     <div className="w-px h-24 bg-emerald-800 mx-8 hidden md:block"></div>
                     <div className="text-center mt-6 md:mt-0">
                       <p className="text-emerald-100 mb-1 text-sm font-medium">إجمالي التكلفة الكلية للطلب</p>
                       <p className="text-4xl font-black" dir="ltr">${totalCost.toFixed(2)}</p>
                     </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-sm font-bold text-slate-700 block mb-2">ملاحظات عامة على الطلب</label>
                    <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl p-4 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="أي ملاحظات تخص العميل, التوصيل, الشراء..."></textarea>
                  </div>
                </section>

              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">إلغاء</button>
              <button type="submit" form="addOrderForm" className="px-10 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">حفظ وإنشاء الطلب المتكامل</button>
            </div>
          </div>
        </div>
      )}

      {/* تحديث حالة الطلب */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-6 text-slate-800">تحديث مسار وموقع الشحنة</h2>
              <form onSubmit={handleUpdateOrder} className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                   <div>
                     <p className="text-sm text-slate-500 mb-1 font-medium">رقم التتبع</p>
                     <p className="font-mono font-bold text-lg text-slate-800">{selectedOrder.trackingNumber}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm text-slate-500 mb-1 font-medium">المتبقي</p>
                     <p className="font-bold text-lg text-red-600" dir="ltr">${selectedOrder.remainingAmount?.toFixed(2)}</p>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الحالة الجديدة للشحنة</label>
                  <select required value={updateData.orderStatus} onChange={e => setUpdateData({...updateData, orderStatus: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800">
                    <option value="Pending">قيد الانتظار (Pending)</option>
                    <option value="Ordered">تم الطلب (Ordered)</option>
                    <option value="Processing">قيد التجهيز (Processing)</option>
                    <option value="Shipped">تم الشحن (Shipped)</option>
                    <option value="In Transit">بالشحن الدولي (In Transit)</option>
                    <option value="In Local Warehouse">وصل المخزن المحلي (In Local Warehouse)</option>
                    <option value="Out For Delivery">خرج للتسليم مع المندوب (Out For Delivery)</option>
                    <option value="Delivered">تم التسليم النهائي (Delivered)</option>
                    <option value="Returned">مرتجع (Returned)</option>
                    <option value="Cancelled">ملغي (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">تحديث موقع الشحنة (أو ملاحظة خط سير)</label>
                  <input type="text" placeholder="مثال: غادرت مستودعات تركيا..." value={updateData.location} onChange={e => setUpdateData({...updateData, location: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white outline-none" />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-1">إجمالي المدفوع حتى هذه اللحظة</label>
                  <input type="number" min="0" step="0.01" value={updateData.amountPaid} onChange={e => setUpdateData({...updateData, amountPaid: e.target.value})} className="w-full border border-emerald-200 rounded-xl p-3 bg-emerald-50 font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none" dir="ltr" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات عامة</label>
                  <textarea rows={2} value={updateData.notes} onChange={e => setUpdateData({...updateData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none" placeholder="ملاحظات المندوب..."></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4">
                  <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 rounded-xl transition">إلغاء</button>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">تطبيق وحفظ</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* إدارة المدفوعات */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden" style={{maxHeight:'90vh'}}>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
                 <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                   <DollarSign className="w-5 h-5"/>
                   إدارة مدفوعات الطلب
                 </h2>
                 <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:bg-emerald-100 p-2 rounded-lg">✕</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <p className="text-sm text-slate-500 mb-1 font-bold">التكلفة الإجمالية</p>
                    <p className="text-2xl font-black text-slate-800" dir="ltr">${selectedOrder.totalCost?.toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                    <p className="text-sm text-emerald-600 mb-1 font-bold">إجمالي المدفوع</p>
                    <p className="text-2xl font-black text-emerald-700" dir="ltr">${selectedOrder.paidAmount?.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <p className="text-sm text-red-600 mb-1 font-bold">المبلغ المتبقي</p>
                    <p className="text-2xl font-black text-red-700" dir="ltr">${selectedOrder.remainingAmount?.toFixed(2)}</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Add New Payment */}
                <div>
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Plus className="w-4 h-4 text-emerald-600" /> تسجيل دفعة جديدة
                   </h3>
                   <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="col-span-3">
                         <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ <span className="text-red-500">*</span></label>
                         <input required type="number" step="0.01" min="0.01" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold focus:ring-1 focus:ring-emerald-500 outline-none" dir="ltr" />
                      </div>
                      <div className="col-span-3">
                         <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الدفع</label>
                         <input type="text" readOnly value={format(new Date(), 'yyyy-MM-dd')} className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-500 cursor-not-allowed" />
                      </div>
                      <div className="col-span-3">
                         <label className="block text-xs font-bold text-slate-500 mb-1">طريقة الدفع</label>
                         <select value={paymentData.paymentMethod} onChange={e => setPaymentData({...paymentData, paymentMethod: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none">
                           <option value="Cash">نقد (Cash)</option>
                           <option value="BankTransfer">حوالة بنكية</option>
                           <option value="CreditCard">بطاقة إئتمان</option>
                           <option value="Wallet">محفظة إلكترونية</option>
                         </select>
                      </div>
                      <div className="col-span-3">
                         <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition flex justify-center items-center gap-2">
                           تسجيل
                         </button>
                      </div>
                      <div className="col-span-12 mt-2">
                        <input type="text" placeholder="ملاحظات حول الدفعة (رقم الحوالة أو اسم البنك)..." value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                      </div>
                   </form>
                </div>

                {/* History */}
                <div>
                   <h3 className="font-bold text-slate-800 mb-3 border-t border-slate-100 pt-6">سجل المدفوعات المسجلة</h3>
                   {orderPayments.length === 0 ? (
                     <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                       لا توجد دفعات مالية مسجلة في السجل
                     </div>
                   ) : (
                     <div className="space-y-3">
                        {orderPayments.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50">
                             <div className="flex items-center gap-4">
                               <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                                 {p.paymentMethod === 'Cash' ? <DollarSign className="w-5 h-5"/> : <CreditCard className="w-5 h-5"/>}
                               </div>
                               <div>
                                 <p className="font-bold text-slate-800 text-lg" dir="ltr">${p.amount?.toFixed(2)}</p>
                                 <p className="text-xs text-slate-500 mt-0.5">{p.notes || 'لا توجد ملاحظات'}</p>
                               </div>
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-bold text-slate-600">{p.paymentMethod}</p>
                               <p className="text-xs text-slate-400 mt-1">{p.createdAt ? format(p.createdAt, "MMM d, yyyy 'at' h:mm a") : ''}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
