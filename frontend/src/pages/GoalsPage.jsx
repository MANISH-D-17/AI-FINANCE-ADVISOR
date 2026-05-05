import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { HiOutlineFlag, HiOutlinePlus, HiOutlineTrash, HiOutlineChartPie, HiOutlineTrendingUp, HiOutlineLightBulb, HiOutlineX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';
import { ArrowRight } from 'lucide-react';


const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_amount: '', category: 'Emergency Fund', deadline: '' });

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/savings');
      setGoals(res.data);
    } catch (err) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/savings', newGoal);
      toast.success('Strategic goal initialized');
      setIsModalOpen(false);
      setNewGoal({ title: '', target_amount: '', category: 'Emergency Fund', deadline: '' });
      fetchGoals();
    } catch (err) {
      toast.error('Initialization failed');
    }
  };

  const handleUpdateAmount = async (goalId, current, add) => {
    try {
      await apiClient.put(`/savings/${goalId}`, { current_amount: Number(current) + Number(add) });
      toast.success('Capital updated');
      fetchGoals();
    } catch (err) {
      toast.error('Progress update failed');
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Decommission this strategic goal?')) return;
    try {
      await apiClient.delete(`/savings/${goalId}`);
      toast.success('Goal decommissioned');
      fetchGoals();
    } catch (err) {
      toast.error('Decommission failed');
    }
  };

  return (
    <div className="space-y-16 pb-24">
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-20">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Strategic<br/>Milestones
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Tracking multi-horizon capital architecture directives and long-term asset accumulation protocols.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-12 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center gap-4 group"
          >
            Initialize Goal
            <div className="bg-white rounded-full p-1.5 group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4 text-black" />
            </div>
          </button>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-12 h-12 border-4 border-black/5 border-t-black rounded-full animate-spin"></div>
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {goals.map(goal => {
            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <StaggerItem key={goal.id}>
                <div className="glass-card group hover:border-black/20 transition-all duration-400 !p-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white shadow-2xl shadow-black/20">
                      <HiOutlineFlag className="w-7 h-7" />
                    </div>
                    <button 
                      onClick={() => handleDelete(goal.id)}
                      className="p-3 text-black/10 hover:text-rose-500 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-400 border border-transparent hover:border-rose-100"
                    >
                      <HiOutlineTrash className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-10">
                    <h3 className="text-2xl font-medium text-black tracking-tight leading-tight">{goal.title}</h3>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">{goal.category}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                      <span className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Operational</span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-2 px-1">Accumulated</span>
                        <span className="text-xl font-medium text-black tracking-tight tabular-nums">
                          ₹{Number(goal.current_amount).toLocaleString()} <span className="text-black/20 text-sm ml-1">/ ₹{Number(goal.target_amount).toLocaleString()}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-medium text-black tabular-nums tracking-tight">{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                      ></motion.div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      {goal.deadline ? (
                        <div className="text-[10px] text-black/30 font-black uppercase tracking-[0.3em]">
                          Horizon: {new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </div>
                      ) : <div />}
                      
                      <button 
                        onClick={() => {
                          const amount = prompt('Enter capital to inject:');
                          if (amount && !isNaN(amount)) handleUpdateAmount(goal.id, goal.current_amount, amount);
                        }}
                        className="px-8 py-2.5 text-[10px] font-black text-black hover:bg-black hover:text-white rounded-full transition-all duration-400 uppercase tracking-[0.2em] border border-black/10"
                      >
                        Inject Capital
                      </button>
                    </div>
                  </div>

                  <div className="mt-10 p-6 bg-black/[0.02] rounded-[2rem] flex items-start gap-4 border border-black/[0.03]">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                      <HiOutlineLightBulb className="w-5 h-5 text-black" />
                    </div>
                    <p className="text-sm text-black/50 leading-relaxed font-medium">
                      {progress < 20 ? "Analysis suggests automating recurring intake to accelerate this milestone." : 
                       progress < 50 ? "Portfolio indicators suggest a 12% faster completion by optimizing discretionary velocity." :
                       progress < 100 ? "Momentum is critical. Current projection remains stable within the 90th percentile." :
                       "Strategic target achieved. Surplus capital can now be redirected to secondary architectures."}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden relative z-10 border border-black/5"
            >
              <div className="flex justify-between items-center px-12 py-10 border-b border-black/[0.03]">
                <h3 className="text-3xl font-medium text-black tracking-halo">Initialize Directive</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 text-black/20 hover:bg-black/5 rounded-full transition-all"
                >
                  <HiOutlineX className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleAddGoal} className="px-12 py-12 space-y-10">
                <div className="space-y-4">
                  <label className="block text-[11px] font-black text-black/30 uppercase tracking-[0.3em] px-1">Goal Designation</label>
                  <input 
                    type="text" required className="input-field h-14 font-medium text-lg border-black/5 focus:border-black/20 transition-all !bg-transparent" placeholder="e.g. Dream House Fund"
                    value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[11px] font-black text-black/30 uppercase tracking-[0.3em] px-1">Capital Target (₹)</label>
                    <input 
                      type="number" required className="input-field h-14 font-medium text-lg border-black/5 focus:border-black/20 transition-all !bg-transparent" placeholder="0.00"
                      value={newGoal.target_amount} onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[11px] font-black text-black/30 uppercase tracking-[0.3em] px-1">Classification</label>
                    <select 
                      className="input-field h-14 font-medium text-lg border-black/5 focus:border-black/20 transition-all !bg-transparent cursor-pointer"
                      value={newGoal.category} onChange={e => setNewGoal({...newGoal, category: e.target.value})}
                    >
                      {["Emergency Fund", "Travel", "House", "Car", "Education", "Wedding", "Other"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-[11px] font-black text-black/30 uppercase tracking-[0.3em] px-1">Target Horizon (Optional)</label>
                  <input 
                    type="date" className="input-field h-14 font-medium text-lg border-black/5 focus:border-black/20 transition-all !bg-transparent cursor-pointer"
                    value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  />
                </div>
                <div className="flex gap-6 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-5 text-[11px] font-black text-black/30 uppercase tracking-[0.3em] hover:bg-black/5 rounded-full transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-5 bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-gray-800 transition-all shadow-2xl shadow-black/20"
                  >
                    Confirm Directive
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsPage;
