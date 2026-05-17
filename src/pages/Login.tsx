import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSettings } from '../context/SettingsContext';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings, t } = useSettings();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
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
      setError(err.message || (settings.language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {settings.companyName || 'Logi-Track'}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
            {t('systemAdminPanel')}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800 font-bold">
            {error}
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 rounded-xl shadow-md border border-transparent text-sm font-black text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (settings.language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...') : t('loginWithGoogle')}
          </button>
        </div>
      </div>
    </div>
  );
}
