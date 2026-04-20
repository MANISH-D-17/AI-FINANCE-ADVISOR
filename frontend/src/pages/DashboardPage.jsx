import React, { useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import StatementImportModal from '../components/expenses/StatementImportModal';
import MLPerformanceCard from '../components/dashboard/MLPerformanceCard';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import WeeklyBarChart from '../components/charts/WeeklyBarChart';
import { useDashboard, useMLMetrics } from '../hooks/useFinance';
import { 
  HiOutlineTrendingUp, 
  HiOutlineEmojiHappy, 
  HiOutlineExclamationCircle, 
  HiOutlineUpload, 
  HiOutlineDocumentDownload,
  HiOutlineLightBulb
} from 'react-icons/hi';

const DashboardPage = () => {
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const { summary, loading: dashboardLoading, fetchSummary } = useDashboard();
  const { metrics, loading: metricsLoading } = useMLMetrics();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Re-fetch when filters change
  React.useEffect(() => {
    fetchSummary(filters);
  }, [filters.month, filters.year]);

  // Sync filters if backend returned a different (smarter) month/year
  React.useEffect(() => {
    if (summary?.month && summary?.year) {
      if (summary.month !== filters.month || summary.year !== filters.year) {
        setFilters({ month: summary.month, year: summary.year });
      }
    }
  }, [summary]);

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

  const handlePurgeData = async () => {
    const confirmed = window.confirm(
      "🛡️ CAUTION: Are you sure you want to PERMANENTLY delete all your financial data? \n\nThis will remove all Income, Expenses, and Statements. This action cannot be undone."
    );
    
    if (confirmed) {
      try {
        await apiClient.post('/expenses/purge-data');
        toast.success('System reset! All data cleared.');
        fetchSummary(filters);
      } catch (error) {
        toast.error('Failed to clear data');
      }
    }
  };

  if (dashboardLoading && !summary) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Title and Import */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Financial Overview</h1>
          <div className="flex items-center gap-3 mt-1">
            <select 
              value={filters.month}
              onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
              className="bg-transparent text-sm font-bold text-gray-500 outline-none cursor-pointer hover:text-primary transition-all"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
              className="bg-transparent text-sm font-bold text-gray-500 outline-none cursor-pointer hover:text-primary transition-all"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 self-start md:self-auto">
          <button 
            onClick={handlePurgeData}
            className="px-4 py-2 text-red-500 text-xs font-bold border border-red-100 rounded-lg hover:bg-red-50 transition-all flex items-center gap-2"
          >
            Clear All Data
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            {exportLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-400"></div>
            ) : (
              <HiOutlineDocumentDownload className="w-5 h-5 text-gray-400" />
            )}
            Download PDF
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlineUpload className="w-5 h-5" />
            Import Statement
          </button>
        </div>
      </div>

      {/* Alert Header */}
      {summary?.alerts?.length > 0 && (
        <div className="space-y-2">
          {summary.alerts.map((alert, i) => (
            <div key={i} className={`
              px-4 py-3 rounded-lg border flex items-center gap-3
              ${alert.includes('🚨') 
                ? 'bg-red-50 border-red-100 text-red-700' 
                : 'bg-orange-50 border-orange-100 text-orange-700'}
            `}>
              <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold mt-1 text-navy-dark">₹{Number(summary?.month_total || 0).toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <HiOutlineTrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            Current Month
          </div>
        </div>

        <div className="card border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <h3 className="text-2xl font-bold mt-1 text-navy-dark">₹{Number(summary?.month_income || 0).toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <HiOutlineTrendingUp className="w-6 h-6 transform rotate-180" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            Extracted from Statements
          </div>
        </div>

        <div className="card bg-primary text-white border-none shadow-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-primary-light">Savings Rate</p>
              <h3 className="text-2xl font-bold mt-1">{summary?.savings_rate || 0}%</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <HiOutlineEmojiHappy className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
             Net Savings: ₹{Number(summary?.month_savings || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-lg font-bold mb-6 text-navy-dark">Category Breakdown</h3>
          <CategoryPieChart data={summary?.category_breakdown} />
        </div>
        <div className="card">
          <h3 className="text-lg font-bold mb-6 text-navy-dark">Weekly Spending Patterns</h3>
          <WeeklyBarChart data={summary?.weekly_spend} />
        </div>
      </div>
      
      {/* ML Performance & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MLPerformanceCard metrics={metrics} loading={metricsLoading} />
        <div className="card bg-navy text-white border-none flex flex-col justify-center overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <HiOutlineLightBulb className="text-primary" />
              AI Tip
            </h3>
            <p className="text-sm text-gray-300 italic">
              "You spend 40% of your budget on weekends. Consider planning weekend outings in advance to save more."
            </p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <HiOutlineLightBulb className="w-24 h-24" />
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="card">
        <h3 className="text-lg font-bold mb-6 text-navy-dark">Budget Adherence</h3>
        <div className="space-y-6">
          {summary?.budget_progress?.length === 0 ? (
            <div className="text-center py-4 text-gray-400">No budgets set yet. Go to the Budgets page to start tracking!</div>
          ) : (
            summary?.budget_progress?.map((budget, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-navy-dark">{budget.category}</span>
                  <span className="text-gray-500">₹{Number(budget.spent).toLocaleString()} / ₹{Number(budget.limit).toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${budget.percentage > 100 ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, budget.percentage)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                  <span className={budget.percentage > 100 ? 'text-red-500' : 'text-primary'}>{budget.percentage}% spent</span>
                  <span className="text-gray-400">{budget.limit - budget.spent > 0 ? `₹${(budget.limit - budget.spent).toLocaleString()} left` : 'Over budget'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <StatementImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onComplete={fetchSummary}
      />
    </div>
  );
};

export default DashboardPage;
