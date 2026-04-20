import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import { HiOutlineChatAlt2, HiOutlineUser, HiOutlinePaperAirplane, HiOutlineSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('Thinking');
  const messagesEndRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/chat/history');
      if (res.data.length > 0) {
        setMessages(res.data);
      } else {
        setMessages([{ role: 'assistant', content: "Hello! I'm your AI CFO. I have access to your live financial data, budgets, and forecasts. Ask me anything like 'How is my health score?' or 'Set a budget of 5000 for Shopping'." }]);
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
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    
    // Rotate thinking labels for "agentic" feel
    const labels = ["Checking your expenses...", "Analyzing budgets...", "Calculating trends...", "Thinking..."];
    let i = 0;
    const interval = setInterval(() => {
      setThinkingLabel(labels[i % labels.length]);
      i++;
    }, 2000);

    try {
      const response = await apiClient.post('/chat', {
        messages: [{ role: 'user', content: input }] 
      });
      setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      toast.error('AI is a bit overwhelmed. Try again later.');
    } finally {
      clearInterval(interval);
      setLoading(false);
      setThinkingLabel('Thinking');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 scrollbar-hide">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`
                w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0
                ${msg.role === 'user' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-100 text-primary shadow-sm'}
              `}>
                {msg.role === 'user' ? <HiOutlineUser className="w-6 h-6" /> : <HiOutlineSparkles className="w-6 h-6" />}
              </div>
              <div className={`
                px-5 py-4 rounded-2xl shadow-sm text-sm leading-relaxed
                ${msg.role === 'user' ? 'bg-navy text-white rounded-tr-none' : 'bg-white text-navy-dark border border-gray-50 rounded-tl-none'}
              `}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%] items-center">
              <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 text-primary flex items-center justify-center animate-pulse">
                <HiOutlineSparkles className="w-6 h-6" />
              </div>
              <div className="bg-white border border-gray-50 px-5 py-4 rounded-2xl rounded-tl-none flex flex-col gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-200"></span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                  {thinkingLabel}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto px-4 pb-4">
        <form 
          onSubmit={handleSend}
          className="bg-white rounded-3xl shadow-2xl shadow-navy/5 border border-gray-100 p-2 flex items-center gap-2"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-navy-dark placeholder-gray-400"
            placeholder="Ask your AI CFO anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:bg-gray-200 disabled:shadow-none"
          >
            <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest">
          AI uses your live expense data from the last 30 days as context.
        </p>
      </div>
    </div>
  );
};

export default ChatPage;
