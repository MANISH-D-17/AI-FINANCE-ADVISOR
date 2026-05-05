import React, { useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import StatementImportModal from '../components/expenses/StatementImportModal';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import NetWorthWidget from '../components/dashboard/NetWorthWidget';
import AnomalyAlarmCenter from '../components/dashboard/AnomalyAlarmCenter';
import TaxStrategyWidget from '../components/dashboard/TaxStrategyWidget';
import { useDashboard, useNetWorth } from '../hooks/useFinance';
import { StaggerContainer, StaggerItem, FadeIn } from '../components/ui/AnimatedContainer';
import { motion } from 'framer-motion';
import { 
  HiOutlineDocumentDownload,
  HiOutlineRefresh,
  HiOutlineLightBulb,
} from 'react-icons/hi';
import { ArrowRight } from 'lucide-react';
import KpiCard from '../components/ui/KpiCard';

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
      toast.success('Synchronization Initiated', { duration: 4000 });
      setTimeout(refreshAll, 3000);
    } catch (error) {
      toast.error('Sync Engine Offline');
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
      link.setAttribute('download', `Finance_Intelligence_Report_${filters.month}_${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      toast.error('Export Failed');
    } finally {
      setExportLoading(false);
    }
  };

  if (dashboardLoading && !summary) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="h-40 bg-white rounded-2xl shimmer"></div>
        <div className="h-40 bg-white rounded-2xl shimmer"></div>
        <div className="h-40 bg-white rounded-2xl shimmer"></div>
        <div className="lg:col-span-3 h-[500px] bg-white rounded-2xl shimmer"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Premium Header */}
      <FadeIn direction="down" distance={15}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-20">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Wealth<br/>Architecture
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Consolidated intelligence dashboard for multi-horizon capital monitoring and strategic deployment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={handleSyncSimulation}
              disabled={simLoading}
              className="bg-white border border-black/5 text-black px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-xl shadow-black/5 flex items-center gap-3"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${simLoading ? 'animate-spin' : ''}`} />
              Sync Assets
            </button>
            
            <button 
              onClick={handleExportPDF}
              disabled={exportLoading}
              className="bg-white border border-black/5 text-black px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-xl shadow-black/5 flex items-center gap-3"
            >
              <HiOutlineDocumentDownload className={`w-4 h-4 ${exportLoading ? 'animate-spin' : ''}`} />
              Download Report
            </button>

            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-black text-white px-12 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center gap-4 group"
            >
              Import Statement
              <div className="bg-white rounded-full p-1.5 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4 text-black" />
              </div>
            </button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-6 mb-16">
          <div className="bg-white border border-black/5 px-8 py-3 rounded-full flex items-center gap-6 shadow-sm">
             <div className="flex items-center gap-3 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
               Live Context
             </div>
             <div className="w-px h-4 bg-black/10"></div>
             <div className="flex items-center gap-4">
               <select 
                value={filters.month}
                onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
                className="bg-transparent text-[11px] font-black text-black/60 uppercase tracking-[0.2em] outline-none cursor-pointer appearance-none"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select 
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                className="bg-transparent text-[11px] font-black text-black/60 uppercase tracking-[0.2em] outline-none cursor-pointer appearance-none"
              >
                {[2026, 2025, 2024, 2023, 2022].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
             </div>
          </div>
        </div>
      </FadeIn>

      {/* Main Bento Grid */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KPI Cards */}
        <StaggerItem>
          <KpiCard 
            title="Capital Inflow"
            value={`₹${Number(summary?.month_income || 0).toLocaleString()}`}
            status="Live Verification"
          />
        </StaggerItem>

        <StaggerItem>
          <KpiCard 
            title="Capital Outflow"
            value={`₹${Number(summary?.month_total || 0).toLocaleString()}`}
            status="Algorithmic Categorization"
            statusColor="rose"
          />
        </StaggerItem>

        <StaggerItem>
          <KpiCard 
            title="Efficiency Rating"
            value={`${summary?.savings_rate || 0}%`}
            subtitle="Yield Velocity"
            dark={true}
          >
            <div className="mt-8 w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, summary?.savings_rate || 0)}%` }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
          </KpiCard>
        </StaggerItem>

        {/* Category Breakdown */}
        <StaggerItem className="lg:col-span-3">
          <div className="glass-card !p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <p className="text-[11px] font-black text-black/40 uppercase tracking-[0.2em] mb-3">Portfolio Segmentation</p>
                <h3 className="text-3xl font-medium text-black tracking-tight">Expenditure Architecture</h3>
              </div>
              <div className="px-5 py-2 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                Neural Analysis Active
              </div>
            </div>
            <div className="h-[450px]">
               <CategoryPieChart data={summary?.category_breakdown} />
            </div>
          </div>
        </StaggerItem>

        {/* Anomaly Center */}
        <StaggerItem className="lg:col-span-3">
          <div className="glass-card border-none !p-0 overflow-hidden">
            <AnomalyAlarmCenter alerts={summary?.alerts} onActionComplete={refreshAll} />
          </div>
        </StaggerItem>

        {/* AI Insight Card */}
        <StaggerItem className="lg:col-span-2">
          <div className="glass-card-dark !p-12 relative overflow-hidden group min-h-[300px] flex flex-col justify-center">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 text-white/40">
                <HiOutlineLightBulb className="w-8 h-8 text-white group-hover:text-emerald-400 transition-colors" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">AI Observation Protocol</span>
              </div>
              <p className="text-2xl text-white/80 leading-relaxed font-medium tracking-tight">
                "{summary?.savings_rate > 30 
                  ? "Systemic capital retention is optimal. Your current savings velocity permits a 4.2-year acceleration in long-term wealth targets if diverted to high-yield instruments." 
                  : "Savings velocity is operating below the 25% efficiency threshold. Structural optimizations identified in lifestyle overhead could recover ₹2,400 per cycle."}"
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
          </div>
        </StaggerItem>

        <StaggerItem className="lg:col-span-1">
           <TaxStrategyWidget />
        </StaggerItem>

        {/* Budget Adherence */}
        <StaggerItem className="lg:col-span-3">
          <div className="glass-card !p-12">
            <div className="flex justify-between items-center mb-16">
               <h3 className="text-[11px] font-black text-black/40 uppercase tracking-[0.2em]">Operational Thresholds</h3>
               <Link 
                 to="/budgets"
                 className="group flex items-center gap-2 text-[11px] font-black text-black/40 uppercase tracking-[0.2em] hover:text-black transition-all"
               >
                 Manage Limits 
                 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
               </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {summary?.budget_progress?.map((budget, i) => (
                <div key={i} className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-black tracking-tight">{budget.category}</span>
                    <span className="text-[11px] font-black text-black/40 tabular-nums">₹{Number(budget.spent).toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, budget.percentage)}%` }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                      className={`h-full ${budget.percentage > 100 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.2)]'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className={budget.percentage > 100 ? 'text-rose-500' : 'text-black/60'}>{budget.percentage}% Depleted</span>
                    <span className="text-black/30">Target: ₹{Number(budget.limit).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>

      </StaggerContainer>

      <StatementImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onComplete={refreshAll}
      />
    </div>
  );
};

export default DashboardPage;
