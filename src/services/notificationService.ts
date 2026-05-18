import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import toast from 'react-hot-toast';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  userId?: string; // Target specific user
  isPublic?: boolean;
}

export const notificationService = {
  async notify({ title, message, type, orderId, userId, isPublic = true }: NotificationParams) {
    try {
      // 1. Show local toast
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        default:
          toast(message, { icon: type === 'warning' ? '⚠️' : 'ℹ️' });
      }

      // 2. Save to Firestore for persistence
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        type,
        orderId: orderId || null,
        userId: userId || 'global',
        isPublic,
        read: false,
        createdAt: Date.now(),
        creatorId: auth.currentUser?.uid || 'system',
        creatorName: auth.currentUser?.displayName || 'System'
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }
};
