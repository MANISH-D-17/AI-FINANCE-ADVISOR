import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import {
  HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineMinusCircle,
  HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineInformationCircle,
  HiOutlineCalendar, HiOutlineLightBulb
} from 'react-icons/hi';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const VERDICT_CONFIG = {
  over_budget: {
    bg: 'bg-rose-50 border border-rose-200',
    icon: HiOutlineExclamationCircle,
    iconColor: 'text-rose-500',
    badge: 'text-rose-700 bg-rose-100',
    label: 'Spending is Increasing',
    tip: 'Your projected spend is higher than the last 30 days. Consider reviewing your biggest categories.',
  },
  on_track: {
    bg: 'bg-emerald-50 border border-emerald-200',
    icon: HiOutlineCheckCircle,
    iconColor: 'text-emerald-500',
    badge: 'text-emerald-700 bg-emerald-100',
    label: 'Spending Looks Stable',
    tip: 'Your projected spend is in line with recent patterns. Keep up the consistent tracking.',
  },
  saving: {
    bg: 'bg-blue-50 border border-blue-200',
    icon: HiOutlineTrendingDown,
    iconColor: 'text-blue-500',
    badge: 'text-blue-700 bg-blue-100',
    label: 'Spending is Trending Down',
    tip: 'Great news — your projected spend is lower than the last 30 days. You\'re on a good path.',
  },
};

const TREND_ICON = {
  rising: { icon: HiOutlineTrendingUp, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Rising' },
  falling: { icon: HiOutlineTrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Falling' },
  stable: { icon: HiOutlineMinusCircle, color: 'text-black/40', bg: 'bg-black/5', label: 'Stable' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-4 min-w-[160px]">
        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-lg font-bold text-black">₹{Number(payload[0]?.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        <p className="text-[10px] font-semibold text-black/40 mt-1">Projected daily spend</p>
        {payload[1] && (
          <p className="text-xs text-black/30 mt-1">
            Range: ₹{Number(payload[1]?.value?.[0] || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} – ₹{Number(payload[1]?.value?.[1] || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const ForecastPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/forecast/monthly');
        setData(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-black/5 border-t-black rounded-full animate-spin" />
      <p className="text-sm font-medium text-black/30 uppercase tracking-widest">Building your 30-day forecast...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <HiOutlineExclamationCircle className="w-12 h-12 text-black/20" />
      <p className="text-black/40 font-semibold">Could not load forecast. Please add more transactions.</p>
    </div>
  );

  const verdict = VERDICT_CONFIG[data?.verdict] || VERDICT_CONFIG.on_track;
  const VerdictIcon = verdict.icon;

  const diff = data?.predicted_monthly_total - data?.actual_last_30_days;
  const diffAbs = Math.abs(diff || 0);
  const isUp = diff > 0;

  // Chart data: combine all forecast points
  const chartData = (data?.forecast || []).map(pt => ({
    name: new Date(pt.ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    yhat: Math.round(pt.yhat),
    range: [Math.round(pt.yhat_lower), Math.round(pt.yhat_upper)],
  }));

  // Average daily for reference line
  const avgDaily = data?.actual_last_30_days ? Math.round(data.actual_last_30_days / 30) : null;

  return (
    <div className="space-y-10 pb-24">

      {/* Header */}
      <FadeIn direction="down" distance={20}>
        <div className="mb-6">
          <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-6">
            30-Day<br />Forecast
          </h1>
          <div className="flex items-center gap-2 mt-4">
            <HiOutlineCalendar className="w-4 h-4 text-black/30" />
            <p className="text-black/40 text-sm font-semibold uppercase tracking-[0.15em]">
              Based on {data?.days_of_data || 0} days of spending history
              {data?.is_estimate && ' · Estimate (limited data)'}
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Verdict Banner */}
      <FadeIn direction="up">
        <div className={`rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6 ${verdict.bg}`}>
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md flex-shrink-0">
            <VerdictIcon className={`w-7 h-7 ${verdict.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-black">{verdict.label}</h2>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${verdict.badge}`}>
                {data?.verdict?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-black/60 font-medium leading-relaxed max-w-xl">{verdict.tip}</p>
          </div>
        </div>
      </FadeIn>

      {/* Key Numbers Row */}
      <FadeIn direction="up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Projected */}
          <div className="glass-card !p-7 space-y-3">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">Projected Next 30 Days</p>
            <p className="text-4xl font-medium text-black tracking-tight">
              ₹{data?.predicted_monthly_total?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-black/40 font-medium">AI-predicted total spend</p>
          </div>

          {/* Actual Last 30 */}
          <div className="glass-card !p-7 space-y-3">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">Actual Last 30 Days</p>
            <p className="text-4xl font-medium text-black/60 tracking-tight">
              ₹{data?.actual_last_30_days?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-black/40 font-medium">What you actually spent</p>
          </div>

          {/* Difference */}
          <div className={`glass-card !p-7 space-y-3 ${diff > 0 ? 'border border-rose-200' : diff < 0 ? 'border border-emerald-200' : ''}`}>
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">Projected Difference</p>
            <p className={`text-4xl font-medium tracking-tight ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isUp ? '+' : '-'}₹{diffAbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-black/40 font-medium">
              {isUp ? 'More than last 30 days' : 'Less than last 30 days'}
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Plain-English Summary */}
      <FadeIn direction="up">
        <div className="glass-card !p-8 flex gap-5 items-start">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <HiOutlineLightBulb className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-2">What This Means</p>
            <p className="text-base font-medium text-black leading-relaxed">{data?.message}</p>
            {avgDaily && (
              <p className="text-sm text-black/40 font-medium mt-2">
                Your average daily spend over the last 30 days was{' '}
                <span className="font-bold text-black">₹{avgDaily.toLocaleString('en-IN')}/day</span>.
              </p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Forecast Chart */}
      <FadeIn direction="up">
        <div className="glass-card !p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-1">Daily Spend Projection</p>
              <p className="text-sm text-black/40 font-medium">Next 30 days — the shaded area shows the confidence range</p>
            </div>
            {!data?.is_estimate && (
              <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Model Active</span>
              </div>
            )}
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.04)" strokeDasharray="0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700 }} interval={4} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(0,0,0,0.3)', fontSize: 10 }} tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} dx={-5} />
                <Tooltip content={<CustomTooltip />} />
                {avgDaily && (
                  <ReferenceLine y={avgDaily} stroke="rgba(0,0,0,0.15)" strokeDasharray="6 4" label={{ value: `Avg: ₹${avgDaily.toLocaleString('en-IN')}`, fill: 'rgba(0,0,0,0.3)', fontSize: 10, fontWeight: 700, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="range" fill="url(#confGrad)" stroke="none" />
                <Line type="monotone" dataKey="yhat" stroke="#0A0A0A" strokeWidth={2.5} dot={false} activeDot={{ r: 6, fill: '#0A0A0A', stroke: '#fff', strokeWidth: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-black/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-black rounded-full" />
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Projected spend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-black/5" />
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Confidence range</span>
            </div>
            {avgDaily && (
              <div className="flex items-center gap-2">
                <div className="w-6 border-t-2 border-dashed border-black/20" />
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Past average</span>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Category Forecast Breakdown */}
      {data?.category_breakdown?.length > 0 && (
        <FadeIn direction="up">
          <div className="glass-card !p-8">
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-6">
              Category Trends — Where Your Money Is Going
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.category_breakdown.map((cat, i) => {
                const trend = TREND_ICON[cat.trend] || TREND_ICON.stable;
                const TIcon = trend.icon;
                return (
                  <div key={i} className="flex items-center justify-between p-5 bg-black/[0.01] border border-black/5 rounded-2xl hover:border-black/15 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${trend.bg}`}>
                        <TIcon className={`w-4 h-4 ${trend.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-black text-sm">{cat.category}</p>
                        <p className="text-[10px] text-black/35 font-semibold uppercase tracking-wider">{trend.label} trend</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black text-sm">₹{cat.avg_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      {cat.change_pct !== 0 && (
                        <p className={`text-xs font-bold ${cat.change_pct > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {cat.change_pct > 0 ? '+' : ''}{cat.change_pct}% vs prior
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* How it works */}
      <FadeIn direction="up">
        <div className="glass-card !p-8 flex gap-5 items-start bg-black/[0.01]">
          <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <HiOutlineInformationCircle className="w-5 h-5 text-black/40" />
          </div>
          <div>
            <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em] mb-2">How This Forecast Works</p>
            <p className="text-sm text-black/50 font-medium leading-relaxed">
              {data?.is_estimate
                ? `This is an estimate based on your average daily spend because we need at least 30 days of transaction data for our AI model. Add more transactions to unlock pattern-based predictions.`
                : `This forecast uses Facebook's Prophet time-series model trained on ${data?.days_of_data} days of your actual spending history. It accounts for day-of-week patterns (e.g. higher weekend spending) to project daily spend. The shaded area on the chart shows the uncertainty range.`}
            </p>
          </div>
        </div>
      </FadeIn>

    </div>
  );
};

export default ForecastPage;
