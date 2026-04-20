import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"];

const ExpenseForm = ({ onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount,
        category: initialData.category,
        description: initialData.description || '',
        date: initialData.date,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-categorize trigger
    if (name === 'description' && value.length > 3 && formData.category === 'Other') {
      const suggestCategory = async () => {
        try {
          const res = await apiClient.post(`/expenses/categorize?description=${value}`);
          if (res.data.suggested_category !== 'Other') {
            setFormData(prev => ({ ...prev, category: res.data.suggested_category }));
            setSuggestedCategory(res.data.suggested_category);
          }
        } catch (err) {
          // Silent fallback
        }
      };
      
      const timer = setTimeout(suggestCategory, 500);
      return () => clearTimeout(timer);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If user changed the suggested category, send feedback
      if (suggestedCategory && suggestedCategory !== formData.category) {
        apiClient.post('/ml/feedback', {
          description: formData.description,
          suggested_category: suggestedCategory,
          correct_category: formData.category
        }).catch(() => {}); // Silent fail for feedback
      }

      await onSubmit(formData);
      if (!initialData) {
        setFormData({
          amount: '',
          category: 'Other',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        setSuggestedCategory(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          name="amount"
          required
          className="input-field"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
          <select
            name="category"
            className="input-field"
            value={formData.category}
            onChange={handleChange}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            required
            className="input-field"
            value={formData.date}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
        <input
          type="text"
          name="description"
          className="input-field"
          value={formData.description}
          onChange={handleChange}
          placeholder="What did you spend on?"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary mt-2"
      >
        {loading ? 'Processing...' : (initialData ? 'Update Expense' : 'Add Expense')}
      </button>
    </form>
  );
};

export default ExpenseForm;
