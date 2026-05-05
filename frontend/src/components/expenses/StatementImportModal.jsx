import React, { useState } from 'react';
import { HiOutlineCloudUpload, HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
      toast.error('Invalid file architecture');
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
        toast.error('No viable transactions detected');
        return;
      }
      setPreviewData(response.data);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Extraction protocol failed');
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
      toast.success('Ledger updated successfully');
      onComplete();
      onClose();
    } catch (error) {
      toast.error('Ledger synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col relative z-10 border border-black/5"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-12 py-10 border-b border-black/[0.03]">
              <div>
                <h3 className="text-3xl font-medium text-black tracking-halo">Statement Intake</h3>
                <p className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em] mt-2">Secure extraction via systemic AI protocols</p>
              </div>
              <button onClick={onClose} className="p-3 text-black/20 hover:bg-black/5 rounded-full transition-all">
                <HiOutlineX className="w-8 h-8" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-center justify-center py-6 space-y-12"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.005 }}
                      className={`
                        w-full max-w-2xl p-16 border border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all cursor-pointer group
                        ${file ? 'border-black bg-black/[0.01]' : 'border-black/10 hover:border-black/30 hover:bg-black/[0.01]'}
                      `}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile?.type === 'text/csv' || droppedFile?.type === 'application/pdf') {
                          setFile(droppedFile);
                        } else {
                          toast.error('Invalid file architecture');
                        }
                      }}
                      onClick={() => document.getElementById('csv-upload').click()}
                    >
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${file ? 'bg-black text-white shadow-2xl' : 'bg-black/5 text-black/20 group-hover:bg-black group-hover:text-white'}`}>
                        <HiOutlineCloudUpload className="w-10 h-10" />
                      </div>
                      <p className="text-center text-black mb-2 text-xl font-medium tracking-tight">
                         {file ? <span className="font-semibold">{file.name}</span> : 'Synchronize temporal bank records'}
                      </p>
                      <p className="text-[10px] text-black/30 font-black uppercase tracking-[0.3em]">Support for PDF and CSV architectures</p>
                      <input
                        type="file"
                        accept=".csv,.pdf"
                        className="hidden"
                        id="csv-upload"
                        onChange={handleFileChange}
                      />
                    </motion.div>

                    {file && file.type === 'application/pdf' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl space-y-4"
                      >
                        <label className="block text-[11px] font-black text-black/30 uppercase tracking-[0.3em] px-1">Decryption Key (Optional)</label>
                        <input
                          type="password"
                          placeholder="Cipher required for encrypted statements"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-field h-14 font-medium text-lg border-black/5 focus:border-black/20 !bg-transparent"
                        />
                      </motion.div>
                    )}

                    <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl mt-4">
                      {['SBI', 'HDFC', 'ICICI', 'Axis', 'Global'].map(bank => (
                        <div key={bank} className="flex items-center gap-3 text-[10px] font-black text-black/30 uppercase tracking-[0.3em] bg-black/[0.02] px-5 py-2.5 rounded-full border border-black/[0.03]">
                          <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                          {bank} Terminal
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <div className="bg-black text-white px-8 py-6 rounded-[2rem] flex items-center justify-between shadow-2xl">
                      <span className="font-medium flex items-center gap-4 text-lg tracking-tight">
                        <HiOutlineCheckCircle className="w-8 h-8 text-white/50" />
                        Extraction Complete
                      </span>
                      <span className="bg-white/10 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                        {previewData.length} Records Detected
                      </span>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-black/[0.02] border border-black/5 rounded-[2rem] text-sm text-black/50 font-medium">
                      <HiOutlineExclamationCircle className="w-6 h-6 text-black/20" />
                      Algorithmic auto-categorization initialized. Confirm or modify classifications.
                    </div>
                    
                    <div className="overflow-hidden !rounded-[2.5rem] border border-black/5">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-black/[0.02] border-b border-black/[0.03]">
                          <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Mark</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Description</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Velocity</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Amount</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.01]">
                          {previewData.map((row, idx) => (
                            <tr key={idx} className={`${row.type === 'credit' ? 'opacity-30' : 'hover:bg-black/[0.01]'} transition-colors`}>
                              <td className="px-8 py-5 text-black/40 tabular-nums font-medium whitespace-nowrap">{row.date}</td>
                              <td className="px-8 py-5">
                                <span className="font-medium text-black line-clamp-1 max-w-[250px] tracking-tight" title={row.description}>
                                  {row.description}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${row.type === 'debit' ? 'bg-black text-white' : 'bg-black/5 text-black/40'}`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-8 py-5 font-medium text-black tabular-nums tracking-tight text-lg">₹{Number(row.amount).toLocaleString()}</td>
                              <td className="px-8 py-5">
                                <select
                                  value={row.category}
                                  onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                  disabled={row.type === 'credit'}
                                  className="bg-transparent border-none p-0 text-[11px] font-black uppercase tracking-[0.2em] text-black/50 focus:text-black transition-colors cursor-pointer"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-12 py-10 border-t border-black/[0.03] flex justify-between items-center bg-black/[0.01]">
              <button 
                onClick={step === 1 ? onClose : () => setStep(1)}
                className="px-10 py-4 text-black/30 font-black uppercase tracking-[0.3em] text-[11px] hover:text-black transition-all"
              >
                {step === 1 ? 'Abort' : 'Re-upload'}
              </button>
              <button 
                onClick={step === 1 ? handleUpload : handleConfirm}
                disabled={loading || (step === 1 && !file)}
                className="bg-black text-white px-14 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white/50"></div>
                ) : (
                  step === 1 ? 'Extract Data' : 'Commit to Ledger'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StatementImportModal;
