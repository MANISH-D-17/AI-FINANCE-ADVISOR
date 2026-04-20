import React from 'react';
import { HiOutlineTrash, HiOutlinePencil, HiOutlineExclamation } from 'react-icons/hi';

const ExpenseTable = ({ expenses, onEdit, onDelete }) => {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
        <p className="text-lg">No expenses found</p>
        <p className="text-sm">Start by adding your first transaction!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                  {new Date(expense.date).toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-navy-dark">
                  <div className="flex items-center gap-2">
                    {expense.description || '-'}
                    {expense.is_anomaly && (
                      <div className="group relative">
                        <span className="flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-600 rounded-full cursor-help">
                          <HiOutlineExclamation className="w-3.5 h-3.5" />
                        </span>
                        <div className="absolute left-6 top-0 hidden group-hover:block z-50 w-48 p-2 bg-navy text-white text-[10px] rounded-lg shadow-xl leading-snug">
                          Unusual transaction detected. Amount is significantly different from your category average.
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    px-2.5 py-1 rounded-full text-xs font-bold
                    ${getCategoryColor(expense.category)}
                  `}>
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy-dark text-right">
                  ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => onEdit(expense)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'Food': return 'bg-orange-100 text-orange-600';
    case 'Travel': return 'bg-blue-100 text-blue-600';
    case 'Shopping': return 'bg-purple-100 text-purple-600';
    case 'Bills': return 'bg-red-100 text-red-600';
    case 'Entertainment': return 'bg-pink-100 text-pink-600';
    case 'Health': return 'bg-teal-100 text-teal-600';
    default: return 'bg-gray-100 text-gray-500';
  }
};

export default ExpenseTable;
