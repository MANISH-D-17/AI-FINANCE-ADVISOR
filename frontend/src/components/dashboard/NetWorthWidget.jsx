import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { HiOutlineShieldCheck, HiOutlineTrendingDown, HiOutlineTrendingUp } from 'react-icons/hi';

const NetWorthWidget = ({ summary, trends, loading }) => {
  if (loading) return (
    <div className="glass-card animate-pulse h-48 flex items-center justify-center">
      <div className="h-4 w-24 bg-slate-200 rounded-full"></div>
    </div>
  );

  const netWorth = summary?.net_worth || 0;
  const assets = summary?.total_assets || 0;
  const liabilities = summary?.total_liabilities || 0;

  // Calculate change from last month if available
  const lastMonthValue = trends?.length > 1 ? trends[trends.length - 2].value : netWorth;
  const percentChange = lastMonthValue && lastMonthValue !== 0 
    ? (((netWorth - lastMonthValue) / lastMonthValue) * 100).toFixed(1)
    : 0;

  const runwayLabel = summary?.runway_days !== undefined && summary?.runway_days !== null
    ? `${summary.runway_days} Days`
    : 'Calculating...';

  return (
    <div className="glass-card bento-item-large overflow-hidden group">
      <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <HiOutlineShieldCheck className="w-4 h-4" />
            Consolidated Net Worth
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-navy-dark tracking-tight">
              ₹{Number(netWorth).toLocaleString()}
            </h2>
            <div className={`flex items-center gap-1 mt-2 text-sm font-bold ${Number(percentChange) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {Number(percentChange) >= 0 ? <HiOutlineTrendingUp /> : <HiOutlineTrendingDown />}
              {Math.abs(percentChange)}% this month
            </div>
          </div>
          
          <div className="flex gap-6 pt-2">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Assets</p>
              <p className="text-sm font-bold text-navy-light mt-0.5">₹{Number(assets).toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Liabilities</p>
              <p className="text-sm font-bold text-rose-500 mt-0.5">₹{Number(liabilities).toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Runway</p>
              <p className="text-sm font-bold text-navy-light mt-0.5">
                {runwayLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="h-32 w-full md:w-64 -mb-6 md:-mr-6 opacity-80 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontSize: '10px', color: '#64748b' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Abstract Background Element */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
    </div>
  );
};

export default NetWorthWidget;
