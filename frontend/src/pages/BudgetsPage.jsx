import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { HiOutlineSave, HiOutlineTrash, HiOutlineLightBulb } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"];

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/budgets');
      const budgetMap = {};
      response.data.forEach(b => {
        budgetMap[b.category] = b.monthly_limit;
      });
      setBudgets(budgetMap);
    } catch (error) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleUpdate = (cat, val) => {
    setBudgets(prev => ({ ...prev, [cat]: val }));
  };

  const handleSave = async (category) => {
    const limit = budgets[category];
    if (limit === undefined || limit === '') return;

    setSaving(true);
    try {
      await apiClient.post('/budgets', {
        category,
        monthly_limit: parseFloat(limit)
      });
      toast.success(`${category} threshold updated`);
    } catch (error) {
      toast.error('Threshold update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    try {
      await apiClient.delete(`/budgets/${category}`);
      setBudgets(prev => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      toast.success(`${category} threshold removed`);
    } catch (error) {
      toast.error('Removal failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-12 h-12 border-4 border-black/5 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-24">
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-20">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Operational<br/>Thresholds
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Define algorithmic constraints and systemic expenditure guardrails to maintain portfolio integrity.
            </p>
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-6">
        {CATEGORIES.map((cat) => (
          <StaggerItem key={cat}>
            <div className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:border-black/20 transition-all duration-400 !p-8">
              <div className="flex items-center gap-8 min-w-[240px]">
                <div className="w-1.5 h-12 rounded-full bg-black shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
                <div>
                  <h3 className="text-xl font-medium text-black tracking-tight">{cat}</h3>
                  <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] mt-1.5">Asset Limit</p>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-4 relative">
                <span className="absolute left-6 text-black/20 font-black text-lg pointer-events-none">₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="input-field flex-1 max-w-[280px] pl-12 h-14 text-xl font-medium text-black !bg-transparent border-black/5 focus:border-black/20 transition-all"
                  value={budgets[cat] || ''}
                  onChange={(e) => handleUpdate(cat, e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleSave(cat)}
                  disabled={saving}
                  className="bg-black text-white px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center gap-3 disabled:opacity-50"
                >
                  <HiOutlineSave className="w-4 h-4" />
                  Sync Threshold
                </button>
                {budgets[cat] !== undefined && (
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-3.5 text-black/20 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-full border border-black/5"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeIn direction="up" className="glass-card !p-12 border-dashed border-black/10 bg-black/[0.01]">
        <div className="flex items-center gap-6 mb-10">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white shadow-xl shadow-black/10">
            <HiOutlineLightBulb className="w-8 h-8" />
          </div>
          <h4 className="text-2xl font-medium text-black tracking-tight">Optimization Protocols</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black uppercase tracking-tight">Priority Sequencing</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Systematically define essential parameters first to establish a resilient operational baseline.</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black uppercase tracking-tight">Data-Driven Thresholds</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Establish realistic constraints based on a 90-day moving average of actual expenditure datasets.</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black uppercase tracking-tight">Predictive Alerting</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">The AI Agent initiates critical directives when any category threshold hits the 80% depletion mark.</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black uppercase tracking-tight">Dynamic Scaling</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">Parameter limits are recalibrated cycles based on evolving portfolio health metrics.</p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default BudgetsPage;
