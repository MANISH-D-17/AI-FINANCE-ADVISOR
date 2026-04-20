import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async (params = {}) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/expenses', { params });
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (data) => {
    try {
      const response = await apiClient.post('/expenses', data);
      setExpenses([response.data, ...expenses]);
      toast.success('Expense added!');
      return response.data;
    } catch (error) {
      toast.error('Failed to add expense');
      throw error;
    }
  };

  const removeExpense = async (id) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      setExpenses(expenses.filter(e => e.id !== id));
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const updateExpense = async (id, data) => {
    try {
      const response = await apiClient.put(`/expenses/${id}`, data);
      setExpenses(expenses.map(e => (e.id === id ? response.data : e)));
      toast.success('Expense updated');
      return response.data;
    } catch (error) {
      toast.error('Failed to update expense');
      throw error;
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return { expenses, loading, fetchExpenses, addExpense, removeExpense, updateExpense };
};

export const useDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (params = {}) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/summary', { params });
      setSummary(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return { summary, loading, fetchSummary };
};

export const useMLMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/ml/metrics');
      setMetrics(response.data);
    } catch (error) {
      // Don't toast error for metrics as it's secondary
      console.error('Failed to load ML metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return { metrics, loading, fetchMetrics };
};
