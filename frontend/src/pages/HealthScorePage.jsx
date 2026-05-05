import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { HiOutlineCurrencyRupee, HiOutlineCheckCircle, HiOutlineChartPie, HiOutlineCalendar, HiOutlineArrowCircleRight, HiOutlineShieldCheck, HiOutlineTrendingUp, HiOutlineLightBulb } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';

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
      toast.success('Capital baseline updated');
      fetchScore();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingIncome(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-12 h-12 border-4 border-black/5 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  const scoreData = [
    { name: 'Score', value: data.score },
    { name: 'Remaining', value: 100 - data.score }
  ];

  return (
    <div className="space-y-16 pb-24">
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-20">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Resilience<br/>Diagnostic
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Quantifying fiscal integrity through systemic algorithmic analysis and stress-testing capital baseline parameters.
            </p>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Gauge Card */}
        <FadeIn direction="left" className="md:col-span-1">
          <div className="glass-card flex flex-col items-center justify-center py-16 relative overflow-hidden group">
            <div className="text-center relative z-10">
              <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em] mb-6">Integrity Index</h3>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, type: "spring" }}
                className="text-7xl font-medium tracking-tight text-black mb-4" 
              >
                {data.score}
              </motion.div>
              <div className="inline-flex px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-black text-white shadow-xl">
                Rating: {data.grade}
              </div>
            </div>
            
            <div className="w-full h-56 mt-12 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreData}
                    cx="50%"
                    cy="60%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="black" />
                    <Cell fill="rgba(0, 0, 0, 0.05)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-center">
                <HiOutlineShieldCheck className="w-8 h-8 text-black/10" />
              </div>
            </div>
            
            <p className="mt-6 px-12 text-center text-[11px] text-black/30 font-black uppercase tracking-[0.1em] leading-relaxed">
              Optimized for long-term wealth preservation protocols.
            </p>
          </div>
        </FadeIn>

        {/* Breakdown Cards */}
        <div className="md:col-span-2 space-y-10">
          {/* Income Update Section */}
          <FadeIn direction="right">
            <div className="glass-card-dark p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
              
              <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-2xl">
                    <HiOutlineCurrencyRupee className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-medium text-white tracking-tight">Capital Baseline</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-2">Monthly Intake Parameter</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial">
                    <input 
                      type="number" 
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="w-full md:w-44 bg-white/5 border border-white/10 rounded-full px-8 py-4 text-xl font-medium text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-all"
                      placeholder="0.00"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-[10px] uppercase tracking-widest pointer-events-none">INR</span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateIncome}
                    disabled={updatingIncome}
                    className="h-14 w-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl disabled:opacity-50 transition-all"
                  >
                    {updatingIncome ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black"></div>
                    ) : (
                      <HiOutlineCheckCircle className="w-7 h-7" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <ComponentCard 
              label="Capital Retention" 
              score={data.components.savings_ratio} 
              max={40} 
              icon={HiOutlineArrowCircleRight} 
              desc="Optimizing monthly surplus for strategic accumulation."
            />
            <ComponentCard 
              label="Budget Precision" 
              score={data.components.budget_adherence} 
              max={30} 
              icon={HiOutlineChartPie} 
              desc="Systemic adherence to pre-defined allocation limits."
            />
            <ComponentCard 
              label="Volatility Control" 
              score={data.components.spending_variance} 
              max={20} 
              icon={HiOutlineCalendar} 
              desc="Mitigating erratic spikes in discretionary cash flow."
            />
            <ComponentCard 
              label="Pattern Stability" 
              score={data.components.consistency} 
              max={10} 
              icon={HiOutlineTrendingUp} 
              desc="Maintaining cross-category spending equilibrium."
            />
          </StaggerContainer>
        </div>
      </div>
      
      <FadeIn direction="up" className="glass-card !p-12 border-dashed border-black/10 bg-black/[0.01]">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white shadow-xl shadow-black/10">
            <HiOutlineLightBulb className="w-8 h-8" />
          </div>
          <h4 className="text-2xl font-medium text-black tracking-tight">Optimization Protocols</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-sm border border-black/[0.03]">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Strategy #01</p>
            <p className="text-lg font-semibold text-black tracking-tight leading-tight">Refine Segmentation</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Aggressively reduce "Other" designations to enhance data granularity and predictive accuracy.</p>
          </div>
          <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-sm border border-black/[0.03]">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Strategy #02</p>
            <p className="text-lg font-semibold text-black tracking-tight leading-tight">Threshold Discipline</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Maintaining 90%+ budget adherence for 3 consecutive cycles triggers a significant integrity boost.</p>
          </div>
          <div className="space-y-4 p-8 bg-white rounded-[2rem] shadow-sm border border-black/[0.03]">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Strategy #03</p>
            <p className="text-lg font-semibold text-black tracking-tight leading-tight">Income Calibration</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Sync active capital streams bi-weekly to ensure real-time Savings Ratio validity.</p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

const ComponentCard = ({ label, score, max, icon: Icon, desc }) => (
  <StaggerItem>
    <div className="glass-card !p-8 group hover:border-black/20 transition-all duration-400">
      <div className="flex justify-between items-start mb-8">
        <div className="p-4 bg-black/5 rounded-full text-black group-hover:bg-black group-hover:text-white transition-all duration-400">
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <span className="text-3xl font-medium text-black tabular-nums">{score}</span>
          <span className="text-[11px] text-black/20 font-black ml-2 uppercase tracking-widest">/ {max}</span>
        </div>
      </div>
      <h4 className="font-semibold text-base text-black mb-3 uppercase tracking-tight">{label}</h4>
      <p className="text-sm text-black/40 leading-relaxed font-medium">
        {desc}
      </p>
      <div className="w-full h-1 bg-black/5 rounded-full mt-8 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(score / max) * 100}%` }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.2)]"
        ></motion.div>
      </div>
    </div>
  </StaggerItem>
);

export default HealthScorePage;
