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
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FadeIn } from '../components/ui/AnimatedContainer';
import LogoIcon from '../components/ui/LogoIcon';

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
        setMessages([{ role: 'assistant', content: "Welcome to Finance Intelligence. I've initialized your portfolio context. How shall we direct your capital today?" }]);
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
    
    const steps = [
      { label: "Querying Portfolio Architecture", icon: <HiOutlineDatabase /> },
      { label: "Analyzing Capital Velocity", icon: <HiOutlineSearch /> },
      { label: "Syncing Operational Thresholds", icon: <HiOutlineChartBar /> },
      { label: "Generating Strategic Directives", icon: <HiOutlineSparkles /> }
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
      setTimeout(() => {
        setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
        setLoading(false);
        setReasoningStep(null);
      }, 1000);
    } catch (error) {
      toast.error('Strategic Engine is recalibrating.');
      setLoading(false);
      setReasoningStep(null);
    } 
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col relative">
      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-6 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg
                  ${msg.role === 'user' 
                    ? 'bg-white text-black border border-black/5' 
                    : 'bg-black text-white'}
                `}>
                  {msg.role === 'user' ? <HiOutlineUser className="w-6 h-6" /> : <LogoIcon className="w-7 h-7" />}
                </div>
                <div className={`
                  px-8 py-6 rounded-[2rem] text-lg leading-relaxed tracking-tight
                  ${msg.role === 'user' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white border border-black/5 text-black rounded-tl-none shadow-sm'}
                `}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex gap-6 max-w-[80%] items-start">
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
                <LogoIcon className="w-7 h-7 animate-pulse" />
              </div>
              <div className="bg-white border border-black/5 px-10 py-8 rounded-[2rem] rounded-tl-none space-y-8 min-w-[360px] shadow-sm">
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-black/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-black/30 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                </div>
                <AnimatePresence mode="wait">
                  {reasoningStep && (
                    <motion.div 
                      key={reasoningStep.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 text-[10px] font-black text-black/30 uppercase tracking-[0.3em]"
                    >
                      <span className="text-black text-xl">{reasoningStep.icon}</span>
                      {reasoningStep.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <FadeIn direction="up" distance={20} className="mt-auto px-8 pb-8 pt-4">
        <div className="bg-white border border-black/5 rounded-[2.5rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <form 
            onSubmit={handleSend}
            className="flex items-center gap-4 p-1"
          >
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-black placeholder-black/20 font-medium text-lg"
              placeholder="Query the Architecture..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!input.trim() || loading}
              className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl shadow-black/20 disabled:opacity-20 transition-all"
            >
              <HiOutlinePaperAirplane className="w-7 h-7 rotate-90" />
            </motion.button>
          </form>
          
          <div className="flex items-center gap-6 px-7 py-4 border-t border-black/[0.03]">
             <div className="flex items-center gap-3 text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">
                <HiOutlineChatAlt2 className="w-5 h-5 text-black" />
                Contextual Intelligence Active
             </div>
             <div className="flex-1 h-px bg-black/[0.02]"></div>
             <p className="text-[10px] text-black/20 font-black uppercase tracking-[0.3em]">
               Finance Intelligence v1.0
             </p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default ChatPage;
