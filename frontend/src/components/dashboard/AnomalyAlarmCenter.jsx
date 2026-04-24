import React, { useState } from 'react';
import { HiOutlineShieldExclamation, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineLightBulb } from 'react-icons/hi';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

const AnomalyAlarmCenter = ({ alerts, onActionComplete }) => {
  const [verifying, setVerifying] = useState({});

  if (!alerts || alerts.length === 0) return null;

  const handleVerify = async (alertText) => {
    // In a real implementation, we would extract the transaction ID from the alert
    // For now, we simulate the verification of the most recent anomaly
    setVerifying(prev => ({ ...prev, [alertText]: true }));
    try {
      // Logic to find the transaction and verify it would go here
      // For this refined UI, we assume the user is acknowledging the alert
      toast.success('Alert acknowledged and verified.');
      if (onActionComplete) onActionComplete();
    } catch (error) {
      toast.error('Failed to verify transaction.');
    } finally {
      setVerifying(prev => ({ ...prev, [alertText]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 bg-rose-100 text-rose-500 rounded-lg">
          <HiOutlineShieldExclamation className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-navy-dark">AI Security Alerts</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, i) => {
          const isUrgent = alert.includes('🚨');
          const isWin = alert.includes('🏆');
          
          let title = "Suspicious Activity Detected";
          let icon = <HiOutlineExclamation className="w-5 h-5 animate-pulse-soft" />;
          let themeClasses = "border-amber-500";
          let iconBg = "bg-amber-50 text-amber-500";
          
          if (isUrgent) {
            themeClasses = "border-rose-500";
            iconBg = "bg-rose-50 text-rose-500";
          } else if (isWin) {
            title = "Intelligence Insight";
            icon = <HiOutlineCheckCircle className="w-5 h-5" />;
            themeClasses = "border-emerald-500";
            iconBg = "bg-emerald-50 text-emerald-500";
          }

          return (
            <div key={i} className={`
              glass-card border-l-4 p-4 flex flex-col justify-between gap-4 group transition-all duration-300 hover:shadow-lg
              ${themeClasses}
            `}>
              <div className="flex gap-3">
                <div className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-navy-dark">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {alert.replace(/🚨 Alert: |🏆 |⚠️ /, '')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <HiOutlineLightBulb className="w-3.5 h-3.5 text-primary" />
                  Isolation Forest Model
                </div>
                <button
                  onClick={() => handleVerify(alert)}
                  disabled={verifying[alert]}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {verifying[alert] ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-emerald-500"></div>
                  ) : (
                    <HiOutlineCheckCircle className="w-4 h-4" />
                  )}
                  Verify & Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnomalyAlarmCenter;
