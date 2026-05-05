import React from 'react';
import { motion } from 'framer-motion';

const KpiCard = ({ title, value, subtitle, status, statusColor = 'emerald', dark = false, children }) => {
  const baseClasses = dark 
    ? "glass-card-dark !p-10 flex flex-col justify-between h-full group relative overflow-hidden"
    : "glass-card !p-10 flex flex-col justify-between h-full group hover:border-black/20 transition-all";
  
  const titleClasses = dark ? "text-white/40" : "text-black/40";
  const valueClasses = dark ? "text-white" : "text-black";
  const statusClasses = `text-${statusColor}-600`;
  const dotClasses = `bg-${statusColor}-500`;

  return (
    <div className={baseClasses}>
      <div className="relative z-10">
        <p className={`text-[11px] uppercase font-black tracking-[0.2em] mb-4 ${titleClasses}`}>{title}</p>
        <div className="flex items-baseline gap-3">
          <h3 className={`text-4xl lg:text-5xl font-medium tracking-tight tabular-nums ${valueClasses}`}>{value}</h3>
          {subtitle && <span className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-white/30' : 'text-black/30'}`}>{subtitle}</span>}
        </div>
        {children}
      </div>
      {status && (
        <div className={`mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest relative z-10 ${statusClasses}`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotClasses}`}></div>
          {status}
        </div>
      )}
      {dark && (
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className="w-32 h-32 border-4 border-white rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
