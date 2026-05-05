import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlineShieldExclamation, HiOutlineCash } from 'react-icons/hi';
import apiClient from '../../api/client';

const NotificationToast = () => {
  const knownIds = useRef(new Set());

  const fetchAndShowNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await apiClient.get('/notifications/latest');
      const latest = response.data;

      if (!Array.isArray(latest)) return;

      latest.forEach(notif => {
        if (notif && notif.id && !knownIds.current.has(notif.id)) {
          // Show toast for new notifications
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-sm w-full bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-black/5 pointer-events-auto flex overflow-hidden`}
            >
              <div className="flex-1 w-0 p-5">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    {notif.type === 'security' ? <HiOutlineShieldExclamation className="h-6 w-6 text-black" /> : <HiOutlineCash className="h-6 w-6 text-black/40" />}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-semibold text-black tracking-tight">
                      {notif.title || 'System Notification'}
                    </p>
                    <p className="mt-1 text-[11px] text-black/40 font-medium leading-relaxed">
                      {notif.message || 'Verification protocol complete.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-black/[0.03]">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full px-6 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white transition-all duration-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ), { duration: 5000, id: notif.id });
          
          knownIds.current.add(notif.id);
        }
      });
    } catch (error) {
      // Fail silently for background polling
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchAndShowNotifications, 10000);
    fetchAndShowNotifications();
    return () => clearInterval(interval);
  }, []);

  return null;
};

export default NotificationToast;
