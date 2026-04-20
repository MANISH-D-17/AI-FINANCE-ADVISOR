import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import ForecastLineChart from '../components/charts/ForecastLineChart';
import { HiOutlineLightBulb, HiOutlineInformationCircle } from 'react-icons/hi';

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
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Spending Forecast</h1>
          <p className="text-gray-500">AI-powered 30-day spending prediction engine</p>
        </div>
        
        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expected Spend</p>
            <h3 className="text-2xl font-black text-primary">₹{data?.predicted_monthly_total?.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <HiOutlineTrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-navy-dark">Forecasted Daily Spending</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
              <span className="w-3 h-3 bg-primary/20 rounded-sm"></span> Confidence Range
            </div>
          </div>
          <ForecastLineChart data={data?.forecast} />
        </div>

        <div className="space-y-6">
          <div className="card bg-navy text-white border-none">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <HiOutlineLightBulb className="text-primary-light" />
              AI Observation
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {data?.message}
            </p>
            <div className="mt-6 pt-6 border-t border-white/10 text-xs text-gray-400">
              {data?.is_estimate 
                ? "💡 Showing rule-based estimate due to limited history (< 30 days)." 
                : "⚡ Forecasting currently powered by Facebook Prophet."}
            </div>
          </div>

          <div className="card border-l-4 border-orange-400">
            <div className="flex gap-4">
              <HiOutlineInformationCircle className="w-6 h-6 text-orange-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-navy-dark text-sm mb-1">How it works</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Our engine analyzes your historical spending days and patterns to predict future expenses using time-series forecasting. The shaded area represents our confidence bounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component reused from TopBar for completeness in standalone view
const HiOutlineTrendingUp = (props) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default ForecastPage;
