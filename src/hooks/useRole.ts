import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setRole(userData.role);
        setProfile(userData);

        // Fetch permissions for this role
        if (userData.role === 'Admin') {
          // Admins always have all permissions
          setPermissions(['*']);
          setLoading(false);
        } else if (userData.role) {
          onSnapshot(doc(db, 'roles', userData.role), (roleDoc) => {
            if (roleDoc.exists()) {
              setPermissions(roleDoc.data().permissions || []);
            } else {
              // Default fallback permissions if role doc doesn't exist yet
              const defaults: Record<string, string[]> = {
                'Employee': ['view_dashboard', 'view_orders', 'manage_orders', 'view_customers', 'manage_customers'],
                'Accountant': ['view_dashboard', 'view_orders', 'view_finance', 'manage_finance', 'manage_sources'],
                'Courier': ['view_orders', 'update_order_status']
              };
              setPermissions(defaults[userData.role] || []);
            }
            setLoading(false);
          }, () => {
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching role:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [auth.currentUser]);

  const hasPermission = (permission: string) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  return { role, permissions, hasPermission, loading, profile };
}
