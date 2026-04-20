import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { HiOutlineCurrencyRupee, HiOutlineCheckCircle, HiOutlineChartPie, HiOutlineCalendar, HiOutlineArrowCircleRight } from 'react-icons/hi';
import toast from 'react-hot-toast';

const HealthScorePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState('');
  const [updatingIncome, setUpdatingIncome] = useState(false);

  const fetchScore = async () => {
    try {
      const response = await apiClient.get('/health-score');
      setData(response.data);
      setIncome(response.data.details.income || '');
    } catch (error) {
      console.error('Score fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const handleUpdateIncome = async () => {
    if (!income || isNaN(income)) return;
    setUpdatingIncome(true);
    try {
      await apiClient.put('/health-score/income', { income: parseFloat(income) });
      toast.success('Income updated! Score recalculated.');
      fetchScore();
    } catch (err) {
      toast.error('Failed to update income');
    } finally {
      setUpdatingIncome(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const scoreData = [
    { name: 'Score', value: data.score },
    { name: 'Remaining', value: 100 - data.score }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return '#43D9AD'; // Green
    if (score >= 60) return '#6C63FF'; // Purple
    if (score >= 40) return '#FFB347'; // Orange
    return '#FF6584'; // Red
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy-dark">Your Financial Health</h1>
        <p className="text-gray-500">A data-driven score based on your spending, saving, and budget habits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Gauge Card */}
        <div className="card md:col-span-1 flex flex-col items-center justify-center py-10 relative">
          <div className="text-center">
            <h3 className="font-bold text-navy-dark mb-2">Total Score</h3>
            <div className={`text-4xl font-black mb-1`} style={{ color: getScoreColor(data.score) }}>
              {data.score}/100
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{data.grade}</p>
          </div>
          
          <div className="w-full h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scoreData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  <Cell fill={getScoreColor(data.score)} />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 px-6 text-center text-xs text-gray-400">
            Higher scores indicate healthy saving habits and strong budget adherence.
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Income Update Section */}
          <div className="card bg-primary text-white border-none shadow-lg shadow-primary/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <HiOutlineCurrencyRupee className="w-8 h-8 text-primary-light" />
                <div>
                  <h4 className="font-bold">Estimated Monthly Income</h4>
                  <p className="text-xs text-primary-light">Used to compute your Savings Ratio</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-32 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="0.00"
                />
                <button 
                  onClick={handleUpdateIncome}
                  disabled={updatingIncome}
                  className="bg-white text-primary font-bold px-4 py-2 rounded-lg hover:bg-primary-light hover:text-white transition-all disabled:opacity-50"
                >
                  {updatingIncome ? '...' : <HiOutlineCheckCircle className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComponentCard 
              label="Savings Ratio" 
              score={data.components.savings_ratio} 
              max={40} 
              icon={HiOutlineArrowCircleRight} 
              desc="How much you save vs your income."
            />
            <ComponentCard 
              label="Budget Adherence" 
              score={data.components.budget_adherence} 
              max={30} 
              icon={HiOutlineChartPie} 
              desc="Percentage of categories within limits."
            />
            <ComponentCard 
              label="Spending Variance" 
              score={data.components.spending_variance} 
              max={20} 
              icon={HiOutlineCalendar} 
              desc="Consistency in your weekly spending."
            />
            <ComponentCard 
              label="Consistency" 
              score={data.components.consistency} 
              max={10} 
              icon={HiOutlineCheckCircle} 
              desc="Stability across monthly categories."
            />
          </div>
        </div>
      </div>
      
      <div className="card bg-gray-50 border-dashed border-gray-300">
        <h4 className="font-bold text-navy-dark mb-4">How to improve your score?</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">#1 Reduce "Other"</p>
            <p className="text-xs text-gray-500">Categorize your spending accurately to get a better breakdown score.</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">#2 Stay in Budget</p>
            <p className="text-xs text-gray-500">Keeping at least 80% of categories within budget gives a major boost.</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">#3 Stable Income</p>
            <p className="text-xs text-gray-500">Update your estimated income regularly for the most accurate savings ratio.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComponentCard = ({ label, score, max, icon: Icon, desc }) => (
  <div className="card">
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-right">
        <span className="text-lg font-black text-navy-dark">{score}</span>
        <span className="text-xs text-gray-400 font-bold ml-0.5">/{max}</span>
      </div>
    </div>
    <h4 className="font-bold text-sm text-navy-dark mb-1">{label}</h4>
    <p className="text-[10px] text-gray-400 leading-tight">
      {desc}
    </p>
    <div className="w-full h-1.5 bg-gray-50 rounded-full mt-3 overflow-hidden">
      <div 
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${(score / max) * 100}%` }}
      ></div>
    </div>
  </div>
);

export default HealthScorePage;
