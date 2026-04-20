import React, { useState } from 'react';
import { HiOutlineCloudUpload, HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"];

const StatementImportModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.type === 'application/pdf')) {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a valid PDF or CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    try {
      const response = await apiClient.post('/expenses/import-statement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!response.data || response.data.length === 0) {
        toast.error('No transactions found in this statement. Please check the file and password.');
        return;
      }
      setPreviewData(response.data);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse statement');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index, newCategory) => {
    const updated = [...previewData];
    updated[index].category = newCategory;
    setPreviewData(updated);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await apiClient.post('/expenses/import-statement/confirm', {
        transactions: previewData
      });
      toast.success('Transactions imported successfully!');
      onComplete();
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to import transactions';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-navy-dark">Import Bank Statement</h3>
            <p className="text-sm text-gray-500">Secure AI Agent PDF Parsing across all banks.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-navy-dark transition-all">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div 
                className={`
                  w-full max-w-lg p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all
                  ${file ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile?.type === 'text/csv' || droppedFile?.type === 'application/pdf') {
                    setFile(droppedFile);
                  } else {
                    toast.error('Must be a PDF or CSV file');
                  }
                }}
              >
                <HiOutlineCloudUpload className={`w-12 h-12 mb-4 ${file ? 'text-primary' : 'text-gray-400'}`} />
                <p className="text-center text-gray-600 mb-2">
                   {file ? <span className="font-bold text-navy-dark">{file.name}</span> : 'Drag and drop your statement PDF or CSV here'}
                </p>
                <p className="text-xs text-gray-400 mb-6 font-medium uppercase tracking-wider">or click to browse</p>
                <input
                  type="file"
                  accept=".csv,.pdf"
                  className="hidden"
                  id="csv-upload"
                  onChange={handleFileChange}
                />
                <label 
                  htmlFor="csv-upload"
                  className="btn-primary cursor-pointer px-8 py-2.5"
                >
                  Select File
                </label>
              </div>

              {file && file.type === 'application/pdf' && (
                <div className="w-full max-w-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">PDF Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Enter password if statement is encrypted"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">We securely extract data locally. Passwords are never saved.</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-lg mt-8">
                {['SBI', 'HDFC', 'ICICI', 'Axis'].map(bank => (
                  <div key={bank} className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {bank} Optimized
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-800 px-4 py-3 rounded-xl border border-green-100 flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Successfully parsed your statement!
                </span>
                <span className="bg-green-100 px-3 py-1 rounded-lg text-sm font-bold">
                  {previewData.length} Transactions Found
                </span>
              </div>
              <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm text-primary font-medium">
                <HiOutlineExclamationCircle className="w-5 h-5" />
                We've auto-categorized these transactions. Please review them before confirming.
              </div>
              
              <div className="overflow-hidden border border-gray-100 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={row.type === 'credit' ? 'opacity-50 bg-gray-50/50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-3 truncate max-w-[200px]" title={row.description}>
                          {row.description}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">₹{Number(row.amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <select
                            value={row.category}
                            onChange={(e) => handleCategoryChange(idx, e.target.value)}
                            disabled={row.type === 'credit'}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 italic">
                * All transactions (Income & Expenses) will be imported and analyzed by your ML model.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between gap-4">
          <button 
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button 
            onClick={step === 1 ? handleUpload : handleConfirm}
            disabled={loading || (step === 1 && !file)}
            className="btn-primary px-8 py-2 relative flex items-center justify-center min-w-[140px]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white/50"></div>
            ) : (
              step === 1 ? 'Parse Statement' : 'Confirm Import'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatementImportModal;
