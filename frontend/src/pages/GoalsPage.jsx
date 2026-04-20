import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { HiOutlineFlag, HiOutlinePlus, HiOutlineTrash, HiOutlineChartPie, HiOutlineTrendingUp, HiOutlineLightBulb } from 'react-icons/hi';
import toast from 'react-hot-toast';

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
      toast.success('Goal created!');
      setIsModalOpen(false);
      setNewGoal({ title: '', target_amount: '', category: 'Emergency Fund', deadline: '' });
      fetchGoals();
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  const handleUpdateAmount = async (goalId, current, add) => {
    try {
      await apiClient.put(`/savings/${goalId}`, { current_amount: Number(current) + Number(add) });
      toast.success('Progress updated!');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await apiClient.delete(`/savings/${goalId}`);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Savings Goals</h1>
          <p className="text-gray-500 text-sm">Track your progress towards big financial milestones</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <HiOutlinePlus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map(goal => {
            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <div key={goal.id} className="card group hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <HiOutlineFlag className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-navy-dark">{goal.title}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">{goal.category}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end text-sm">
                    <span className="text-gray-500 font-medium tracking-tight">
                      ₹{Number(goal.current_amount).toLocaleString()} / <span className="text-navy-dark font-bold">₹{Number(goal.target_amount).toLocaleString()}</span>
                    </span>
                    <span className="font-black text-primary">{progress.toFixed(0)}%</span>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  {goal.deadline && (
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                  )}

                  <div className="pt-4 flex gap-2">
                    <button 
                      onClick={() => {
                        const amount = prompt('Enter amount to add:');
                        if (amount && !isNaN(amount)) handleUpdateAmount(goal.id, goal.current_amount, amount);
                      }}
                      className="flex-1 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all"
                    >
                      Add Contribution
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-gray-50 rounded-xl border border-gray-100/50 flex items-start gap-3">
                  <HiOutlineLightBulb className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500 leading-relaxed italic">
                    {progress < 20 ? "Every rupee counts! Set an auto-transfer to reach this faster." : 
                     progress < 50 ? "You're nearly halfway! Consider cutting one 'Dining Out' expense to boost this." :
                     progress < 100 ? "ALMOST THERE! Keep your momentum up, you're doing great." :
                     "GOAL ACHIEVED! Time to celebrate or set a new milestone."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-navy-dark">Create New Goal</h3>
            </div>
            <form onSubmit={handleAddGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Goal Title</label>
                <input 
                  type="text" required className="input-field" placeholder="e.g. Dream House Fund"
                  value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Target (₹)</label>
                  <input 
                    type="number" required className="input-field" placeholder="0.00"
                    value={newGoal.target_amount} onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select 
                    className="input-field"
                    value={newGoal.category} onChange={e => setNewGoal({...newGoal, category: e.target.value})}
                  >
                    {["Emergency Fund", "Travel", "House", "Car", "Education", "Wedding", "Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Target Date (Optional)</label>
                <input 
                  type="date" className="input-field"
                  value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-3">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
