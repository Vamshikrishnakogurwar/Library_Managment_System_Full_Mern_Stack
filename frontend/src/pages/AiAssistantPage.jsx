import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, Sparkles, AlertCircle, BookOpen, HelpCircle } from 'lucide-react';

export function AiAssistantPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.fullName || 'there'}! I am your LibraFlow AI Assistant. I can help you discover books from our catalog, explain circulation policies, borrowing rules, and overdue fine formulas. How may I assist you today?`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query.trim();
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await api.askAiAssistant(userText);
      if (res.success && res.data) {
        if (!res.data.hasAiKey) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: res.data.message || 'AI Assistant is running in core deterministic mode (no external GEMINI_API_KEY configured).',
            },
          ]);
        } else if (res.data.answer) {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.data.error || 'Failed to get answer.' }]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, an error occurred: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <Sparkles className="w-7 h-7 text-sky-500" />
          <span>AI Library Assistant</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore catalog titles, understand library circulation policies, and get answers backed by our database
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[65vh] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div
                className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-xl flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-100 p-4 rounded-2xl text-sm text-slate-500 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-sky-600 animate-ping"></div>
                <span>Analyzing catalog and database records...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about book recommendations, borrowing duration, or fine calculations..."
            className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-1.5"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
