import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineLightBulb, HiOutlineSparkles, HiOutlineCheckCircle } from 'react-icons/hi';

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
      if (isRefresh) toast.success('Insights refreshed!');
    } catch (error) {
      toast.error('Failed to generate insights');
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
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">AI Financial Insights</h1>
          <p className="text-gray-500">Personalized observations based on your spending habits</p>
        </div>
        <button 
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-primary font-semibold hover:bg-primary/5 rounded-xl transition-all disabled:opacity-50"
        >
          <HiOutlineRefresh className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh AI
        </button>
      </div>

      <div className="grid gap-6">
        {data?.insights?.map((insight, i) => (
          <div key={i} className="card group hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex gap-5">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 flex-shrink-0">
                {i === 0 ? <HiOutlineLightBulb className="w-6 h-6" /> : 
                 i === 1 ? <HiOutlineSparkles className="w-6 h-6" /> : 
                 <HiOutlineCheckCircle className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Insight #{i + 1}</p>
                <p className="text-lg text-navy-dark font-medium leading-relaxed">
                  {insight.content}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {data?.insights?.length === 0 && (
          <div className="text-center py-20 card bg-gray-50/50 border-dashed">
            <HiOutlineSparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Add more expenses to generate AI insights!</p>
          </div>
        )}
      </div>

      <div className="bg-navy rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Did you know?</h3>
          <p className="text-gray-300 text-sm max-w-lg leading-relaxed">
            Consistently tracking your expenses helps our AI identify seasonal patterns (like subscription renewals or weekend spikes) and gives you better, more accurate saving tips.
          </p>
        </div>
        <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-5%] w-48 h-48 bg-primary/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

export default InsightsPage;
