import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'تأكيد', 
  cancelText = 'إلغاء',
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-100';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-100';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
      default: return 'bg-slate-600 hover:bg-slate-700 shadow-slate-100';
    }
  };

  const getIconColors = () => {
    switch (type) {
      case 'danger': return 'bg-red-50 text-red-600';
      case 'warning': return 'bg-amber-50 text-amber-600';
      case 'info': return 'bg-blue-50 text-blue-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100"
        >
          <div className="p-6 text-center">
            <div className={`w-16 h-16 ${getIconColors()} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>
          
          <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-3 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${getColors()}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
