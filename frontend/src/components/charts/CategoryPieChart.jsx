import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#000000', '#262626', '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

const CategoryPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-black/20 font-medium italic">
        No active spending datasets
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.category,
    value: parseFloat(item.total)
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={95}
            paddingAngle={0}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
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
            formatter={(value) => `₹${value.toLocaleString()}`}
          />
          <Legend 
            iconType="circle" 
            iconSize={8}
            wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.4)' }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryPieChart;
