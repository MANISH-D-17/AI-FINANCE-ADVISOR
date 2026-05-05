import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineLightBulb, HiOutlineSparkles, HiOutlineCheckCircle, HiOutlineAcademicCap } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/ui/AnimatedContainer';

const InsightsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const endpoint = isRefresh ? '/insights/refresh' : '/insights/generate';
      const response = await apiClient({ method: isRefresh ? 'POST' : 'GET', url: endpoint });
      setData(response.data);
      if (isRefresh) toast.success('Intelligence recalibrated');
    } catch (error) {
      toast.error('Strategic analysis failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
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
              Strategic<br/>Intelligence
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Algorithmic observations derived from capital velocity heuristics and cross-market portfolio benchmarks.
            </p>
          </div>
          <button 
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="bg-black text-white px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center gap-3"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Recalibrate Analysis
          </button>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-8">
        {data?.insights?.map((insight, i) => (
          <StaggerItem key={i}>
            <div className="glass-card group hover:border-black/20 transition-all duration-400 !p-10">
              <div className="flex flex-col md:flex-row gap-10">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white shadow-2xl shadow-black/20 group-hover:scale-110 transition-all duration-500 flex-shrink-0">
                  {i === 0 ? <HiOutlineLightBulb className="w-8 h-8" /> : 
                   i === 1 ? <HiOutlineSparkles className="w-8 h-8" /> : 
                   <HiOutlineCheckCircle className="w-8 h-8" />}
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Operational Logic #{i + 1}</p>
                  <p className="text-2xl text-black font-medium leading-relaxed tracking-tight">
                    {insight.content}
                  </p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
        
        {data?.insights?.length === 0 && (
          <FadeIn className="text-center py-32 glass-card border-dashed border-black/10 bg-black/[0.01]">
            <HiOutlineSparkles className="w-16 h-16 text-black/10 mx-auto mb-8" />
            <p className="text-black/30 font-black uppercase tracking-[0.3em] text-[10px]">Insufficient Datasets for Generation</p>
          </FadeIn>
        )}
      </StaggerContainer>

      <FadeIn direction="up">
        <div className="glass-card-dark p-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-2xl flex-shrink-0">
              <HiOutlineAcademicCap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-medium text-white mb-4 tracking-tight leading-tight">Pattern Recognition Protocol</h3>
              <p className="text-white/50 text-lg max-w-2xl font-medium leading-relaxed">
                Systemic tracking of every micro-transaction enables the AI to identify cyclical oscillations and subscription latency, facilitating high-precision capital directives.
              </p>
              <div className="mt-12 flex gap-12">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Confidence Level</span>
                  <span className="text-2xl font-medium text-white tracking-tight">98.4%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Processed Tokens</span>
                  <span className="text-2xl font-medium text-white tracking-tight">12.5k+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default InsightsPage;
