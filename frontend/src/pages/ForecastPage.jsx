import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import ForecastLineChart from '../components/charts/ForecastLineChart';
import { HiOutlineLightBulb, HiOutlineInformationCircle, HiOutlineTrendingUp, HiOutlineLightningBolt } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';

const ForecastPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await apiClient.get('/forecast/monthly');
        setData(response.data);
      } catch (error) {
        console.error('Forecast error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

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
              Predictive<br/>Intelligence
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Systemic capital expenditure projection architecture utilizing neural temporal analysis and seasonal heuristics.
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card !p-10 flex items-center gap-10 group border-black/5 shadow-2xl shadow-black/5"
          >
            <div className="text-right">
              <p className="text-[11px] font-black text-black/30 uppercase tracking-[0.2em] mb-3">Projected Liquidity Req.</p>
              <h3 className="text-5xl font-medium text-black tracking-halo tabular-nums">₹{data?.predicted_monthly_total?.toLocaleString()}</h3>
            </div>
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white shadow-2xl shadow-black/20 group-hover:scale-110 transition-all duration-500">
              <HiOutlineTrendingUp className="w-8 h-8" />
            </div>
          </motion.div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <FadeIn direction="up" className="lg:col-span-2 glass-card !p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center text-black">
                <HiOutlineLightningBolt className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-medium text-black tracking-tight">Cash Flow Trajectory</h3>
            </div>
            <div className="flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Prophet v2 Analysis</span>
            </div>
          </div>
          <div className="h-[450px]">
            <ForecastLineChart data={data?.forecast} />
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-10">
          <StaggerItem>
            <div className="glass-card-dark !p-12 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
              
              <div className="flex items-center gap-5 mb-10 relative z-10">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-xl">
                  <HiOutlineLightBulb className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white tracking-tight">Systemic Observation</h3>
              </div>
              <p className="text-white/80 text-lg leading-relaxed font-medium italic relative z-10">
                "{data?.message}"
              </p>
              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Core Architecture</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                  {data?.is_estimate ? "Heuristic Engine" : "Neural Temporal v4"}
                </span>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="glass-card !p-10 border-l-4 border-black group transition-all">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center text-black shadow-sm flex-shrink-0">
                  <HiOutlineInformationCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-3">Diagnostic Protocol</h4>
                  <p className="text-sm text-black/50 font-medium leading-relaxed">
                    Our neural architecture decomposes systemic spending patterns and seasonal variances to project liquidity requirements using advanced time-series analysis.
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>
          
          <StaggerItem>
            <div className="glass-card !p-10 bg-black/5 border-none">
              <h4 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em] mb-6">Simulation Metadata</h4>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-black/60 font-medium">Training Epochs</span>
                  <span className="text-[11px] font-black text-black uppercase tracking-[0.2em]">90 Cycles</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-black/60 font-medium">Temporal Horizon</span>
                  <span className="text-[11px] font-black text-black uppercase tracking-[0.2em]">30 Cycles</span>
                </div>
                <div className="w-full h-px bg-black/10 mt-2" />
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </div>
  );
};

export default ForecastPage;
