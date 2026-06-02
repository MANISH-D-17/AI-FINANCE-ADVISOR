import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  HiOutlineRefresh, HiOutlineLightBulb, HiOutlineSparkles,
  HiOutlineCheckCircle, HiOutlineTrendingUp, HiOutlineTrendingDown,
  HiOutlineMinusCircle, HiOutlineCalendar, HiOutlineExclamationCircle,
  HiOutlineInformationCircle, HiOutlineChartBar
} from 'react-icons/hi';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, ReferenceLine, CartesianGrid
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  over_budget: {
    bg: 'bg-rose-50 border border-rose-200',
    dot: 'bg-rose-500',
    icon: HiOutlineExclamationCircle,
    iconColor: 'text-rose-500',
    badge: 'text-rose-700 bg-rose-100',
    label: 'Spending Looks Higher Ahead',
    tip: 'Your projected spend for the next 30 days is higher than the past 30 days. Review your biggest categories below.',
  },
  on_track: {
    bg: 'bg-emerald-50 border border-emerald-200',
    dot: 'bg-emerald-500',
    icon: HiOutlineCheckCircle,
    iconColor: 'text-emerald-500',
    badge: 'text-emerald-700 bg-emerald-100',
    label: 'Spending Is Stable',
    tip: 'Your projected spend is consistent with your recent patterns. Stay the course.',
  },
  saving: {
    bg: 'bg-blue-50 border border-blue-200',
    dot: 'bg-blue-500',
    icon: HiOutlineTrendingDown,
    iconColor: 'text-blue-500',
    badge: 'text-blue-700 bg-blue-100',
    label: 'Spending Is Trending Down',
    tip: "Great news — you're projected to spend less than last month. Keep it up!",
  },
};

const TREND_ICON = {
  rising: { icon: HiOutlineTrendingUp, color: 'text-rose-500', bg: 'bg-rose-50' },
  falling: { icon: HiOutlineTrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stable: { icon: HiOutlineMinusCircle, color: 'text-black/30', bg: 'bg-black/5' },
};

const INSIGHT_ICONS = [HiOutlineLightBulb, HiOutlineSparkles, HiOutlineCheckCircle, HiOutlineExclamationCircle];

const TrendBadge = ({ value }) => {
  if (value === null || value === undefined) return null;
  const stable = Math.abs(value) <= 2;
  if (stable) return (
    <span className="flex items-center gap-1 text-xs font-bold text-black/40 bg-black/5 px-2.5 py-1 rounded-full">
      <HiOutlineMinusCircle className="w-3 h-3" /> Stable
    </span>
  );
  const up = value > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${up ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
      {up ? <HiOutlineTrendingUp className="w-3 h-3" /> : <HiOutlineTrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{value}%
    </span>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-4 min-w-[160px]">
      <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-base font-bold text-black">₹{Number(payload[0]?.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
      <p className="text-[10px] font-semibold text-black/40 mt-0.5">Projected daily spend</p>
    </div>
  );
};

// ─── Section Divider ─────────────────────────────────────────────────────────

const SectionLabel = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-6">
    {Icon && <Icon className="w-4 h-4 text-black/30" />}
    <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">{children}</p>
    <div className="flex-1 h-px bg-black/[0.05]" />
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

const AnalyticsPage = () => {
  const [insights, setInsights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const endpoint = isRefresh ? '/insights/refresh' : '/insights/generate';
      const res = await apiClient({ method: isRefresh ? 'POST' : 'GET', url: endpoint });
      setInsights(res.data);
      if (isRefresh) toast.success('Analysis refreshed');
    } catch {
      toast.error('Failed to load insights');
    } finally {
      setLoadingInsights(false);
      setRefreshing(false);
    }
  };

  const fetchForecast = async () => {
    try {
      const res = await apiClient.get('/forecast/monthly');
      setForecast(res.data);
    } catch {
      // forecast optional
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchForecast();
  }, []);

  const loading = loadingInsights && loadingForecast;
  const comparison = insights?.comparison;
  const verdict = VERDICT_CONFIG[forecast?.verdict] || VERDICT_CONFIG.on_track;
  const VerdictIcon = verdict.icon;

  // Category chart data (current vs previous 30 days)
  const catChartData = comparison
    ? Object.keys(comparison.current_cats || {})
        .map(cat => ({
          name: cat,
          current: Math.round(comparison.current_cats[cat]),
          previous: Math.round(comparison.previous_cats?.[cat] || 0),
          change: comparison.previous_cats?.[cat]
            ? Math.round((comparison.current_cats[cat] - comparison.previous_cats[cat]) / comparison.previous_cats[cat] * 100)
            : null,
        }))
        .sort((a, b) => b.current - a.current)
        .slice(0, 8)
    : [];

  // Forecast chart
  const forecastChartData = (forecast?.forecast || []).map(pt => ({
    name: new Date(pt.ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    yhat: Math.round(pt.yhat),
    range: [Math.round(pt.yhat_lower), Math.round(pt.yhat_upper)],
  }));

  const avgDaily = forecast?.actual_last_30_days ? Math.round(forecast.actual_last_30_days / 30) : null;
  const forecastDiff = forecast ? (forecast.predicted_monthly_total - forecast.actual_last_30_days) : 0;
  const totalChange = comparison?.change_pct ?? 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-black/5 border-t-black rounded-full animate-spin" />
      <p className="text-sm font-medium text-black/30 uppercase tracking-widest">Loading your analytics...</p>
    </div>
  );

  return (
    <div className="space-y-14 pb-24">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-5">
              Analytics
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <HiOutlineCalendar className="w-4 h-4 text-black/30" />
              <p className="text-black/40 text-sm font-semibold uppercase tracking-[0.15em]">
                Last 30 days · AI insights · 30-day forecast
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

      {/* ── Section 1: Spending Summary (Current vs Last 30 days) ──────────── */}
      {comparison && (
        <FadeIn direction="up">
          <SectionLabel icon={HiOutlineChartBar}>Spending — Last 30 Days vs Prior 30 Days</SectionLabel>

          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="glass-card !p-7 space-y-3">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Last 30 Days</p>
              <p className="text-4xl font-medium text-black tracking-tight">
                ₹{comparison.current_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-2">
                <TrendBadge value={totalChange} />
                <span className="text-xs text-black/30 font-medium">vs prior period</span>
              </div>
            </div>

            <div className="glass-card !p-7 space-y-3">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Prior 30 Days</p>
              <p className="text-4xl font-medium text-black/45 tracking-tight">
                ₹{comparison.previous_total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-black/30 font-medium">31 – 60 days ago</p>
            </div>

            <div className="glass-card !p-7 space-y-3">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Top Category</p>
              <p className="text-2xl font-bold text-black tracking-tight">{comparison.top_category}</p>
              <p className="text-xs text-black/40 font-medium">
                ₹{comparison.top_category_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent
              </p>
            </div>
          </div>

          {/* Weekday vs Weekend */}
          <div className="glass-card !p-7 mb-5">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-5">Weekday vs Weekend</p>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-black/50">Weekdays (Mon–Fri)</span>
                  <span className="text-xs font-bold text-black">₹{comparison.weekday_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${comparison.weekday_spend + comparison.weekend_spend > 0 ? (comparison.weekday_spend / (comparison.weekday_spend + comparison.weekend_spend)) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-black/50">Weekends (Sat–Sun)</span>
                  <span className="text-xs font-bold text-black">₹{comparison.weekend_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${comparison.weekday_spend + comparison.weekend_spend > 0 ? (comparison.weekend_spend / (comparison.weekday_spend + comparison.weekend_spend)) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[10px] font-black text-black/25 uppercase tracking-widest">{comparison.expense_count} txns</span>
              </div>
            </div>
          </div>

          {/* Category comparison chart + table side by side */}
          {catChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Bar Chart */}
              <div className="glass-card !p-7">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Category Comparison</p>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-black/30">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-black inline-block" /> Now</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-black/15 inline-block" /> Before</span>
                  </div>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catChartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }} barGap={3}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.25)', fontSize: 9 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '10px 14px' }}
                        formatter={(v, name) => [`₹${Number(v).toLocaleString('en-IN')}`, name === 'current' ? 'Last 30 days' : 'Prior 30 days']}
                        labelStyle={{ fontWeight: 800, fontSize: '10px', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}
                      />
                      <Bar dataKey="current" fill="#0A0A0A" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="previous" fill="rgba(0,0,0,0.12)" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category table */}
              <div className="glass-card !p-7">
                <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-5">Changes vs Prior Period</p>
                <div className="space-y-2.5">
                  {catChartData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-black/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-black text-black/15 w-4">{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-semibold text-black text-sm">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-black">₹{cat.current.toLocaleString('en-IN')}</p>
                          {cat.previous > 0 && <p className="text-[9px] text-black/25 font-semibold">was ₹{cat.previous.toLocaleString('en-IN')}</p>}
                        </div>
                        <TrendBadge value={cat.change} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </FadeIn>
      )}

      {/* ── Section 2: 30-Day Forecast ─────────────────────────────────────── */}
      {forecast && (
        <FadeIn direction="up">
          <SectionLabel icon={HiOutlineTrendingUp}>30-Day Forecast — What's Coming Next</SectionLabel>

          {/* Verdict banner */}
          <div className={`rounded-3xl p-7 flex flex-col md:flex-row items-start md:items-center gap-5 mb-5 ${verdict.bg}`}>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md flex-shrink-0">
              <VerdictIcon className={`w-6 h-6 ${verdict.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-lg font-bold text-black">{verdict.label}</h3>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${verdict.badge}`}>
                  {forecast.verdict?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-black/55 font-medium leading-relaxed">{verdict.tip}</p>
            </div>
          </div>

          {/* Forecast KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="glass-card !p-7 space-y-3">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Projected Next 30 Days</p>
              <p className="text-4xl font-medium text-black tracking-tight">
                ₹{forecast.predicted_monthly_total?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-black/40 font-medium">AI-predicted total</p>
            </div>
            <div className="glass-card !p-7 space-y-3">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Actual Last 30 Days</p>
              <p className="text-4xl font-medium text-black/50 tracking-tight">
                ₹{forecast.actual_last_30_days?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-black/40 font-medium">What you actually spent</p>
            </div>
            <div className={`glass-card !p-7 space-y-3 ${forecastDiff > 0 ? 'border border-rose-200' : forecastDiff < 0 ? 'border border-emerald-200' : ''}`}>
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Projected Difference</p>
              <p className={`text-4xl font-medium tracking-tight ${forecastDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {forecastDiff > 0 ? '+' : ''}₹{Math.abs(forecastDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-black/40 font-medium">{forecastDiff > 0 ? 'More than last period' : 'Less than last period'}</p>
            </div>
          </div>

          {/* Plain summary */}
          <div className="glass-card !p-7 flex gap-5 items-start mb-5">
            <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
              <HiOutlineLightBulb className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-1.5">What This Means</p>
              <p className="text-sm font-medium text-black leading-relaxed">{forecast.message}</p>
              {avgDaily && (
                <p className="text-xs text-black/35 font-medium mt-1.5">
                  Your average daily spend over the past 30 days was <span className="font-bold text-black">₹{avgDaily.toLocaleString('en-IN')}/day</span>.
                </p>
              )}
            </div>
          </div>

          {/* Forecast + category grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Forecast chart */}
            <div className="glass-card !p-7">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Daily Spend Projection</p>
                {!forecast.is_estimate && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">AI Model</span>
                  </div>
                )}
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#000" stopOpacity={0.06} />
                        <stop offset="100%" stopColor="#000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.25)', fontSize: 9, fontWeight: 700 }} interval={4} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.25)', fontSize: 9 }} tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} dx={-5} />
                    <Tooltip content={<ChartTooltip />} />
                    {avgDaily && (
                      <ReferenceLine y={avgDaily} stroke="rgba(0,0,0,0.15)" strokeDasharray="5 4"
                        label={{ value: `Avg ₹${avgDaily.toLocaleString('en-IN')}`, fill: 'rgba(0,0,0,0.25)', fontSize: 9, fontWeight: 700, position: 'insideTopRight' }}
                      />
                    )}
                    <Area type="monotone" dataKey="range" fill="url(#confGrad)" stroke="none" />
                    <Line type="monotone" dataKey="yhat" stroke="#0A0A0A" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#0A0A0A', stroke: '#fff', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-black/[0.04]">
                <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-black rounded-full" /><span className="text-[9px] font-bold text-black/35 uppercase tracking-wider">Projected</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-3 rounded bg-black/5" /><span className="text-[9px] font-bold text-black/35 uppercase tracking-wider">Range</span></div>
                {avgDaily && <div className="flex items-center gap-2"><div className="w-5 border-t-2 border-dashed border-black/20" /><span className="text-[9px] font-bold text-black/35 uppercase tracking-wider">Past avg</span></div>}
              </div>
            </div>

            {/* Category forecast breakdown */}
            {forecast.category_breakdown?.length > 0 && (
              <div className="glass-card !p-7">
                <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-5">Category Trends</p>
                <div className="space-y-3">
                  {forecast.category_breakdown.map((cat, i) => {
                    const trend = TREND_ICON[cat.trend] || TREND_ICON.stable;
                    const TIcon = trend.icon;
                    return (
                      <div key={i} className="flex items-center justify-between p-4 bg-black/[0.01] border border-black/5 rounded-2xl hover:border-black/15 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trend.bg}`}>
                            <TIcon className={`w-4 h-4 ${trend.color}`} />
                          </div>
                          <span className="font-semibold text-black text-sm">{cat.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black text-sm">₹{cat.avg_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                          {cat.change_pct !== 0 && (
                            <p className={`text-[10px] font-bold ${cat.change_pct > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {cat.change_pct > 0 ? '+' : ''}{cat.change_pct}%
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* ── Section 3: AI Insights ─────────────────────────────────────────── */}
      <FadeIn direction="up">
        <SectionLabel icon={HiOutlineSparkles}>AI Observations</SectionLabel>
        <StaggerContainer className="grid gap-4">
          {insights?.insights?.map((insight, i) => {
            const Icon = INSIGHT_ICONS[i % INSIGHT_ICONS.length];
            return (
              <StaggerItem key={i}>
                <div className="glass-card group hover:border-black/20 transition-all duration-300 !p-7">
                  <div className="flex gap-5 items-start">
                    <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.3em] mb-1.5">Observation {String(i + 1).padStart(2, '0')}</p>
                      <p className="text-sm text-black font-medium leading-relaxed">{insight.content}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
          {!insights?.insights?.length && (
            <div className="text-center py-16 glass-card border-dashed border-black/10">
              <HiOutlineSparkles className="w-10 h-10 text-black/10 mx-auto mb-4" />
              <p className="text-black/25 font-black uppercase tracking-[0.3em] text-[10px]">Add more transactions to unlock AI observations</p>
            </div>
          )}
        </StaggerContainer>
      </FadeIn>

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <FadeIn direction="up">
        <div className="glass-card !p-6 flex gap-4 items-start bg-black/[0.01]">
          <HiOutlineInformationCircle className="w-4 h-4 text-black/25 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-black/35 font-medium leading-relaxed">
            {forecast?.is_estimate
              ? `Forecast is an estimate — add at least 30 days of transactions to unlock AI-model predictions.`
              : `Forecast powered by Facebook Prophet trained on ${forecast?.days_of_data || 0} days of your spending history. Insights refresh every 24 hours.`}
          </p>
        </div>
      </FadeIn>

    </div>
  );
};

export default AnalyticsPage;
