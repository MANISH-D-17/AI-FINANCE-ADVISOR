import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { HiOutlineSave, HiOutlineTrash } from 'react-icons/hi';

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"];

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/budgets');
      const budgetMap = {};
      response.data.forEach(b => {
        budgetMap[b.category] = b.monthly_limit;
      });
      setBudgets(budgetMap);
    } catch (error) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleUpdate = (cat, val) => {
    setBudgets(prev => ({ ...prev, [cat]: val }));
  };

  const handleSave = async (category) => {
    const limit = budgets[category];
    if (limit === undefined || limit === '') return;

    setSaving(true);
    try {
      await apiClient.post('/budgets', {
        category,
        monthly_limit: parseFloat(limit)
      });
      toast.success(`${category} budget updated!`);
    } catch (error) {
      toast.error('Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    try {
      await apiClient.delete(`/budgets/${category}`);
      setBudgets(prev => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      toast.success(`${category} budget removed`);
    } catch (error) {
      toast.error('Failed to remove budget');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy-dark">Budget Management</h1>
        <p className="text-gray-500">Set and manage your monthly spending limits for each category</p>
      </div>

      <div className="grid gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-[150px]">
              <div className={`w-3 h-10 rounded-full ${getCategoryBarColor(cat)}`}></div>
              <div>
                <h3 className="font-bold text-navy-dark">{cat}</h3>
                <p className="text-xs text-gray-400">Monthly Target</p>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <span className="text-gray-400 font-medium">₹</span>
              <input
                type="number"
                placeholder="Set limit"
                className="input-field flex-1 max-w-[200px]"
                value={budgets[cat] || ''}
                onChange={(e) => handleUpdate(cat, e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSave(cat)}
                disabled={saving}
                className="btn-primary py-2 px-4 flex items-center gap-2"
              >
                <HiOutlineSave className="w-5 h-5" />
                Save
              </button>
              {budgets[cat] !== undefined && (
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                >
                  <HiOutlineTrash className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
        <h4 className="text-primary font-bold mb-2">💡 Tips for better budgeting</h4>
        <ul className="text-sm text-navy-dark/70 space-y-2 list-disc list-inside">
          <li>Start with "Bills" and "Other" essentials first.</li>
          <li>Set realistic limits based on your past 3 months' data.</li>
          <li>Your AI advisor will alert you when you reach 80% of any limit.</li>
        </ul>
      </div>
    </div>
  );
};

const getCategoryBarColor = (category) => {
  switch (category) {
    case 'Food': return 'bg-orange-500';
    case 'Travel': return 'bg-blue-500';
    case 'Shopping': return 'bg-purple-500';
    case 'Bills': return 'bg-red-500';
    case 'Entertainment': return 'bg-pink-500';
    case 'Health': return 'bg-teal-500';
    default: return 'bg-gray-500';
  }
};

export default BudgetsPage;
