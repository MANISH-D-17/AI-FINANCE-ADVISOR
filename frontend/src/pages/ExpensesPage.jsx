import React, { useState, useMemo } from 'react';
import { useExpenses } from '../hooks/useFinance';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseTable from '../components/expenses/ExpenseTable';
import { HiOutlineX, HiOutlineTrash } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '../components/ui/AnimatedContainer';
import { ArrowRight } from 'lucide-react';

const ExpensesPage = () => {
  const { expenses, loading, addExpense, removeExpense, updateExpense, purgeExpenses } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredExpenses = useMemo(() => {
    return filter === 'anomalies' 
      ? expenses.filter(e => e.is_anomaly) 
      : expenses;
  }, [expenses, filter]);

  const handleAddClick = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-16 pb-24">
      <FadeIn direction="down" distance={20}>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-20">
          <div>
            <h1 className="text-7xl md:text-9xl font-medium text-black tracking-halo leading-[0.85] mb-8">
              Transaction<br/>Ledger
            </h1>
            <p className="text-black/50 mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed">
              Systemic monitoring of portfolio capital velocity and automated risk assessment protocols.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => {
                if (window.confirm('CRITICAL ACTION: This will permanently delete ALL financial records. Proceed?')) {
                  purgeExpenses();
                }
              }}
              className="px-10 py-4 text-[11px] font-black text-rose-500 border border-black/5 rounded-full hover:bg-rose-50 transition-all flex items-center gap-2 uppercase tracking-[0.2em]"
            >
              <HiOutlineTrash className="w-4 h-4" />
              Purge Data
            </button>
            <button 
              onClick={handleAddClick}
              className="bg-black text-white px-12 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center gap-4 group"
            >
              New Entry
              <div className="bg-white rounded-full p-1.5 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4 text-black" />
              </div>
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="space-y-8">
        <FadeIn direction="up" distance={10} className="flex gap-2 p-1.5 bg-black/[0.03] rounded-full w-fit">
          <button 
            onClick={() => setFilter('all')}
            className={`px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-full transition-all duration-400 ${filter === 'all' ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black'}`}
          >
            All Activity
          </button>
          <button 
            onClick={() => setFilter('anomalies')}
            className={`px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-full transition-all duration-400 flex items-center gap-3 ${filter === 'anomalies' ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black'}`}
          >
            Risk Analysis
            <span className={`px-2.5 py-1 rounded-full text-[10px] ${filter === 'anomalies' ? 'bg-white/20 text-white' : 'bg-black/5 text-black/40'}`}>
              {expenses.filter(e => e.is_anomaly).length}
            </span>
          </button>
        </FadeIn>

        {loading ? (
          <div className="glass-card !p-0 overflow-hidden border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.02)] animate-pulse">
            {/* Skeleton header */}
            <div className="px-8 py-5 border-b border-black/[0.03] flex gap-8 bg-black/[0.01]">
              {['w-16', 'w-40', 'w-24', 'w-20', 'w-20', 'w-24'].map((w, i) => (
                <div key={i} className={`h-2.5 ${w} bg-black/5 rounded-full`} />
              ))}
            </div>
            {/* Skeleton rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-8 py-5 border-b border-black/[0.02] flex gap-8 items-center" style={{ opacity: 1 - i * 0.09 }}>
                <div className="w-20 h-2 bg-black/[0.04] rounded-full" />
                <div className="w-48 h-2 bg-black/[0.04] rounded-full" />
                <div className="w-16 h-5 bg-black/[0.04] rounded-full" />
                <div className="w-24 h-2 bg-black/[0.04] rounded-full" />
                <div className="w-20 h-2 bg-black/[0.04] rounded-full" />
                <div className="ml-auto flex gap-3">
                  <div className="w-8 h-8 bg-black/[0.03] rounded-full" />
                  <div className="w-8 h-8 bg-black/[0.03] rounded-full" />
                </div>
              </div>
            ))}
          </div>

        ) : (
          <FadeIn>
            <div className="glass-card !p-0 overflow-hidden border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
              <ExpenseTable 
                expenses={filteredExpenses} 
                onEdit={handleEditClick} 
                onDelete={removeExpense} 
              />
            </div>
          </FadeIn>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden relative z-10 border border-black/5"
            >
              <div className="flex justify-between items-center px-12 py-10 border-b border-black/[0.03]">
                <h3 className="text-3xl font-medium text-black tracking-halo">
                  {editingExpense ? 'Modify Architecture' : 'New Directive'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-black/20 hover:bg-black/5 p-3 rounded-full transition-all"
                >
                  <HiOutlineX className="w-8 h-8" />
                </button>
              </div>
              <div className="px-12 py-12">
                <ExpenseForm 
                  onSubmit={handleSubmit} 
                  initialData={editingExpense} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpensesPage;
