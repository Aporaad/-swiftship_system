import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, LogIn, User, ShieldAlert, Chrome } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useSettings } from '../context/SettingsContext';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const navigate = useNavigate();
  const { settings, t } = useSettings();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email) throw new Error('Could not get email from Google');

      // Check if user exists in our whitelist system
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Auto-seed for root admins
        if (['alsrhyarslan5@gmail.com', 'arslan.alshamari@gmail.com'].includes(email)) {
          await setDoc(doc(db, 'users', result.user.uid), {
            email,
            fullName: result.user.displayName || 'Root Admin',
            role: 'Admin',
            createdAt: Date.now(),
            disabled: false,
            systemPin: '123456' // Default PIN for new root
          });
          // Continue
        } else {
          await signOut(auth);
          throw new Error(settings.language === 'ar' ? 'هذا الحساب غير مصرح له بدخول النظام. يرجى التواصل مع المسؤول.' : 'This account is not authorized to access the system. Please contact the administrator.');
        }
      } else {
        const userData = snap.docs[0].data();
        if (userData.disabled) {
          await signOut(auth);
          throw new Error(settings.language === 'ar' ? 'هذا الحساب معطل حالياً.' : 'This account is currently disabled.');
        }

        // Check for System PIN
        if (userData.systemPin) {
          setPinRequired(true);
          setTempUser(userData);
          setLoading(false);
          return;
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = () => {
    if (pin === tempUser?.systemPin) {
      navigate('/');
    } else {
      setError(settings.language === 'ar' ? 'رمز الدخول غير صحيح' : 'Invalid Access PIN');
    }
  };

  if (pinRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {settings.language === 'ar' ? 'رمز النظام الإضافي' : 'System Access PIN'}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
            {settings.language === 'ar' ? 'أدخل الرمز الخاص بك للمتابعة' : 'Enter your system PIN to proceed'}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800 font-bold mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6 mt-8">
            <input
              type="password"
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value)}
              className="block w-full px-4 py-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-black text-2xl tracking-[1em] text-center"
              placeholder="••••••"
            />
            
            <button
              onClick={verifyPin}
              className="w-full flex justify-center py-4 px-4 rounded-xl shadow-md border border-transparent text-sm font-black text-white bg-amber-600 hover:bg-amber-700 focus:outline-none transition-all active:scale-95 gap-2 items-center"
            >
              <LogIn className="w-5 h-5" />
              {settings.language === 'ar' ? 'تحقق ومتابعة' : 'Verify & Proceed'}
            </button>

            <button
              onClick={() => {
                setPinRequired(false);
                setPin('');
                signOut(auth);
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {settings.language === 'ar' ? 'تغيير الحساب' : 'Switch Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="space-y-6 pt-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center mb-4">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">
              {settings.language === 'ar' ? 'مرحبًا بك في النظام' : 'Welcome to the system'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {settings.language === 'ar' 
                ? 'يرجى تسجيل الدخول باستخدام حساب Google المعتمد الخاص بك.' 
                : 'Please sign in with your authorized Google account.'}
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-sm font-black text-slate-700 dark:text-white bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 gap-3 items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <Chrome className="w-5 h-5 text-blue-600" />
            )}
            {settings.language === 'ar' ? 'الدخول عبر Google' : 'Sign in with Google'}
          </button>
        </div>

        <div className="text-center pt-8">
          <p className="text-xs text-slate-400 font-bold">
            {settings.language === 'ar' 
              ? 'يجب أن يكون بريدك الإلكتروني مسجلاً مسبقاً من قبل الإدارة.' 
              : 'Your email must be pre-registered by the management.'}
          </p>
        </div>
      </div>
    </div>
  );
}
