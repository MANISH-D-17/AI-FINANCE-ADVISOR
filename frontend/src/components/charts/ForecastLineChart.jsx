import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, ComposedChart 
} from 'recharts';

const ForecastLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400 italic">
        Insufficient data for forecasting
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
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            interval={2}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip 
            formatter={(value) => `₹${value}`}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          {/* Confidence Interval Area */}
          <Area
            type="monotone"
            dataKey="range"
            fill="#6C63FF"
            stroke="none"
            fillOpacity={0.1}
          />
          {/* Forecast Line */}
          <Line 
            type="monotone" 
            dataKey="yhat" 
            name="Forecasted Spend"
            stroke="#6C63FF" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastLineChart;
