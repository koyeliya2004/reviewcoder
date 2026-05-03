/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Bug, 
  Sparkles,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
  Copy,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Info,
  Download,
  Activity,
  Cpu,
  Bot
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: 'tsx' },
  { id: 'javascript', name: 'JavaScript', ext: 'js' },
  { id: 'python', name: 'Python', ext: 'py' },
  { id: 'java', name: 'Java', ext: 'java' },
  { id: 'cpp', name: 'C++', ext: 'cpp' },
  { id: 'go', name: 'Go', ext: 'go' },
  { id: 'rust', name: 'Rust', ext: 'rs' },
];

// AI Core Logic
const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCode = async (code: string, language: string) => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: `Review the following ${language} code for bugs, improvements, and security issues. 
            Format the response in clean Markdown with these sections:
            - ## Analysis Summary
            - ## Identified Bugs (List none if none found)
            - ## Suggested Improvements
            - ## Best Practices
            
            Code to review:
            \`\`\`${language}
            ${code}
            \`\`\``
          }
        ],
        config: {
          systemInstruction: "You are an expert senior code reviewer. Your goal is to provide concise, actionable feedback. Be technical and precise."
        }
      });
      return response.text;
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getQuickAssessment = async (code: string, language: string) => {
    try {
      const res = await fetch('/api/ai/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `You are a real-time code validator. Give a 1-sentence assessment of the following ${language} code. Start strictly with [PASS] if it looks correct/good or [WARN] if it has obvious issues. Be very concise.` 
            },
            { role: 'user', content: code }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      return null;
    }
  };

  const getChatResponse = async (code: string, language: string, query: string, history: any[]) => {
    try {
      const res = await fetch('/api/ai/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `You are a helpful coding assistant for ${language}. You are looking at this code:\n\n${code}\n\nAnswer questions about it, debug it, or refactor it as requested.` 
            },
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: query }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "I'm having trouble connecting to the analysis engine.";
    } catch (err) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context code (${language}):\n${code}\n\nQuestion: ${query}`,
        config: { systemInstruction: "Answer concisely and provide code examples where relevant." }
      });
      return response.text;
    }
  };

  return { analyzeCode, getChatResponse, getQuickAssessment, loading, error };
};

export default function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<{ status: 'PASS' | 'WARN' | null, message: string }>({ status: null, message: '' });
  const [activeTab, setActiveTab] = useState<'editor' | 'review' | 'chat'>('editor');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInp, setChatInp] = useState('');
  
  const { analyzeCode, getChatResponse, getQuickAssessment, loading, error } = useAI();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const codeMetrics = useMemo(() => {
    const lines = code.split('\n').filter(l => l.trim().length > 0).length;
    const chars = code.length;
    const complexity = lines > 50 ? 'HIGH' : lines > 20 ? 'MEDIUM' : 'LOW';
    return { lines, chars, complexity };
  }, [code]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounced Auto-Assessment
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!code.trim()) {
      setQuickStatus({ status: null, message: '' });
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const assessment = await getQuickAssessment(code, language.name);
      if (assessment) {
        if (assessment.startsWith('[PASS]')) {
          setQuickStatus({ status: 'PASS', message: assessment.replace('[PASS]', '').trim() });
        } else if (assessment.startsWith('[WARN]')) {
          setQuickStatus({ status: 'WARN', message: assessment.replace('[WARN]', '').trim() });
        }
      }
    }, 1500);

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [code, language]);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    const result = await analyzeCode(code, language.name);
    if (result) {
      setAnalysis(result);
      setActiveTab('review');
    }
  };

  const handleChat = async () => {
    if (!chatInp.trim()) return;
    const userInp = chatInp;
    setChatInp('');
    setMessages(prev => [...prev, { role: 'user', content: userInp }]);
    
    const response = await getChatResponse(code, language.name, userInp, messages);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
  };

  const downloadReport = () => {
    if (!analysis) return;
    const blob = new Blob([analysis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen technical-grid text-dash-text font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-dash-border bg-dash-bg/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-dash-accent rounded flex items-center justify-center">
            <ShieldCheck className="text-dash-bg w-5 h-5" />
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-tighter text-lg leading-none">SENTINEL_CR</h1>
            <span className="text-[10px] text-dash-muted font-mono uppercase tracking-widest leading-none">CORE_AI_ACTIVE</span>
          </div>
        </div>
        
        <nav className="flex bg-dash-surface/50 p-1 rounded-lg border border-dash-border">
          {[
            { id: 'editor', icon: Code2, label: 'EDITOR' },
            { id: 'review', icon: Search, label: 'REVIEW' },
            { id: 'chat', icon: MessageSquare, label: 'DEBUG_CHAT' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-mono transition-all ${
                activeTab === tab.id 
                  ? 'bg-dash-accent text-dash-bg shadow-sm' 
                  : 'text-dash-muted hover:text-dash-text'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-xs font-mono">
          <select 
            value={language.id}
            onChange={(e) => setLanguage(LANGUAGES.find(l => l.id === e.target.value) || LANGUAGES[0])}
            className="bg-dash-surface border border-dash-border rounded px-2 py-1 outline-none text-dash-accent font-mono text-[10px] cursor-pointer hover:border-dash-accent transition-colors"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Code Editor */}
        <section className={`flex-1 flex flex-col border-r border-dash-border bg-dash-bg transition-all duration-300 ${activeTab === 'editor' ? 'translate-x-0 opacity-100' : 'hidden lg:flex'}`}>
          <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30">
            <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted">
              <Terminal className="w-3 h-3" />
              BUFFER.{language.ext}
              {quickStatus.status && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`ml-4 flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                    quickStatus.status === 'PASS' 
                      ? 'border-dash-accent text-dash-accent bg-dash-accent/10' 
                      : 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                  }`}
                >
                  {quickStatus.status === 'PASS' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                  <span className="text-[9px] uppercase tracking-wider">{quickStatus.status}</span>
                </motion.div>
              )}
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-3 text-[10px] font-mono text-dash-muted">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {codeMetrics.lines} L</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {codeMetrics.complexity}</span>
              </div>
              <button 
                onClick={() => { setCode(''); setQuickStatus({ status: null, message: '' }); }} 
                className="text-[10px] uppercase font-mono hover:text-dash-accent transition-colors"
              >
                RESET
              </button>
            </div>
          </div>
          <div className="flex-1 relative group overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Write your ${language.name} code for intelligent review...`}
              className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder:text-dash-muted/20"
              spellCheck={false}
            />
            
            {/* Sentinel Bot Overlay */}
            <motion.div 
              layout
              className="absolute bottom-8 right-8 z-30 flex flex-col items-end pointer-events-none"
            >
              <AnimatePresence>
                {quickStatus.message && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-dash-surface border border-dash-border p-3 rounded-lg mb-3 max-w-[240px] shadow-2xl relative"
                  >
                    <div className="text-[10px] text-dash-muted mb-1 font-mono uppercase tracking-tighter">Sentinel_Observation</div>
                    <p className="text-[11px] leading-snug">{quickStatus.message}</p>
                    <div className="absolute -bottom-1 right-6 w-2 h-2 bg-dash-surface border-r border-b border-dash-border rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                onClick={() => setActiveTab('chat')}
                animate={{ 
                  y: [0, -4, 0],
                  filter: loading ? 'hue-rotate(90deg)' : 'hue-rotate(0deg)'
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                  filter: { duration: 1 }
                }}
                className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-colors shadow-dash-accent/10 ${
                  quickStatus.status === 'WARN' 
                  ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                  : 'bg-dash-accent/10 border-dash-accent text-dash-accent'
                }`}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Bot className="w-6 h-6" />}
              </motion.button>
            </motion.div>

            {loading && (
              <div className="absolute inset-0 bg-dash-bg/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="text-center">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-10 h-10 border-2 border-dash-accent/20 border-t-dash-accent rounded-full mb-4 mx-auto"
                  />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-dash-accent">Scanning_Neural_Pathways</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-dash-border flex justify-between items-center bg-dash-surface/20">
            <div className="text-[10px] font-mono text-dash-muted flex items-center gap-2">
              <Info className="w-3 h-3" />
              STATUS: {loading ? 'PROCESSING_CODE' : 'OPERATIONAL_READY'}
            </div>
            <button 
              disabled={loading || !code.trim()}
              onClick={handleAnalyze}
              className="cyber-button font-mono text-xs flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              INITIATE_DEEP_SCAN
            </button>
          </div>
        </section>

        {/* Right Side: Analysis/Chat */}
        <section className={`flex-1 flex flex-col bg-dash-surface/10 ${activeTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'review' && (
              <motion.div 
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted">
                    <Search className="w-3 h-3" />
                    ANALYSIS_REPORT_GENERATED
                  </div>
                  {analysis && (
                    <button 
                      onClick={downloadReport}
                      className="text-dash-accent hover:text-white transition-colors flex items-center gap-1.5 text-[10px] font-mono"
                    >
                      <Download className="w-3 h-3" />
                      EXPORT_MD
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {!analysis && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-dash-muted text-center max-w-md mx-auto">
                      <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                      <h3 className="font-mono text-sm mb-2">SYSTEM_STANDBY</h3>
                      <p className="text-xs">Run a Deep Scan to generate a comprehensive architectural and security assessment of your codebase.</p>
                    </div>
                  ) : (
                    <div className="markdown-body">
                      {error ? (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex gap-3 text-red-500 font-mono">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold">SCAN_CRITICAL_ERR</p>
                            <p className="text-xs">{error}</p>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown>{analysis || ''}</ReactMarkdown>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="h-10 border-b border-dash-border flex items-center px-4 bg-dash-surface/30">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted">
                    <MessageSquare className="w-3 h-3" />
                    SENTINEL_DEBUG_INTERFACE
                  </div>
                </div>
                
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-dash-muted text-center max-w-md mx-auto font-mono">
                      <Bug className="w-12 h-12 mb-4 opacity-20" />
                      <h3 className="text-sm mb-2">ASSISTANT_INITIALIZED</h3>
                      <p className="text-[11px]">Neural link established. Ask for specific refactoring, bug fixes, or architectural explanations.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div 
                      key={i} 
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-lg p-4 font-sans text-sm ${
                        m.role === 'user' 
                          ? 'bg-dash-accent text-dash-bg font-medium shadow-lg shadow-dash-accent/20' 
                          : 'glass-panel border-dash-border text-dash-text'
                      }`}>
                        <div className="flex items-center gap-2 mb-2 opacity-50 font-mono text-[9px] uppercase tracking-tighter">
                          {m.role === 'user' ? 'OPERATOR' : 'SENTINEL_BOT'}
                        </div>
                        <div className={m.role === 'assistant' ? 'markdown-body text-dash-text' : ''}>
                          {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-dash-bg/90 border-t border-dash-border flex gap-3 backdrop-blur-sm">
                  <input 
                    type="text" 
                    value={chatInp}
                    onChange={(e) => setChatInp(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Provide command: fix bugs, refactor code, explain logic..."
                    className="flex-1 bg-dash-surface border border-dash-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-dash-accent transition-colors font-mono placeholder:text-dash-muted/40"
                  />
                  <button 
                    onClick={handleChat}
                    className="bg-dash-accent text-dash-bg px-5 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-dash-accent/10"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer Status */}
      <footer className="h-8 border-t border-dash-border bg-dash-surface/50 flex items-center px-6 text-[9px] uppercase tracking-widest font-mono text-dash-muted justify-between">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-dash-accent" />
            NODE_LINK: ENCRYPTED
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-dash-accent" />
            CONTEXT: {language.name} 
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 opacity-50">
            <ShieldCheck className="w-3 h-3" />
            SECURITY_LEVEL_ALFA
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-dash-border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-dash-muted); }
        textarea { caret-color: var(--color-dash-accent); }
      `}</style>
    </div>
  );
}

