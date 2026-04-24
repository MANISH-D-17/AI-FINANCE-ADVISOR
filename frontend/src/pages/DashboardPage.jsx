import React, { useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import StatementImportModal from '../components/expenses/StatementImportModal';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import NetWorthWidget from '../components/dashboard/NetWorthWidget';
import AnomalyAlarmCenter from '../components/dashboard/AnomalyAlarmCenter';
import TaxStrategyWidget from '../components/dashboard/TaxStrategyWidget';
import { useDashboard, useNetWorth } from '../hooks/useFinance';
import { 
  HiOutlineEmojiHappy, 
  HiOutlineUpload, 
  HiOutlineDocumentDownload,
  HiOutlineLightBulb,
  HiOutlineArrowRight,
  HiOutlineCube,
  HiOutlineRefresh
} from 'react-icons/hi';
const VITE_CACHE_BUST = 'v1.1.1'; // Force HMR refresh for new sync endpoints

const DashboardPage = () => {
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const { summary, loading: dashboardLoading, fetchSummary } = useDashboard();
  const { netWorth, trends, loading: netWorthLoading, fetchNetWorth } = useNetWorth();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);

  // Re-fetch everything when filters change or on refresh
  const refreshAll = () => {
    fetchSummary(filters);
    fetchNetWorth();
  };

  React.useEffect(() => {
    fetchSummary(filters);
  }, [filters.month, filters.year]);

  const handleSyncSimulation = async () => {
    setSimLoading(true);
    try {
      await apiClient.post('/simulator/run');
      toast.success('Simulation Started: 50 transactions syncing...', { duration: 4000 });
      // Refresh after a slight delay to show the data appearing
      setTimeout(refreshAll, 3000);
    } catch (error) {
      toast.error('Sync Simulator is offline.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await apiClient.get('/dashboard/export', { 
        params: filters,
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CFO_Report_${filters.month}_${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setExportLoading(false);
    }
  };

  if (dashboardLoading && !summary) {
    return (
      <div className="flex justify-center items-center h-full py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-2">
            <HiOutlineCube className="w-4 h-4" />
            Intelligence Terminal
          </div>
          <h1 className="text-4xl font-extrabold text-navy-dark tracking-tight">
            Finance <span className="text-gradient">Intelligence</span>
          </h1>

          <div className="flex items-center gap-3 mt-3">
            <div className="bg-white/50 backdrop-blur-sm border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
               <select 
                value={filters.month}
                onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
                className="bg-transparent text-sm font-extrabold text-slate-600 outline-none cursor-pointer"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <div className="w-px h-4 bg-slate-300"></div>
              <select 
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                className="bg-transparent text-sm font-extrabold text-slate-600 outline-none cursor-pointer"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleSyncSimulation}
            disabled={simLoading}
            className="px-5 py-2.5 glass-card !p-2.5 flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-widest hover:scale-105"
          >
            {simLoading ? (
               <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-emerald-500"></div>
            ) : (
              <HiOutlineRefresh className="w-4 h-4" />
            )}
            Sync Bank
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="px-5 py-2.5 glass-card !p-2.5 flex items-center gap-2 text-slate-500 font-bold text-sm hover:scale-105"
          >
            {exportLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary"></div>
            ) : (
              <HiOutlineDocumentDownload className="w-5 h-5 text-primary" />
            )}
            Report
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary flex items-center gap-2 group"
          >
            <HiOutlineUpload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            Import Statement
          </button>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Row 1: Key Performance Metrics (Horizontal Row) */}
        {/* 1. Total Income Card */}
        <div className="card border-none bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
          <div className="relative z-10 p-2">
            <p className="text-[10px] uppercase font-bold text-emerald-100 tracking-[0.2em] mb-1">Total Income (Credit)</p>
            <h3 className="text-4xl font-black">₹{Number(summary?.month_income || 0).toLocaleString()}</h3>
            <p className="text-[10px] mt-2 text-emerald-100/80 font-medium">Monthly total inflow</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700"></div>
        </div>

        {/* 2. Total Expense Card */}
        <div className="card border-none bg-rose-500 text-white shadow-xl shadow-rose-500/20 relative overflow-hidden group">
          <div className="relative z-10 p-2">
            <p className="text-[10px] uppercase font-bold text-rose-100 tracking-[0.2em] mb-1">Total Expense (Debit)</p>
            <h3 className="text-4xl font-black">₹{Number(summary?.month_total || 0).toLocaleString()}</h3>
            <p className="text-[10px] mt-2 text-rose-100/80 font-medium">Monthly total outflow</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700"></div>
        </div>

        {/* 3. Monthly Savings Rate Card */}
        <div className="card border-none premium-gradient text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
          <div className="relative z-10 p-2">
            <p className="text-[10px] uppercase font-bold text-primary-light tracking-[0.2em] mb-1">Savings Efficiency</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black">{summary?.savings_rate || 0}%</h3>
              <span className="text-xs font-bold text-primary-light">Rate</span>
            </div>
            <div className="mt-4 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-1000"
                style={{ width: `${Math.min(100, summary?.savings_rate || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Row 2: Category Analysis (Full Width) */}
        <div className="lg:col-span-3 card glass-card border-none">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expense Analysis</p>
              <h3 className="text-2xl font-extrabold text-navy-dark tracking-tight">Category Breakdown</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
              AI Powered
            </div>
          </div>
          <div className="h-[350px]">
             <CategoryPieChart data={summary?.category_breakdown} />
          </div>
        </div>

        {/* Row 3: Anomaly Security Center */}
        <div className="lg:col-span-3">
          <AnomalyAlarmCenter alerts={summary?.alerts} onActionComplete={refreshAll} />
        </div>

        {/* Row 4: Side-by-Side: Tax & AI Strategy */}
        <div className="lg:col-span-1">
           <TaxStrategyWidget />
        </div>

        <div className="lg:col-span-2 card glass-card border-none bg-navy-dark text-white relative overflow-hidden group shadow-2xl shadow-navy-dark/30 flex flex-col justify-center min-h-[220px]">
          <div className="relative z-10 p-4">
            <h3 className="text-xl font-extrabold mb-4 flex items-center gap-2 text-primary">
              <HiOutlineLightBulb className="w-7 h-7 animate-pulse-soft" />
              AI Fortune Strategy
            </h3>
            <p className="text-base text-slate-300 leading-relaxed italic group-hover:text-white transition-colors">
              "{summary?.savings_rate > 30 
                ? "Your financial discipline is world-class. With a " + summary?.savings_rate + "% savings rate, you could potentially retire 4.2 years earlier than previously projected if you reinvest the surplus into high-yield funds." 
                : "Your savings velocity is slightly below the recommended 25% threshold. I've identified potential optimizations in your 'Lifestyle' and 'Subscriptions' categories that could recover ₹2,400 monthly."}"
            </p>
          </div>
          <div className="absolute bottom-0 right-0 -mb-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
        </div>



        {/* Row 4: Budget Adherence */}
        <div className="lg:col-span-3 glass-card border-none shadow-xl shadow-slate-200/40">
          <div className="flex justify-between items-center mb-10">
             <h3 className="text-xl font-extrabold text-navy-dark tracking-tight uppercase tracking-widest text-[10px] font-black text-slate-400">Budget Adherence Matrix</h3>
             <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
               Strategic Management <HiOutlineArrowRight />
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {summary?.budget_progress?.map((budget, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-black text-navy-dark uppercase tracking-tighter">{budget.category}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">₹{Number(budget.spent).toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 rounded-full ${budget.percentage > 100 ? 'bg-rose-500' : 'premium-gradient'}`}
                    style={{ width: `${Math.min(100, budget.percentage)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className={budget.percentage > 100 ? 'text-rose-500' : 'text-primary'}>{budget.percentage}% utilized</span>
                  <span className="text-slate-400">Limit: ₹{Number(budget.limit).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <StatementImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onComplete={refreshAll}
      />
    </div>
  );
};

export default DashboardPage;
