import React, { useState } from 'react';
import { HiOutlineShieldExclamation, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineLightBulb } from 'react-icons/hi';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

const AnomalyAlarmCenter = ({ alerts, onActionComplete }) => {
  const [verifying, setVerifying] = useState({});

  if (!alerts || alerts.length === 0) return null;

  const handleVerify = async (alertText) => {
    setVerifying(prev => ({ ...prev, [alertText]: true }));
    try {
      toast.success('Protocol verified and dismissed.');
      if (onActionComplete) onActionComplete();
    } catch (error) {
      toast.error('Verification protocol failed.');
    } finally {
      setVerifying(prev => ({ ...prev, [alertText]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-1">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shadow-xl shadow-black/20">
          <HiOutlineShieldExclamation className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-medium text-black tracking-halo">Security Node</h3>
          <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mt-1">Real-time systemic threat detection</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alerts.map((alert, i) => {
          const isUrgent = alert.includes('🚨');
          const isWin = alert.includes('🏆');
          
          let title = "Systemic Anomaly Detected";
          let icon = <HiOutlineExclamation className="w-6 h-6" />;
          let iconBg = "bg-black text-white";
          
          if (isUrgent) {
            title = "Critical Security Breach";
          } else if (isWin) {
            title = "Intelligence Optimization";
            icon = <HiOutlineCheckCircle className="w-6 h-6" />;
            iconBg = "bg-black text-white";
          }

          return (
            <div key={i} className="bg-white border border-black/5 rounded-[2rem] p-8 flex flex-col justify-between gap-8 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:border-black/10">
              <div className="flex gap-6">
                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${iconBg}`}>
                  {icon}
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-black tracking-tight">{title}</p>
                  <p className="text-[13px] text-black/40 font-medium leading-relaxed">
                    {alert.replace(/🚨 Alert: |🏆 |⚠️ /, '')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-black/[0.03]">
                <div className="flex items-center gap-2 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">
                  <HiOutlineLightBulb className="w-4 h-4 text-black/20" />
                  Node 01: Isolation Forest
                </div>
                <button
                  onClick={() => handleVerify(alert)}
                  disabled={verifying[alert]}
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white px-5 py-2 rounded-full border border-black/5 transition-all duration-300"
                >
                  {verifying[alert] ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-black"></div>
                  ) : (
                    'Verify Protocol'
                  )}
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
