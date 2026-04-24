import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  HiOutlineChatAlt2, 
  HiOutlineUser, 
  HiOutlinePaperAirplane, 
  HiOutlineSparkles,
  HiOutlineDatabase,
  HiOutlineSearch,
  HiOutlineChartBar
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reasoningStep, setReasoningStep] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/chat/history');
      if (res.data.length > 0) {
        setMessages(res.data);
      } else {
        setMessages([{ role: 'assistant', content: "Hello! I'm your Elite AI CFO. I've analyzed your multi-account portfolio. How can I assist with your financial strategy today?" }]);
      }
    } catch (err) {
      console.error('Failed to fetch history');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, reasoningStep]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    
    // Simulate agentic reasoning steps
    const steps = [
      { label: "Querying Multi-Account Portfolio", icon: <HiOutlineDatabase /> },
      { label: "Analyzing Transaction Patterns", icon: <HiOutlineSearch /> },
      { label: "Cross-referencing Budgets & Forecasts", icon: <HiOutlineChartBar /> },
      { label: "Finalizing Financial Advice", icon: <HiOutlineSparkles /> }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setReasoningStep(steps[currentStep]);
      currentStep++;
      if (currentStep >= steps.length) clearInterval(interval);
    }, 1500);

    try {
      const response = await apiClient.post('/chat', {
        messages: [{ role: 'user', content: input }] 
      });
      // Small delay to let the reasoning feel real
      setTimeout(() => {
        setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
        setLoading(false);
        setReasoningStep(null);
      }, 1000);
    } catch (error) {
      toast.error('AI Strategy engine is refreshing. Please wait.');
      setLoading(false);
      setReasoningStep(null);
    } 
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 overflow-y-auto px-6 py-10 space-y-8 scrollbar-hide">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
          >
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
                ${msg.role === 'user' 
                  ? 'premium-gradient text-white shadow-xl shadow-primary/30' 
                  : 'glass-card !p-0 border-none bg-white text-primary shadow-lg shadow-slate-200/50'}
              `}>
                {msg.role === 'user' ? <HiOutlineUser className="w-6 h-6" /> : <HiOutlineSparkles className="w-6 h-6 animate-pulse-soft" />}
              </div>
              <div className={`
                px-6 py-5 rounded-3xl shadow-xl text-base leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-navy-dark text-white rounded-tr-none shadow-navy/20' 
                  : 'glass-card border-none text-navy-dark rounded-tl-none'}
              `}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-4 max-w-[85%] items-start">
              <div className="w-12 h-12 rounded-2xl glass-card !p-0 flex items-center justify-center animate-pulse">
                <HiOutlineSparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="glass-card border-none px-6 py-5 rounded-3xl rounded-tl-none space-y-4 min-w-[280px]">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-300"></span>
                </div>
                {reasoningStep && (
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-primary text-base">{reasoningStep.icon}</span>
                    {reasoningStep.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto px-6 pb-6 pt-2">
        <div className="glass-card !p-2 flex flex-col gap-2 shadow-2xl shadow-navy/10 relative">
          <form 
            onSubmit={handleSend}
            className="flex items-center gap-3 p-1"
          >
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-navy-dark placeholder-slate-400 font-medium"
              placeholder="Query your financial strategy engine..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-12 h-12 premium-gradient text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 disabled:opacity-20 disabled:scale-100"
            >
              <HiOutlinePaperAirplane className="w-6 h-6 rotate-90" />
            </button>
          </form>
          
          <div className="flex items-center gap-6 px-4 py-2 border-t border-slate-100">
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <HiOutlineChatAlt2 className="w-4 h-4 text-primary" />
                Live Contextual Agent
             </div>
             <div className="flex-1 h-px bg-slate-50"></div>
             <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest">
               Portoflio Snapshot: 2026/04/20
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
