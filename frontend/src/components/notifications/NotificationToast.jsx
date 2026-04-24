import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlineShieldExclamation, HiOutlineCash } from 'react-icons/hi';
import apiClient from '../../api/client';

const NotificationToast = () => {
  const knownIds = useRef(new Set());

  const fetchAndShowNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications/latest');
      const latest = response.data;

      latest.forEach(notif => {
        if (!knownIds.current.has(notif.id)) {
          // Show toast for new notifications
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full glass-card border-none pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5 font-bold text-rose-500">
                    {notif.type === 'security' ? <HiOutlineShieldExclamation className="h-6 w-6" /> : <HiOutlineCash className="h-6 w-6 text-amber-500" />}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-navy-dark">
                      {notif.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-slate-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-bold text-primary hover:text-primary-dark focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          ), { duration: 5000, id: notif.id });
          
          knownIds.current.add(notif.id);
        }
      });
    } catch (error) {
      console.error('Failed to poll notifications');
    }
  };

  useEffect(() => {
    // Poll every 10 seconds for real-time feel
    const interval = setInterval(fetchAndShowNotifications, 10000);
    fetchAndShowNotifications(); // Initial check
    return () => clearInterval(interval);
  }, []);

  return null; // This component stays invisible, only manages toasts
};

export default NotificationToast;
