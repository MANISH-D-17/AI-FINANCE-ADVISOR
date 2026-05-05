import React from 'react';
import { 
  AreaChart, 
  Area, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { HiOutlineShieldCheck, HiOutlineTrendingDown, HiOutlineTrendingUp } from 'react-icons/hi';

const NetWorthWidget = ({ summary, trends, loading }) => {
  if (loading) return (
    <div className="glass-card h-48 flex items-center justify-center overflow-hidden">
      <div className="w-full h-full shimmer bg-black/[0.02]"></div>
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
    <div className="glass-card !p-10 overflow-hidden group relative">
      <div className="flex flex-col md:flex-row justify-between gap-10 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-black font-black text-[10px] uppercase tracking-[0.3em]">
            <HiOutlineShieldCheck className="w-5 h-5 text-black/20" />
            Consolidated Equity
          </div>
          <div>
            <h2 className="text-5xl font-medium text-black tracking-halo leading-none">
              ₹{Number(netWorth).toLocaleString()}
            </h2>
            <div className={`flex items-center gap-2 mt-4 text-[11px] font-black uppercase tracking-widest ${Number(percentChange) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {Number(percentChange) >= 0 ? <HiOutlineTrendingUp className="w-4 h-4" /> : <HiOutlineTrendingDown className="w-4 h-4" />}
              {Math.abs(percentChange)}% Dynamic Shift
            </div>
          </div>
          
          <div className="flex flex-wrap gap-8 pt-4">
            <div>
              <p className="text-[10px] uppercase font-black text-black/30 tracking-[0.2em] mb-2">Total Assets</p>
              <p className="text-lg font-medium text-black tracking-tight">₹{Number(assets).toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-black/[0.05] hidden sm:block"></div>
            <div>
              <p className="text-[10px] uppercase font-black text-black/30 tracking-[0.2em] mb-2">Liabilities</p>
              <p className="text-lg font-medium text-black tracking-tight">₹{Number(liabilities).toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-black/[0.05] hidden sm:block"></div>
            <div>
              <p className="text-[10px] uppercase font-black text-black/30 tracking-[0.2em] mb-2">Resilience Runway</p>
              <p className="text-lg font-medium text-black tracking-tight">
                {runwayLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="h-40 w-full md:w-80 -mr-6 opacity-60 group-hover:opacity-100 transition-opacity duration-700">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorValueNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0,0,0,0.05)', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                  padding: '16px 20px'
                }}
                itemStyle={{ color: '#000', fontWeight: 600, fontSize: '14px' }}
                labelStyle={{ color: 'rgba(0,0,0,0.3)', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#000" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValueNW)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Abstract Background Element */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/[0.02] rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000"></div>
    </div>
  );
};

export default NetWorthWidget;
