import React from 'react';
import { HiOutlineTrash, HiOutlinePencil, HiOutlineExclamation } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem } from '../ui/AnimatedContainer';

const ExpenseTable = ({ expenses, onEdit, onDelete }) => {
  if (expenses.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-32 text-black/20 bg-white rounded-[3rem] border border-dashed border-black/10"
      >
        <div className="w-20 h-20 bg-black/[0.02] rounded-full flex items-center justify-center mb-6">
          <HiOutlineExclamation className="w-10 h-10 text-black/10" />
        </div>
        <p className="text-xl font-medium text-black tracking-tight">No Ledger Entries</p>
        <p className="text-sm font-medium mt-1">Initiate a sync protocol to begin tracking.</p>
      </motion.div>
    );
  }

  return (
    <div className="glass-card !p-0 border-none overflow-hidden !rounded-[2.5rem]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/[0.03]">
              <th className="px-10 py-6 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Temporal Mark</th>
              <th className="px-10 py-6 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Directive Logic</th>
              <th className="px-10 py-6 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Classification</th>
              <th className="px-10 py-6 text-[10px] font-black text-black/30 uppercase tracking-[0.3em] text-right">Capital Velocity</th>
              <th className="px-10 py-6 text-[10px] font-black text-black/30 uppercase tracking-[0.3em] text-right">Operations</th>
            </tr>
          </thead>
          <StaggerContainer component="tbody">
            {expenses.map((expense) => (
              <motion.tr 
                key={expense.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="hover:bg-black/[0.02] transition-colors group border-b border-black/[0.01] last:border-none"
              >
                <td className="px-10 py-6 text-[13px] text-black/40 tabular-nums font-medium whitespace-nowrap">
                  {new Date(expense.date).toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center text-black/20 group-hover:bg-black group-hover:text-white transition-all duration-400 font-black text-xs">
                      {expense.description?.[0] || 'T'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-black line-clamp-1 tracking-tight">{expense.description || '-'}</span>
                      {expense.is_anomaly && (
                        <span className="text-[9px] font-black text-black bg-black/5 px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 w-fit">Systemic Anomaly</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 whitespace-nowrap">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-black/5 text-black group-hover:bg-black group-hover:text-white transition-all duration-400">
                    {expense.category}
                  </span>
                </td>
                <td className="px-10 py-6 text-lg font-medium text-black text-right tabular-nums tracking-tight">
                  ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-10 py-6 text-right whitespace-nowrap">
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-400">
                    <button 
                      onClick={() => onEdit(expense)}
                      className="p-3 text-black/20 hover:text-black hover:bg-black/5 rounded-full transition-all"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="p-3 text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </StaggerContainer>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;
