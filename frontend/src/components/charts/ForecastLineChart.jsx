import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, Line, ComposedChart 
} from 'recharts';

const ForecastLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[450px] flex items-center justify-center text-black/20 font-medium italic">
        Insufficient datasets for temporal projection
      </div>
    );
  }

  // Format data for Recharts: combine forecast with the interval bands
  const chartData = data.map(item => ({
    name: new Date(item.ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    yhat: parseFloat(item.yhat).toFixed(2),
    range: [parseFloat(item.yhat_lower), parseFloat(item.yhat_upper)]
  }));

  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.05}/>
              <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.03)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }}
            interval={2}
            dy={15}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(value) => `₹${value}`}
            dx={-10}
          />
          <Tooltip 
            cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              borderRadius: '24px', 
              border: '1px solid rgba(0,0,0,0.05)', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              padding: '16px 20px'
            }}
            itemStyle={{ color: '#000', fontWeight: 600, fontSize: '14px' }}
            labelStyle={{ color: 'rgba(0,0,0,0.3)', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
            formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Projected Velocity']}
          />
          {/* Confidence Interval Area */}
          <Area
            type="monotone"
            dataKey="range"
            fill="url(#forecastGradient)"
            stroke="none"
          />
          {/* Forecast Line */}
          <Line 
            type="monotone" 
            dataKey="yhat" 
            name="Forecast"
            stroke="#000" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6, fill: '#000', stroke: '#fff', strokeWidth: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastLineChart;
