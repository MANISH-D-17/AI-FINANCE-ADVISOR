import React, { useState, useEffect } from 'react';
import { HiOutlineLightBulb, HiOutlineCalculator, HiOutlineReceiptTax, HiOutlineExclamationCircle } from 'react-icons/hi';
import apiClient from '../../api/client';

const TaxStrategyWidget = () => {
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTax = async () => {
      try {
        const res = await apiClient.get('/tax/summary');
        setTaxData(res.data);
      } catch (err) {
        console.error('Tax summary fetch failed');
      } finally {
        setLoading(false);
      }
    };
    fetchTax();
  }, []);

  if (loading) return (
    <div className="glass-card animate-pulse h-64 flex items-center justify-center">
      <div className="h-4 w-24 bg-slate-200 rounded-full"></div>
    </div>
  );

  return (
    <div className="glass-card bg-slate-900 text-white border-none overflow-hidden relative group">
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest">
              <HiOutlineCalculator className="w-4 h-4" />
              Tax Strategy Hub ({taxData?.tax_year})
            </div>
            <h3 className="text-xl font-black">Strategic Sensitivity</h3>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <HiOutlineReceiptTax className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Projected Tax</p>
            <p className="text-2xl font-black text-rose-400">₹{Number(taxData?.projected_tax_liability || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Tax Efficiency</p>
            <p className="text-2xl font-black text-emerald-400">{taxData?.deduction_efficiency}%</p>
          </div>
        </div>

        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3">
          <HiOutlineLightBulb className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-primary-light uppercase tracking-widest">Optimization Tip</p>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "Your deduction efficiency is {taxData?.deduction_efficiency < 15 ? 'below average' : 'optimized'}. 
              Consider categorizing more travel and office supplies to potentially reduce liability by ₹{Number((taxData?.taxable_income || 0) * 0.05).toLocaleString()}."
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             <HiOutlineExclamationCircle className="w-3.5 h-3.5" />
             Estimated logic
           </div>
           <button className="text-xs font-bold text-emerald-400 hover:underline">View Projections</button>
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
    </div>
  );
};

export default TaxStrategyWidget;
