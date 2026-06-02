import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  HiOutlineRefresh, HiOutlineLightBulb, HiOutlineSparkles,
  HiOutlineCheckCircle, HiOutlineTrendingUp, HiOutlineTrendingDown,
  HiOutlineMinusCircle, HiOutlineCalendar, HiOutlineExclamationCircle
} from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const INSIGHT_ICONS = [HiOutlineLightBulb, HiOutlineSparkles, HiOutlineCheckCircle, HiOutlineExclamationCircle];

const TrendBadge = ({ value }) => {
  if (value === null || value === undefined) return null;
  const up = value > 0;
  const stable = Math.abs(value) <= 2;
  if (stable) return (
    <span className="flex items-center gap-1 text-xs font-bold text-black/40 bg-black/5 px-2.5 py-1 rounded-full">
      <HiOutlineMinusCircle className="w-3.5 h-3.5" /> Stable
    </span>
  );
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${up ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
      {up ? <HiOutlineTrendingUp className="w-3.5 h-3.5" /> : <HiOutlineTrendingDown className="w-3.5 h-3.5" />}
      {up ? '+' : ''}{value}%
    </span>
  );
};

const InsightsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | category name

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const endpoint = isRefresh ? '/insights/refresh' : '/insights/generate';
      const response = await apiClient({ method: isRefresh ? 'POST' : 'GET', url: endpoint });
      setData(response.data);
      if (isRefresh) toast.success('Analysis refreshed with latest data');
    } catch (error) {
      toast.error('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  const comparison = data?.comparison;

  // Build category comparison chart data
  const catChartData = comparison ? Object.keys(comparison.current_cats || {})
    .map(cat => ({
      name: cat,
      current: Math.round(comparison.current_cats[cat]),
      previous: Math.round(comparison.previous_cats?.[cat] || 0),
      change: comparison.previous_cats?.[cat]
        ? Math.round((comparison.current_cats[cat] - comparison.previous_cats[cat]) / comparison.previous_cats[cat] * 100)
        : null,
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 8) : [];

  const totalChange = comparison?.change_pct ?? 0;
  const isSpendingUp = totalChange > 0;
  const isSpendingDown = totalChange < 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-black/5 border-t-black rounded-full animate-spin" />
        <p className="text-sm font-medium text-black/30 uppercase tracking-widest">Analyzing your last 30 days...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">

      {/* Header */}
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-8">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-6">
              Spending<br />Insights
            </h1>
            <div className="flex items-center gap-2 mt-4">
              <HiOutlineCalendar className="w-4 h-4 text-black/30" />
              <p className="text-black/40 text-sm font-semibold uppercase tracking-[0.15em]">
                Current 30 days vs. Previous 30 days
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="bg-black text-white px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl shadow-black/20 flex items-center gap-3 self-start xl:self-auto"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </button>
        </div>
      </FadeIn>

      {/* Period Comparison Summary */}
      {comparison && (
        <FadeIn direction="up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total This Period */}
            <div className="glass-card !p-8 space-y-4">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">
                Last 30 Days Spent
              </p>
              <p className="text-4xl font-medium text-black tracking-tight">
                ₹{comparison.current_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-3">
                <TrendBadge value={totalChange} />
                <span className="text-xs text-black/40 font-medium">vs prior 30 days</span>
              </div>
            </div>

            {/* Previous Period */}
            <div className="glass-card !p-8 space-y-4">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">
                Prior 30 Days Spent
              </p>
              <p className="text-4xl font-medium text-black/50 tracking-tight">
                ₹{comparison.previous_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-black/30 font-medium">31–60 days ago</p>
            </div>

            {/* Top Category */}
            <div className={`glass-card !p-8 space-y-4 ${isSpendingUp ? 'border border-rose-200' : isSpendingDown ? 'border border-emerald-200' : ''}`}>
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">
                Biggest Spend Category
              </p>
              <p className="text-2xl font-bold text-black tracking-tight">
                {comparison.top_category}
              </p>
              <p className="text-sm text-black/50 font-medium">
                ₹{comparison.top_category_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this period
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Weekday vs Weekend Spend */}
      {comparison && (
        <FadeIn direction="up">
          <div className="glass-card !p-8">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-6">
              Weekday vs Weekend Spending Pattern
            </p>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-black/60">Weekdays (Mon–Fri)</span>
                  <span className="text-sm font-bold text-black">
                    ₹{comparison.weekday_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="h-3 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-700"
                    style={{
                      width: `${comparison.weekday_spend + comparison.weekend_spend > 0
                        ? (comparison.weekday_spend / (comparison.weekday_spend + comparison.weekend_spend)) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-black/60">Weekends (Sat–Sun)</span>
                  <span className="text-sm font-bold text-black">
                    ₹{comparison.weekend_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="h-3 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-700"
                    style={{
                      width: `${comparison.weekday_spend + comparison.weekend_spend > 0
                        ? (comparison.weekend_spend / (comparison.weekday_spend + comparison.weekend_spend)) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center min-w-[100px]">
                <p className="text-center text-xs font-black text-black/30 uppercase tracking-widest">
                  {comparison.expense_count} transactions
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Category Comparison Bar Chart */}
      {catChartData.length > 0 && (
        <FadeIn direction="up">
          <div className="glass-card !p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">
                Category Breakdown — Current vs Previous 30 Days
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-black/40">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-black inline-block" /> Current</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-black/20 inline-block" /> Previous</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catChartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }} barGap={4}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.35)', fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '12px 16px' }}
                    formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name === 'current' ? 'Last 30 days' : 'Prior 30 days']}
                    labelStyle={{ fontWeight: 800, fontSize: '11px', color: 'rgba(0,0,0,0.5)', marginBottom: '6px' }}
                  />
                  <Bar dataKey="current" fill="#0A0A0A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="previous" fill="rgba(0,0,0,0.12)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Category Change Table */}
      {catChartData.length > 0 && (
        <FadeIn direction="up">
          <div className="glass-card !p-8">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-6">
              Category Changes vs Prior Period
            </p>
            <div className="space-y-3">
              {catChartData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-black/20 w-5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-semibold text-black text-sm">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-black">₹{cat.current.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-black/30 font-semibold">
                        {cat.previous > 0 ? `prev ₹${cat.previous.toLocaleString('en-IN')}` : 'new category'}
                      </p>
                    </div>
                    <TrendBadge value={cat.change} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* AI Insight Cards */}
      <div>
        <FadeIn>
          <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
            AI-Generated Observations
          </p>
        </FadeIn>
        <StaggerContainer className="grid gap-5">
          {data?.insights?.map((insight, i) => {
            const Icon = INSIGHT_ICONS[i % INSIGHT_ICONS.length];
            return (
              <StaggerItem key={i}>
                <div className="glass-card group hover:border-black/20 transition-all duration-400 !p-8">
                  <div className="flex gap-6 items-start">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all duration-500 flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/25 uppercase tracking-[0.3em] mb-2">
                        Insight {String(i + 1).padStart(2, '0')}
                      </p>
                      <p className="text-base text-black font-medium leading-relaxed">
                        {insight.content}
                      </p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}

          {data?.insights?.length === 0 && (
            <FadeIn className="text-center py-24 glass-card border-dashed border-black/10 bg-black/[0.01]">
              <HiOutlineSparkles className="w-12 h-12 text-black/10 mx-auto mb-6" />
              <p className="text-black/30 font-black uppercase tracking-[0.3em] text-[10px]">Add more transactions to unlock insights</p>
            </FadeIn>
          )}
        </StaggerContainer>
      </div>
    </div>
  );
};

export default InsightsPage;
