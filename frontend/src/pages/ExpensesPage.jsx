import React, { useState } from 'react';
import { useExpenses } from '../hooks/useFinance';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseTable from '../components/expenses/ExpenseTable';
import { HiOutlinePlus, HiOutlineX } from 'react-icons/hi';

const ExpensesPage = () => {
  const { expenses, loading, addExpense, removeExpense, updateExpense } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredExpenses = filter === 'anomalies' 
    ? expenses.filter(e => e.is_anomaly) 
    : expenses;

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Transaction History</h1>
          <p className="text-gray-500">View and manage your daily spending</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="btn-primary flex items-center gap-2"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setFilter('all')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${filter === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          All Transactions
        </button>
        <button 
          onClick={() => setFilter('anomalies')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${filter === 'anomalies' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Anomalies
          <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full">
            {expenses.filter(e => e.is_anomaly).length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <ExpenseTable 
          expenses={filteredExpenses} 
          onEdit={handleEditClick} 
          onDelete={removeExpense} 
        />
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-navy-dark">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-navy-dark p-1 rounded-full hover:bg-gray-100 transition-all"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <ExpenseForm 
                onSubmit={handleSubmit} 
                initialData={editingExpense} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
