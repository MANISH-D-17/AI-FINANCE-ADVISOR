import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HiOutlineLightBulb, HiOutlineRefresh, HiOutlineInformationCircle } from 'react-icons/hi';

const MLPerformanceCard = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="card h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics || !metrics.f1_scores_json) return null;

  // Convert f1_scores_json object to array for Recharts
  const chartData = Object.entries(metrics.f1_scores_json).map(([cat, f1]) => ({
    category: cat,
    f1: (f1 || 0) * 100 // Scale to 100 for better bar visibility
  }));

  const accuracyPct = ((metrics.accuracy || 0) * 100).toFixed(1);

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-navy-dark flex items-center gap-2">
            ML Performance
            <div className="group relative">
              <HiOutlineInformationCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-3 bg-navy text-white text-[10px] rounded-xl shadow-xl leading-relaxed">
                This model auto-categorizes your expenses. It currently has {accuracyPct}% accuracy based on benchmark tests and learns from your manual corrections.
              </div>
            </div>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Last evaluated: {new Date(metrics.evaluated_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-primary">{accuracyPct}%</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accuracy</div>
        </div>
      </div>

      <div className="h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              dataKey="category" 
              type="category" 
              width={80} 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => [`${value}%`, 'F1 Score']}
            />
            <Bar dataKey="f1" radius={[0, 4, 4, 0]} barSize={12}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.f1 > 80 ? '#0ea5e9' : '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <HiOutlineRefresh className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-0.5">Continuous Learning</p>
          <p className="text-[11px] text-blue-600 leading-tight">The model retrains nightly if you've provided corrections.</p>
        </div>
      </div>
    </div>
  );
};

export default MLPerformanceCard;
