import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user document exists, if not create it
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          fullName: result.user.displayName || 'New User',
          role: result.user.email === 'alsrhyarslan5@gmail.com' ? 'Admin' : 'Employee',
          createdAt: Date.now()
        });
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            لوجي-تراك
          </h2>
          <p className="mt-3 text-sm text-slate-500 font-medium">
            لوحة تحكم إدارة العمليات
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 font-medium">
            {error}
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-sm border border-transparent text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول باستخدام جوجل'}
          </button>
        </div>
      </div>
    </div>
  );
}
