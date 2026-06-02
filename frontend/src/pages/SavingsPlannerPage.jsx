import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';
import {
  HiOutlineLightBulb, HiOutlineTrendingUp, HiOutlineShieldCheck,
  HiOutlineCurrencyRupee, HiOutlineChartBar, HiOutlineSparkles,
  HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineRefresh,
  HiOutlineBriefcase, HiOutlineUserGroup, HiOutlineBookOpen, HiOutlineChevronRight,
  HiOutlineTrash
} from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative', desc: 'Capital safety first. FDs & debt funds.' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced growth. Mix of equity & debt.' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Maximum growth. Equity-heavy.' },
];

const VERDICT_CONFIG = {
  on_track: { color: 'text-emerald-600 border-emerald-500/20 bg-emerald-50/40', bg: 'bg-emerald-500', icon: HiOutlineCheckCircle, label: 'Wealth Heuristics Optimal (On Track)' },
  needs_attention: { color: 'text-amber-600 border-amber-500/20 bg-amber-50/40', bg: 'bg-amber-500', icon: HiOutlineExclamationCircle, label: 'Capital Velocity Latency (Needs Attention)' },
  critical: { color: 'text-rose-600 border-rose-500/20 bg-rose-50/40', bg: 'bg-rose-500', icon: HiOutlineExclamationCircle, label: 'Systemic Allocation Critical (Critical)' },
};

const ACTION_CONFIG = {
  reduce: { color: 'text-rose-600 bg-rose-50 border-rose-100', label: '↓ Reduce' },
  maintain: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: '✓ Maintain' },
  increase: { color: 'text-blue-600 bg-blue-50 border-blue-100', label: '↑ Increase' },
};

export default function SavingsPlannerPage() {
  const [step, setStep] = useState(1); // 1: input, 2: results
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    income: '',
    risk_tolerance: 'moderate',
    age: '',
    existing_investments: '',
    time_horizon_years: '5',
    use_actual_expenses: true,
    goals: [{ name: '', target_amount: '', deadline_years: '', priority: 'medium' }],
  });

  // Fetch quick snapshot and saved plans on load
  const fetchSavedPlans = async () => {
    try {
      const res = await apiClient.get('/savings-planner/plans');
      setSavedPlans(res.data);
    } catch (err) {
      console.error('Failed to load saved plans', err);
    }
  };

  useEffect(() => {
    apiClient.get('/savings-planner/quick-snapshot')
      .then(res => setSnapshot(res.data))
      .catch(() => {});
    fetchSavedPlans();
  }, []);

  const loadSavedPlan = (savedPlan) => {
    setPlan(savedPlan.plan_data);
    setStep(2);
    toast.success(`Loaded strategy: ${savedPlan.title}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSavedPlan = async (e, planId) => {
    e.stopPropagation(); // Avoid triggering load
    if (!window.confirm('Delete this saved wealth strategy?')) return;
    try {
      await apiClient.delete(`/savings-planner/plans/${planId}`);
      toast.success('Strategy deleted');
      fetchSavedPlans();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const saveCurrentPlan = async () => {
    if (!plan) return;
    const defaultTitle = `Strategy - ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
    const title = prompt('Enter a title for this strategy:', defaultTitle);
    if (!title) return;
    
    setSaving(true);
    try {
      await apiClient.post('/savings-planner/plans', {
        title: title,
        plan_data: plan
      });
      toast.success('Wealth strategy persisted successfully!');
      fetchSavedPlans();
    } catch (err) {
      toast.error('Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGoalChange = (index, field, value) => {
    setForm(prev => {
      const goals = [...prev.goals];
      goals[index] = { ...goals[index], [field]: value };
      return { ...prev, goals };
    });
  };

  const addGoal = () => {
    setForm(prev => ({
      ...prev,
      goals: [...prev.goals, { name: '', target_amount: '', deadline_years: '', priority: 'medium' }],
    }));
  };

  const removeGoal = (index) => {
    setForm(prev => ({
      ...prev,
      goals: prev.goals.filter((_, idx) => idx !== index)
    }));
  };

  const handleGenerate = async () => {
    if (!form.income || !form.age) {
      toast.error('Please enter your income and age to continue.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        income: parseFloat(form.income),
        age: parseInt(form.age),
        risk_tolerance: form.risk_tolerance,
        existing_investments: parseFloat(form.existing_investments || 0),
        time_horizon_years: parseInt(form.time_horizon_years),
        use_actual_expenses: form.use_actual_expenses,
        goals: form.goals
          .filter(g => g.name && g.target_amount)
          .map(g => ({
            name: g.name,
            target_amount: parseFloat(g.target_amount),
            deadline_years: g.deadline_years ? parseInt(g.deadline_years) : null,
            priority: g.priority,
          })),
      };

      const res = await apiClient.post('/savings-planner/generate', payload);
      setPlan(res.data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Plan generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPlanner = () => {
    setStep(1);
    setPlan(null);
  };

  const verdictInfo = plan ? VERDICT_CONFIG[plan.financial_health_verdict] : null;

  return (
    <div className="space-y-16 pb-24">
      {/* Header */}
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-12">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Wealth<br/>Architect
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              AI-powered capital allocation planner. Synergizes automated monthly cashflows, SEBI mutual fund guidelines, and digital gold portfolio hedging heuristics.
            </p>
          </div>

          {/* Quick Snapshot */}
          {snapshot && step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card !p-8 min-w-[320px] border border-black/5 shadow-xl"
            >
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-4">
                Current Month Heuristic
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-black/50">Monthly Surplus</span>
                  <span className="font-medium text-black">₹{snapshot.surplus?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-black/50">Savings Ratio</span>
                  <span className={`font-medium text-sm px-2.5 py-0.5 rounded-full ${snapshot.savings_rate_pct >= 20 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-amber-700 bg-amber-50 border border-amber-100'}`}>
                    {snapshot.savings_rate_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-black/[0.03]">
                  <span className="text-xs font-semibold text-black/40">Suggested SIP</span>
                  <span className="font-semibold text-black text-sm">₹{snapshot.recommended_sip?.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-10"
          >
            {/* Income & Basic Info */}
            <div className="glass-card !p-10 space-y-8">
              <h2 className="text-2xl font-medium text-black tracking-tight">
                Capital Directives Input
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] mb-3">
                    Monthly Post-Tax Income (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field text-xl font-medium"
                    placeholder="e.g. 150000"
                    value={form.income}
                    onChange={e => handleFormChange('income', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] mb-3">
                    Age
                  </label>
                  <input
                    type="number"
                    className="input-field text-xl font-medium"
                    placeholder="e.g. 30"
                    value={form.age}
                    onChange={e => handleFormChange('age', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] mb-3">
                    Existing Liquidity & Investments (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 500000"
                    value={form.existing_investments}
                    onChange={e => handleFormChange('existing_investments', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] mb-3">
                    Target Time Horizon (Years)
                  </label>
                  <select
                    className="input-field font-medium text-black"
                    value={form.time_horizon_years}
                    onChange={e => handleFormChange('time_horizon_years', e.target.value)}
                  >
                    {[1, 2, 3, 5, 7, 10, 15, 20, 25, 30].map(y => (
                      <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div>
                <label className="block text-[10px] font-black text-black/40 uppercase tracking-[0.2em] mb-4">
                  Volatilty Risk Tolerance
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {RISK_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleFormChange('risk_tolerance', opt.value)}
                      className={`p-6 rounded-3xl border-2 text-left transition-all duration-300 ${
                        form.risk_tolerance === opt.value
                          ? 'border-black bg-black text-white'
                          : 'border-black/5 bg-black/[0.01] text-black hover:border-black/20'
                      }`}
                    >
                      <p className="font-semibold mb-1 text-lg">{opt.label}</p>
                      <p className={`text-xs leading-relaxed ${form.risk_tolerance === opt.value ? 'text-white/60' : 'text-black/50'}`}>
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Use actual expenses toggle */}
              <div className="flex items-center gap-4 p-6 bg-black/[0.02] border border-black/5 rounded-3xl">
                <input
                  type="checkbox"
                  id="use_actual"
                  checked={form.use_actual_expenses}
                  onChange={e => handleFormChange('use_actual_expenses', e.target.checked)}
                  className="w-5 h-5 accent-black rounded cursor-pointer"
                />
                <label htmlFor="use_actual" className="text-sm font-medium text-black/70 cursor-pointer select-none">
                  Integrate actual transaction history for categorical expense averages (last 90 days)
                </label>
              </div>
            </div>

            {/* Goals */}
            <div className="glass-card !p-10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-medium text-black tracking-tight">
                  Target Savings Milestones
                </h2>
                <button
                  onClick={addGoal}
                  className="text-[11px] font-black uppercase tracking-[0.2em] text-black border border-black/10 px-6 py-2.5 rounded-full hover:bg-black hover:text-white transition-all duration-300"
                >
                  + Add Milestone
                </button>
              </div>

              <div className="space-y-4">
                {form.goals.map((goal, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-4 p-6 bg-black/[0.02] border border-black/5 rounded-3xl items-center">
                    <div className="flex-1 w-full">
                      <label className="block text-[8px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Milestone Description</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Property Down Payment"
                        value={goal.name}
                        onChange={e => handleGoalChange(i, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <label className="block text-[8px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Target Sum (₹)</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Target ₹"
                        value={goal.target_amount}
                        onChange={e => handleGoalChange(i, 'target_amount', e.target.value)}
                      />
                    </div>
                    <div className="w-full md:w-36">
                      <label className="block text-[8px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Years</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Years"
                        value={goal.deadline_years}
                        onChange={e => handleGoalChange(i, 'deadline_years', e.target.value)}
                      />
                    </div>
                    <div className="w-full md:w-44">
                      <label className="block text-[8px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Priority</label>
                      <select
                        className="input-field font-semibold text-black"
                        value={goal.priority}
                        onChange={e => handleGoalChange(i, 'priority', e.target.value)}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                    {form.goals.length > 1 && (
                      <button
                        onClick={() => removeGoal(i)}
                        className="text-rose-500 hover:text-rose-700 font-medium text-xs pt-6"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-full text-[13px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Synthesizing Portfolio Matrix...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="w-5 h-5 text-amber-300" />
                  Initiate Wealth Plan Architecture
                </>
              )}
            </motion.button>

            {/* Saved Plans Section */}
            {savedPlans.length > 0 && (
              <div className="glass-card !p-10 space-y-6 mt-10">
                <h2 className="text-2xl font-medium text-black tracking-tight">
                  Persisted Wealth Strategies
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedPlans.map(sp => (
                    <div 
                      key={sp.id} 
                      onClick={() => loadSavedPlan(sp)}
                      className="p-6 bg-black/[0.01] border border-black/5 rounded-3xl hover:border-black/25 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h3 className="font-bold text-black text-lg group-hover:text-black leading-snug">{sp.title}</h3>
                          <button
                            onClick={(e) => handleDeleteSavedPlan(e, sp.id)}
                            className="p-2 text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-100 flex-shrink-0"
                            title="Delete strategy"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-4">
                          Saved {new Date(sp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-black/[0.03] mt-2">
                        <span className="text-xs text-black/50 font-medium">Surplus: ₹{sp.plan_data.monthly_surplus?.toLocaleString()}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-black bg-black/5 px-2.5 py-1 rounded-md">Load</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                AI Capital Matrix Active
              </span>
              <div className="flex gap-4">
                <button
                  onClick={saveCurrentPlan}
                  disabled={saving}
                  className="bg-black text-white hover:bg-black/90 border border-black/10 px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <HiOutlineBriefcase className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Strategy'}
                </button>
                <button
                  onClick={resetPlanner}
                  className="bg-black text-white px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all flex items-center gap-3"
                >
                  <HiOutlineRefresh className="w-4 h-4" />
                  Reset Architecture
                </button>
              </div>
            </div>

            {/* Health Verdict Block */}
            {plan && (
              <div className={`p-8 rounded-[2rem] border-2 flex flex-col md:flex-row justify-between items-center gap-8 ${verdictInfo.color}`}>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
                    {React.createElement(verdictInfo.icon, { className: 'w-8 h-8' })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wider text-black">{verdictInfo.label}</h3>
                    <p className="text-sm text-black/60 mt-1">Calculated Savings Ratio: <span className="font-bold">{plan.savings_rate_pct}%</span> of monthly post-tax income.</p>
                  </div>
                </div>
                <div className="flex gap-8 items-center bg-black/5 px-8 py-4 rounded-2xl">
                  <div>
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Monthly Surplus</p>
                    <p className="text-2xl font-bold text-black">₹{plan.monthly_surplus?.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-10 bg-black/10"></div>
                  <div>
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Risk Grade</p>
                    <p className="text-2xl font-bold uppercase text-black">{plan.risk_profile}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Executive Advisor Strategic Assessment */}
            {plan?.executive_advisory && (
              <div className="glass-card-dark !p-12 relative overflow-hidden group border-l-4 border-l-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.08)]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.02] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-amber-400/10 text-amber-300 rounded-full flex items-center justify-center border border-amber-400/20 shadow-lg shadow-amber-400/5">
                        <HiOutlineUserGroup className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white tracking-tight">{plan.executive_advisory.title || "Senior Partner Strategic Advisory"}</h4>
                        <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.2em] mt-1">SEBI-Aligned Wealth Consulting Directive</p>
                      </div>
                    </div>
                    {plan.financial_health_verdict === 'critical' && (
                      <span className="self-start md:self-auto px-5 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-[0.25em]">
                        ⚠ Portfolio Risk Intervention Active
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    <p className="text-xs font-black text-amber-400/40 uppercase tracking-widest">{plan.executive_advisory.greeting || "Dear Client,"}</p>
                    <p className="text-base text-white/80 leading-relaxed font-medium tracking-tight">
                      {plan.executive_advisory.analysis}
                    </p>
                  </div>

                  {plan.executive_advisory.actionable_steps?.length > 0 && (
                    <div className="space-y-4 bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] mb-4">Strategic Realignment Protocols</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plan.executive_advisory.actionable_steps.map((stepText, idx) => (
                          <div key={idx} className="flex gap-4 items-start p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03]">
                            <span className="w-6 h-6 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-sm text-white/70 leading-relaxed font-medium">{stepText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <p className="text-sm font-semibold italic text-white/50">
                      "{plan.executive_advisory.conclusion}"
                    </p>
                    <div className="text-right">
                      <p className="text-xs font-black text-white uppercase tracking-wider">Antigravity Partner Group</p>
                      <p className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest mt-0.5">Senior Wealth Strategy Division</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Insights Section */}
            {plan?.key_insights && (
              <div className="glass-card !p-10 space-y-6">
                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <HiOutlineLightBulb className="w-4 h-4 text-amber-500" />
                  Tactical AI Directives
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plan.key_insights.map((insight, idx) => (
                    <div key={idx} className="p-6 bg-black/[0.01] border border-black/5 rounded-3xl space-y-3 hover:border-black/20 transition-all duration-300">
                      <p className="text-2xl font-bold text-black/20">0{idx + 1}</p>
                      <p className="text-black font-semibold text-base leading-relaxed tracking-tight">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asset Allocation Grid */}
            {plan?.allocation && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                  <HiOutlineBriefcase className="w-4 h-4" />
                  Asset Class Directives
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Emergency Fund Card */}
                  <div className="glass-card !p-8 border border-black/5 space-y-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                          <HiOutlineShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-black text-lg">Emergency Liquidity Pool</h4>
                          <p className="text-xs text-black/40 font-semibold uppercase tracking-wider">{plan.allocation.emergency_fund.priority}</p>
                        </div>
                      </div>
                      <span className="text-rose-600 font-bold bg-rose-50 border border-rose-100 text-xs px-3 py-1 rounded-full">
                        ₹{plan.allocation.emergency_fund.monthly_contribution?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="p-6 bg-black/[0.01] border border-black/5 rounded-2xl grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Target Buffer</span>
                        <p className="font-bold text-black text-lg">₹{plan.allocation.emergency_fund.target?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Time to Complete</span>
                        <p className="font-bold text-black text-lg">{plan.allocation.emergency_fund.months_to_build} Month{plan.allocation.emergency_fund.months_to_build > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Equity SIP Card */}
                  <div className="glass-card !p-8 border border-black/5 space-y-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <HiOutlineTrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-black text-lg">Equity Mutual Funds (SIP)</h4>
                          <p className="text-xs text-black/40 font-semibold leading-relaxed">{plan.allocation.equity_mutual_funds.rationale}</p>
                        </div>
                      </div>
                      <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 text-xs px-3 py-1 rounded-full">
                        ₹{plan.allocation.equity_mutual_funds.monthly_sip?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="space-y-3 pt-2">
                      <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Suggested Mutual Funds (3-Yr avg)</span>
                      <div className="grid grid-cols-1 gap-2">
                        {plan.allocation.equity_mutual_funds.suggested_funds?.map((fund, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3.5 bg-black/[0.01] border border-black/5 rounded-xl hover:border-black/20 transition-all duration-300">
                            <div>
                              <p className="text-sm font-semibold text-black">{fund.name}</p>
                              <span className="text-[8px] font-black bg-black/5 text-black/40 px-2 py-0.5 rounded uppercase tracking-wider">{fund.type} • {fund.risk} Risk</span>
                            </div>
                            <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full">+{fund.return_3yr}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Guaranteed Return RD/FD Card */}
                  <div className="glass-card !p-8 border border-black/5 space-y-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <HiOutlineCurrencyRupee className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-black text-lg">Fixed Deposits (FD/RD)</h4>
                          <p className="text-xs text-black/40 font-semibold leading-relaxed">{plan.allocation.fixed_deposits.rationale}</p>
                        </div>
                      </div>
                      <span className="text-blue-600 font-bold bg-blue-50 border border-blue-100 text-xs px-3 py-1 rounded-full">
                        ₹{plan.allocation.fixed_deposits.monthly_rd_or_lumpsum?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="p-6 bg-black/[0.01] border border-black/5 rounded-2xl grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Highest Rate Bank</span>
                        <p className="font-bold text-black text-sm">{plan.allocation.fixed_deposits.recommended_bank}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Rate of Interest</span>
                        <p className="font-bold text-emerald-600 text-base">+{plan.allocation.fixed_deposits.best_rate_3yr}% CAGR</p>
                      </div>
                    </div>
                  </div>

                  {/* Digital Gold Hedging Card */}
                  <div className="glass-card !p-8 border border-black/5 space-y-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                          <HiOutlineChartBar className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-black text-lg">Hedge Allocation (Gold/SGB)</h4>
                          <p className="text-xs text-black/40 font-semibold leading-relaxed">{plan.allocation.gold.rationale}</p>
                        </div>
                      </div>
                      <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 text-xs px-3 py-1 rounded-full">
                        ₹{plan.allocation.gold.monthly?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="p-6 bg-black/[0.01] border border-black/5 rounded-2xl grid grid-cols-1 gap-2">
                      <div>
                        <span className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Recommended Form</span>
                        <p className="font-bold text-black text-sm">{plan.allocation.gold.recommended_form}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expense Directives */}
            {plan?.expense_recommendations && (
              <div className="glass-card !p-10 space-y-6">
                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                  <HiOutlineExclamationCircle className="w-4 h-4" />
                  Expense Structural Realignment
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/[0.05]">
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Category</th>
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Current Spend</th>
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Suggested Budget</th>
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Savings Potential</th>
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">% Income</th>
                        <th className="pb-4 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Directive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03]">
                      {plan.expense_recommendations.map((rec, i) => (
                        <tr key={i} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-4 font-semibold text-black text-base">{rec.category}</td>
                          <td className="py-4 font-semibold text-black/50 text-sm">₹{rec.current?.toLocaleString()}</td>
                          <td className="py-4 font-bold text-black text-sm">₹{rec.suggested?.toLocaleString()}</td>
                          <td className={`py-4 font-bold text-sm ${rec.potential_savings > 0 ? 'text-rose-600' : 'text-black/30'}`}>
                            {rec.potential_savings > 0 ? `₹${rec.potential_savings.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-4 text-xs font-semibold text-black/40">{rec.pct_of_income}%</td>
                          <td className="py-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${ACTION_CONFIG[rec.action].color}`}>
                              {ACTION_CONFIG[rec.action].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Goals Feasibility Strategy */}
            {plan?.goal_strategies && plan.goal_strategies.length > 0 && (
              <div className="glass-card !p-10 space-y-6">
                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                  <HiOutlineUserGroup className="w-4 h-4" />
                  Financial Goal Progression timeliners
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.goal_strategies.map((strat, idx) => (
                    <div key={idx} className="p-6 bg-black/[0.01] border border-black/5 rounded-3xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-black text-base">{strat.goal}</h4>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${strat.timeline_achievable ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                          {strat.timeline_achievable ? 'Feasible' : 'Stretch Goal'}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs text-black/50 font-medium">
                          <span>Recommended Allocation</span>
                          <span className="text-black font-semibold">{strat.recommended_instrument}</span>
                        </div>
                        {strat.monthly_required > 0 && (
                          <div className="flex justify-between text-xs text-black/50 font-medium">
                            <span>SIP Required</span>
                            <span className="text-black font-bold">₹{strat.monthly_required?.toLocaleString()}/mo</span>
                          </div>
                        )}
                        <p className="text-xs text-black/60 pt-2 border-t border-black/[0.03] leading-relaxed">
                          <span className="font-black text-black mr-1 flex items-center gap-1">
                            <HiOutlineLightBulb className="w-3.5 h-3.5 text-amber-500 inline" /> Advice:
                          </span> 
                          {strat.tip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tax Optimization Header */}
            {plan?.tax_optimization && (
              <div className="glass-card-dark !p-10 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-lg flex-shrink-0">
                    <HiOutlineBookOpen className="w-8 h-8" />
                  </div>
                  <div className="space-y-4 w-full">
                    <h3 className="text-3xl font-medium text-white tracking-tight">80C/80D/NPS Tax Arbitrage directives</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                      <div>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">80C Headroom Available</span>
                        <p className="text-2xl font-bold text-white">₹{plan.tax_optimization.section_80c_headroom?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Potential Annual Tax Savings</span>
                        <p className="text-2xl font-bold text-emerald-400">₹{plan.tax_optimization.potential_tax_saving?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mt-4">
                      <p className="text-xs text-white/70 leading-relaxed">
                        <span className="text-white font-bold block mb-1">Optimizing Recommendations:</span>
                        {plan.tax_optimization.tip}
                      </p>
                      {plan.tax_optimization.recommended_instruments && (
                        <div className="flex gap-2 flex-wrap mt-3">
                          {plan.tax_optimization.recommended_instruments.map((ins, i) => (
                            <span key={i} className="text-[9px] font-black uppercase bg-white/10 text-white px-3 py-1 rounded-md tracking-wider">{ins}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Behavioral Finance Alerts & warnings */}
            {(plan?.behavioral_nudges || plan?.early_warnings) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plan.behavioral_nudges && (
                  <div className="glass-card !p-8 border border-black/5 space-y-4">
                    <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                      <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
                      Behavioral Capital Pitfalls
                    </h4>
                    <ul className="space-y-3">
                      {plan.behavioral_nudges.map((nudge, idx) => (
                        <li key={idx} className="text-sm font-medium text-black/70 flex gap-3 leading-relaxed">
                          <span className="text-black font-black">•</span>
                          {nudge}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.early_warnings && plan.early_warnings.length > 0 && (
                  <div className="glass-card !p-8 border border-rose-500/10 bg-rose-50/[0.02] space-y-4">
                    <h4 className="text-[10px] font-black text-rose-600/50 uppercase tracking-[0.3em] flex items-center gap-2">
                      <HiOutlineExclamationCircle className="w-4 h-4 text-rose-500" />
                      Early Portfolio Warning Signals
                    </h4>
                    <ul className="space-y-3">
                      {plan.early_warnings.map((warn, idx) => (
                        <li key={idx} className="text-sm font-medium text-rose-700/80 flex gap-3 leading-relaxed">
                          <span className="text-rose-500 font-black">•</span>
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
