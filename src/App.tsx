import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  Search, 
  MessageSquare,
  X,
  Send,
  User,
  Bot,
  Sparkles,
  Move,
  Shield,
  ShieldCheck, 
  Zap, 
  Terminal, 
  Bug, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Copy,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  History,
  Play,
  RotateCcw,
  Eye,
  Trash2,
  Save,
  Info,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: 'tsx', runnable: true, type: 'web' },
  { id: 'javascript', name: 'JavaScript', ext: 'js', runnable: true, type: 'web' },
  { id: 'html', name: 'HTML', ext: 'html', runnable: true, type: 'web' },
  { id: 'python', name: 'Python', ext: 'py', runnable: true, type: 'simulated' },
  { id: 'java', name: 'Java', ext: 'java', runnable: true, type: 'simulated' },
  { id: 'cpp', name: 'C++', ext: 'cpp', runnable: true, type: 'simulated' },
  { id: 'go', name: 'Go', ext: 'go', runnable: true, type: 'simulated' },
  { id: 'rust', name: 'Rust', ext: 'rs', runnable: true, type: 'simulated' },
];

// AI Core Logic
const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCodeDeep = async (code: string, language: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are an elite Senior Software Architect. Perform an exhaustive audit of this ${language} code.` 
            },
            { 
              role: 'user', 
              content: `Analyze this code for technical debt, security vulnerabilities, and architectural patterns. Provide a detailed report in Markdown. Be very detailed.\n\nCode:\n${code}` 
            }
          ]
        })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error.message || data.error);
      
      return data.choices?.[0]?.message?.content || "Deep scan failed to return substantial data.";
    } catch (err: any) {
      console.error('Deep Analysis Error:', err);
      // Fallback to Gemini if Groq fails
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Deep Review (${language}):\n${code}`
        });
        return response.text || "PROTOCOL_COMMUNICATION_FAILURE: Analysis result empty.";
      } catch (gemErr) {
        setError('Analysis link severed. Check API configuration.');
        return null;
      }
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
          model: 'llama-3.1-8b-instant',
          messages: [
            { 
              role: 'system', 
              content: `Real-time code validator. Give a 1-sentence assessment. Start strictly with [PASS] if code looks decent or [WARN] if there are obvious errors.` 
            },
            { role: 'user', content: `Language: ${language}\nCode: ${code}` }
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
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are SENTINEL_MINI_V2, a high-performance neural coding assistant. 
              Objective: Provide elite-level technical guidance. 
              Character: Precise, professional, and mathematically optimized. 
              Skills: Expert in all programming languages, focus on performance, security, and modern patterns.
              Constraints: 
              1. Use Markdown for all formatting. 
              2. Be concise but thorough. 
              3. When providing code, ensure it is production-ready.
              Contextual Data (${language}):\n${code}` 
            },
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: query }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "PROTOCOL_COMMUNICATION_FAILURE: Neural link lost.";
    } catch (err) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `Context (${language}):\n${code}\n\nExisting State: ${JSON.stringify(history)}\n\nQuery: ${query}` }] }
        ],
        config: {
          systemInstruction: "You are SENTINEL_MINI_V2, an elite coding assistant. Provide precise, professional technical help using Markdown."
        }
      });
      return response.text || "PROTOCOL_COMMUNICATION_FAILURE: Neural link lost.";
    }
  };

  const simulateExecution = async (code: string, language: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are a universal code executor. Simulate the exact console/terminal output of the following ${language} code as if it were run in a standard environment. Output ONLY the console logs. Do not include triple backticks or any meta-text. If there's an error, output it as an error message. If there's no output, return '[Sentinel Root: Execution successful, 0 bytes returned]'.` 
            },
            { role: 'user', content: code }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "SIMULATION_FAILED";
    } catch (err) {
      return "NEURAL_LINK_ERROR: Simulation aborted.";
    } finally {
      setLoading(false);
    }
  };

  return { analyzeCodeDeep, getChatResponse, getQuickAssessment, simulateExecution, loading, error };
};

// --- SENTINEL MINI V2 COMPONENT ---
const ROBOT_SIZE = 120;
const MOVEMENT_SPEED = 4000; 
const IDLE_TIME = 5000; 

const SentinelMini = ({ code, language, getChatResponse, isMinimized, setIsMinimized }: { 
  code: string, 
  language: string, 
  getChatResponse: any,
  isMinimized: boolean,
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Sentinel Mini V2 online. Monitoring system borders.", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isMoving, setIsMoving] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'alert'>('idle');

  const clickCount = useRef(0);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleInteraction = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        if (clickCount.current === 1) {
          if (!isMinimized) setIsChatOpen(true);
          else setIsMinimized(false);
        }
        clickCount.current = 0;
      }, 250);
    } else if (clickCount.current === 2) {
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
      setIsMinimized(!isMinimized);
      setIsChatOpen(false);
      clickCount.current = 0;
    }
  };

  const getNextBorderPosition = useCallback(() => {
    const margin = 60;
    const maxX = window.innerWidth - ROBOT_SIZE - margin;
    const maxY = window.innerHeight - ROBOT_SIZE - margin;
    
    // Weighted selection to stay near borders
    const side = Math.floor(Math.random() * 4); 
    
    switch(side) {
      case 0: return { x: Math.random() * maxX, y: margin }; 
      case 1: return { x: maxX, y: Math.random() * maxY }; 
      case 2: return { x: Math.random() * maxX, y: maxY }; 
      case 3: return { x: margin, y: Math.random() * maxY }; 
      default: return { x: margin, y: margin };
    }
  }, []);

  useEffect(() => {
    if (isChatOpen || isDragging || isHovered || !isMoving || isMinimized) return;

    const moveInterval = setInterval(() => {
      const nextPos = getNextBorderPosition();
      setDirection(nextPos.x > position.x ? 'right' : 'left');
      setPosition(nextPos);
      
      if (Math.random() > 0.7) {
        setMood('alert');
        setTimeout(() => setMood('idle'), 2000);
      }
    }, MOVEMENT_SPEED + IDLE_TIME);

    return () => clearInterval(moveInterval);
  }, [isChatOpen, isDragging, isHovered, isMoving, position.x, getNextBorderPosition]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }]);
    setInputText("");
    setMood('thinking');

    const response = await getChatResponse(code, language, userText, messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    })));

    setMessages(prev => [...prev, { 
      id: Date.now() + 1, 
      text: response, 
      sender: 'bot' 
    }]);
    setMood('happy');
    setTimeout(() => setMood('idle'), 2000);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden select-none">
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        drag
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          setPosition({ x: info.point.x, y: info.point.y });
        }}
        animate={
          isChatOpen 
            ? { x: window.innerWidth/2 - 60, y: window.innerHeight/2 - 180, scale: 1, opacity: 1 } 
            : (isMinimized 
                ? { x: window.innerWidth - 150, y: -200, scale: 0.1, opacity: 0 } 
                : { ...position, scale: 1, opacity: 1 })
        }
        transition={isDragging ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 60 }}
        style={{ width: ROBOT_SIZE }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            y: (isMinimized) ? 0 : [0, -8, 0],
            rotate: mood === 'alert' ? [0, -2, 2, 0] : 0
          }}
          transition={{ y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
          onClick={handleInteraction}
          className="relative group flex flex-col items-center"
        >
          <div className="flex space-x-6 mb-[-4px]">
            <motion.div animate={{ rotate: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 2 }} className="w-0.5 h-3 bg-dash-accent/50 rounded-full" />
            <motion.div animate={{ rotate: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 2 }} className="w-0.5 h-3 bg-dash-accent/50 rounded-full" />
          </div>

          <div className="w-16 h-14 rounded-2xl bg-dash-surface/80 backdrop-blur-md border border-white/10 shadow-xl flex items-center justify-center relative overflow-hidden z-20">
            <div className="absolute inset-0 bg-gradient-to-br from-dash-accent/10 to-purple-500/10" />
            
            <div className={`flex space-x-2 transition-transform duration-500 ${direction === 'left' ? '-scale-x-100' : ''}`}>
              <motion.div 
                animate={{ 
                  scaleY: mood === 'thinking' ? [1, 0.2, 1] : (mood === 'happy' ? 0.5 : [1, 1, 0.1, 1, 1]),
                  height: mood === 'happy' ? '4px' : '16px'
                }} 
                transition={{ repeat: Infinity, duration: 4 }}
                className="w-2.5 h-4 bg-dash-accent rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)]" 
              />
              <motion.div 
                animate={{ 
                  scaleY: mood === 'thinking' ? [1, 0.2, 1] : (mood === 'happy' ? 0.5 : [1, 1, 0.1, 1, 1]),
                  height: mood === 'happy' ? '4px' : '16px'
                }} 
                transition={{ repeat: Infinity, duration: 4, delay: 0.1 }}
                className="w-2.5 h-4 bg-dash-accent rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)]" 
              />
            </div>
          </div>

          <div className="w-4 h-2 bg-white/5 border-x border-white/10 z-10" />

          <div className="w-12 h-10 rounded-xl bg-dash-surface/80 backdrop-blur-md border border-white/10 shadow-lg relative flex items-center justify-center">
             <motion.div 
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-4 h-4 rounded-full shadow-[0_0_8px] ${mood === 'alert' ? 'bg-red-500 shadow-red-500' : 'bg-dash-accent shadow-dash-accent'}`}
             />

             <div className="absolute -left-5 top-2 flex items-center">
                <motion.div 
                  animate={{ rotate: isHovered ? [0, 45, 0] : [-5, 5, -5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-5 h-1.5 bg-white/20 rounded-full origin-right"
                />
                <div className="w-2 h-2 rounded-full bg-dash-accent/40 border border-white/10 -ml-1" />
             </div>
             <div className="absolute -right-5 top-2 flex items-center flex-row-reverse">
                <motion.div 
                  animate={{ rotate: isHovered ? [0, -45, 0] : [5, -5, 5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-5 h-1.5 bg-white/20 rounded-full origin-left"
                />
                <div className="w-2 h-2 rounded-full bg-dash-accent/40 border border-white/10 -mr-1" />
             </div>
          </div>

          <AnimatePresence>
            {isHovered && !isChatOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-16 bg-black/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-dash-accent border border-dash-accent/30 font-bold tracking-widest uppercase whitespace-nowrap"
              >
                Sentinel_Mini_V2
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[420px] h-[500px] bg-dash-bg/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col mb-10"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-dash-surface/30">
              <div className="flex items-center space-x-3">
                <Shield size={18} className="text-dash-accent" />
                <h3 className="text-white text-[10px] font-mono font-bold tracking-[0.2em] uppercase">NEURAL INTERFACE</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-dash-muted transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl text-[12px] font-mono leading-relaxed max-w-[85%] ${
                    msg.sender === 'user' 
                      ? 'bg-dash-accent/10 text-dash-accent border border-dash-accent/20' 
                      : 'bg-dash-surface text-dash-text border border-white/5 shadow-lg'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-6 bg-dash-surface/20 border-t border-white/5">
              <div className="relative flex items-center">
                <input
                  type="text" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Transmit neural request..."
                  className="w-full bg-dash-bg border border-white/10 rounded-2xl py-4 px-5 text-[12px] font-mono text-white focus:border-dash-accent/50 outline-none transition-all placeholder:text-dash-muted/30"
                />
                <button type="submit" className="absolute right-3 p-2 text-dash-accent hover:scale-110 transition-transform"><Send size={20} /></button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'home' | 'app'>('home');
  const [code, setCode] = useState('// SENTINEL_SYSTEM_BOOT_SEQUENCE\nconsole.log("Initializing Neural Core...");\n\nconst data = {\n  status: "OPTIMAL",\n  load: Math.random() * 100,\n  timestamp: new Date().toISOString()\n};\n\nconsole.log("System Metrics:", data);\n\nif (data.load > 50) {\n  console.warn("High neuronal load detected!");\n} else {\n  console.info("Neural flux stable.");\n}\n\n// Try some math\nconst result = [1, 2, 3].map(x => x * x);\nconsole.log("Computation result:", result);');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<{ status: 'PASS' | 'WARN' | null, message: string }>({ status: null, message: '' });
  const [activeTab, setActiveTab] = useState<'editor' | 'review' | 'chat' | 'history' | 'output'>('editor');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInp, setChatInp] = useState('');
  const [logs, setLogs] = useState<{ type: 'log' | 'info' | 'error', message: string, time: string }[]>([]);
  const [runCount, setRunCount] = useState(0);
  const [isSplit, setIsSplit] = useState(false);
  const [isBotMinimized, setIsBotMinimized] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [historyLedger, setHistoryLedger] = useState<{ id: string, date: string, code: string, analysis: string, lang: string }[]>([]);
  
  // Auto-template logic
  useEffect(() => {
    if (!code || code.includes('// SENTINEL_SYSTEM_BOOT_SEQUENCE') || code === '') {
      let template = '';
      switch (language.id) {
        case 'python':
          template = '# Sentinel Neural Execution Example\nimport math\n\ndef calculate_neural_load(data):\n    return sum(data) / len(data)\n\nmetrics = [45.2, 56.1, 33.9, 88.4]\nload = calculate_neural_load(metrics)\n\nprint(f"Neural Load: {load:.2f}")\nif load > 50:\n    print("WARNING: Load exceeds optimal threshold.")\nelse:\n    print("STATUS: System remains stable.")';
          break;
        case 'java':
          template = 'public class SentinelCore {\n    public static void main(String[] args) {\n        System.out.println("Neural Nexus v2.5 Initialized");\n        String[] nodes = {"Primary", "Secondary", "Tertiary"};\n        \n        for (String node : nodes) {\n            System.out.println("Node status check: " + node + " -> [ACTIVE]");\n        }\n    }\n}';
          break;
        case 'go':
          template = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Sentinel Go Core")\n    status := "NOMINAL"\n    fmt.Printf("Subsystem Status: %s\\n", status)\n}';
          break;
        case 'rust':
          template = 'fn main() {\n    let name = "Sentinel";\n    println!("Hello, {}! Initializing warp-drive Simulation...", name);\n    \n    for i in 1..=3 {\n        println!("Pulse {}... OK", i);\n    }\n}';
          break;
        case 'cpp':
          template = '#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Sentinel CPP Runtime v2.0" << std::endl;\n    std::vector<int> data = {10, 20, 30};\n    \n    for(int val : data) {\n        std::cout << "Processing bit: " << val << " status: OK" << std::endl;\n    }\n    \n    return 0;\n}';
          break;
        case 'html':
          template = '<div style="font-family: sans-serif; padding: 20px; border-radius: 12px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">\n  <h1>Sentinel Visual Output</h1>\n  <p>This is a live HTML preview with console logging enabled.</p>\n  <button onclick="console.log(\'Action Registered: Signal sent to core.\')" style="padding: 8px 16px; border: none; border-radius: 6px; background: rgba(255,255,255,0.2); color: white; cursor: pointer;">Send Signal</button>\n</div>';
          break;
        default:
          return;
      }
      setCode(template);
    }
  }, [language.id]);

  const { analyzeCodeDeep, getChatResponse, getQuickAssessment, simulateExecution, loading, error } = useAI();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!liveMode || !code.trim()) return;
    
    const delay = language.type === 'web' ? 800 : 3000; // Faster for web, slower for AI simulation
    const timer = setTimeout(() => {
      // Only auto-run if we're not currently loading something else
      if (!loading) {
        handleRun();
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [code, language, liveMode]);

  const handleRun = async () => {
    if (loading) return;
    setLogs([]);
    setRunCount(prev => prev + 1);
    setActiveTab('output');
    
    if (window.innerWidth > 1024) {
      setIsSplit(true);
    }

    const timestamp = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (language.type === 'simulated') {
      setLogs([{
        type: 'info',
        message: `>>> INITIATING NEURAL_SIMULATION (${language.name.toUpperCase()})`,
        time: timestamp()
      }]);
      
      const simulatedResult = await simulateExecution(code, language.name);
      
      const outputLines = simulatedResult.split('\n').filter(l => l.trim() !== '');
      if (outputLines.length === 0) {
        setLogs(prev => [...prev, {
          type: 'log',
          message: '[Sentinel Root: Execution successful, 0 bytes returned]',
          time: timestamp()
        }]);
      }

      outputLines.forEach((line: string, index: number) => {
        setTimeout(() => {
          setLogs(prev => [...prev, {
            type: 'log',
            message: line,
            time: timestamp()
          }]);

          if (index === outputLines.length - 1) {
            setLogs(prev => [...prev, {
              type: 'info',
              message: `>>> NEURAL_SIMULATION_SUCCESS [CPU_LATENCY: ${Math.floor(Math.random() * 50)}ms]`,
              time: timestamp()
            }]);
          }
        }, index * 60);
      });
    }
  };

  const saveSession = () => {
    const newItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      code,
      analysis: analysis || 'No audit performed.',
      lang: language.name,
      logs: [...logs]
    };
    const updated = [newItem, ...historyLedger].slice(0, 50);
    setHistoryLedger(updated);
    localStorage.setItem('sentinel_v2_history', JSON.stringify(updated));
    // Brief visual feedback could go here if needed, but the tab switch/update is usually enough
  };
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.source === 'SENTINEL_SANDBOX') {
        setLogs(prev => [...prev, { 
          type: event.data.type, 
          message: String(event.data.message),
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Persistence Logic
  useEffect(() => {
    const saved = localStorage.getItem('sentinel_v2_history');
    if (saved) setHistoryLedger(JSON.parse(saved));
  }, []);

  const saveToLedger = (code: string, result: string, lang: string) => {
    const newItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      code,
      analysis: result,
      lang
    };
    const updated = [newItem, ...historyLedger].slice(0, 50);
    setHistoryLedger(updated);
    localStorage.setItem('sentinel_v2_history', JSON.stringify(updated));
  };

  const deleteHistory = (id: string) => {
    const updated = historyLedger.filter(h => h.id !== id);
    setHistoryLedger(updated);
    localStorage.setItem('sentinel_v2_history', JSON.stringify(updated));
  };

  const codeMetrics = useMemo(() => {
    const lines = code.split('\n').filter(l => l.trim().length > 0).length;
    const complexity = lines > 50 ? 'HIGH' : lines > 20 ? 'MEDIUM' : 'LOW';
    return { lines, complexity };
  }, [code]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time Assessment
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!code.trim()) { setQuickStatus({ status: null, message: '' }); return; }
    
    debounceTimer.current = setTimeout(async () => {
      const assessment = await getQuickAssessment(code, language.name);
      if (assessment) {
        if (assessment.includes('[PASS]')) {
          setQuickStatus({ status: 'PASS', message: assessment.replace('[PASS]', '').trim() });
        } else if (assessment.includes('[WARN]')) {
          setQuickStatus({ status: 'WARN', message: assessment.replace('[WARN]', '').trim() });
        }
      }
    }, 1500);
    
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [code, language]);

  const handleDeepScan = async () => {
    if (!code.trim()) return;
    const result = await analyzeCodeDeep(code, language.name);
    if (result) {
      setAnalysis(result);
      setActiveTab('review');
      saveToLedger(code, result, language.name);
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

  const iframeSrc = useMemo(() => {
    if (!code || !language.runnable || language.type !== 'web') return null;
    
    const consoleOverride = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          const originalInfo = console.info;
          
          function formatArg(arg) {
            try {
              if (arg === null) return 'null';
              if (arg === undefined) return 'undefined';
              if (typeof arg === 'function') return arg.toString();
              if (typeof arg === 'symbol') return arg.toString();
              if (typeof arg === 'object') return JSON.stringify(arg, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value, 2);
              return String(arg);
            } catch (e) {
              return '[Circular or Complex Object]';
            }
          }

          function send(type, args) {
            window.parent.postMessage({
              source: 'SENTINEL_SANDBOX',
              type: type,
              message: Array.from(args).map(formatArg).join(' ')
            }, '*');
          }

          console.log = (...args) => { originalLog(...args); send('log', args); };
          console.error = (...args) => { originalError(...args); send('error', args); };
          console.warn = (...args) => { originalWarn(...args); send('info', args); };
          console.info = (...args) => { originalInfo(...args); send('info', args); };
          
          window.onerror = (msg, url, line, col, error) => {
            send('error', [msg + ' (at line ' + line + ')']);
            return false;
          };

          window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason?.message || String(event.reason || '');
            if (reason.includes('WebSocket') || reason.includes('vite')) return;
            send('error', ['Unhandled Promise Rejection: ' + reason]);
          });
          
          // Initial connection ping
          setTimeout(() => {
            if (window.parent) {
              window.parent.postMessage({ source: 'SENTINEL_SANDBOX', type: 'info', message: 'Runtime Session Initialized...' }, '*');
            }
          }, 100);
        })();
      </script>
    `;

    if (language.id === 'html') {
      return `<!-- Session: ${runCount} -->${consoleOverride}${code}`;
    }
    
    return `
      <!DOCTYPE html>
      <!-- Session: ${runCount} -->
      <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              background: #fff; 
              color: #1a1a1a; 
              padding: 20px; 
              line-height: 1.5; 
            }
            #root { 
              border: 1px dashed #e2e8f0; 
              padding: 16px; 
              border-radius: 8px; 
              min-height: 100px; 
              display: flex; 
              flex-direction: column; 
            }
            pre { background: #f8fafc; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          ${consoleOverride}
          <script type="module">
            try {
              ${code}
            } catch (err) {
              console.error(err.stack || err.message);
            }
          </script>
        </body>
      </html>
    `;
  }, [code, language, runCount]);

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-dash-accent selection:text-black overflow-hidden relative">
        {/* Background Animation */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full technical-grid" />
          <motion.div 
            animate={{ 
              background: [
                'radial-gradient(circle at 50% 50%, rgba(0, 255, 0, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 20% 80%, rgba(0, 255, 0, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 20%, rgba(0, 255, 0, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 50% 50%, rgba(0, 255, 0, 0.1) 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
          <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-dash-accent/30 bg-dash-accent/5 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-dash-accent animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.2em] font-bold text-dash-accent uppercase">Neural Core v2.5 Online</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-mono font-bold tracking-tighter mb-6 leading-[0.85] text-white">
              SENTINEL<span className="text-dash-accent">_</span>CR
            </h1>
            
            <p className="max-w-2xl text-dash-muted font-mono uppercase tracking-widest text-xs md:text-sm mb-12 leading-relaxed opacity-80">
              The next generation of autonomous code execution and neural auditing. 
              Built for speed. Engineered for precision.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={() => setView('app')}
                className="group relative px-10 py-5 bg-dash-accent text-dash-bg font-mono font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,0,0.3)]"
              >
                LAUNCH_CORE
                <span className="absolute -top-1 -left-1 w-2 h-2 bg-white" />
                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-white" />
              </button>
              
              <button className="px-10 py-5 border border-white/20 bg-white/5 font-mono font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-3">
                <Terminal className="w-5 h-5" />
                VIEW_DOCS
              </button>
            </div>

            <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-1 px-6 w-full max-w-5xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {[
                { label: 'Latency', value: '4.2MS', desc: 'Predictive neural execution core.' },
                { label: 'Uptime', value: '99.99%', desc: 'Distributed cluster redundancy.' },
                { label: 'Security', value: 'LEVEL_7', desc: 'Hardware-level sandbox isolation.' }
              ].map((stat, i) => (
                <div key={i} className="p-8 border-white/10 text-left hover:bg-dash-accent/5 transition-colors group">
                  <div className="text-[10px] font-mono text-dash-muted mb-2 uppercase tracking-tighter">{stat.label}</div>
                  <div className="text-3xl font-mono font-bold mb-4 group-hover:text-dash-accent transition-colors">{stat.value}</div>
                  <p className="text-[10px] font-mono text-dash-muted tracking-tight">{stat.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-1/4 -left-10 w-40 h-40 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
        <div className="absolute bottom-1/4 -right-10 w-60 h-60 border border-dash-accent/5 rounded-full animate-[spin_30s_linear_infinite]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen technical-grid text-dash-text font-sans flex flex-col overflow-hidden">
      <header className="h-16 border-b border-dash-border bg-dash-bg/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-dash-accent rounded flex items-center justify-center">
            <ShieldCheck className="text-dash-bg w-5 h-5" />
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-tighter text-lg leading-none">SENTINEL_CR</h1>
            <span className="text-[10px] text-dash-muted font-mono uppercase tracking-widest leading-none">NEURAL_CORE_V2.5</span>
          </div>
        </div>
        
        <nav className="flex bg-dash-surface/50 p-1 rounded-lg border border-dash-border">
          {[
            { id: 'editor', icon: Code2, label: 'EDITOR' },
            { id: 'output', icon: Play, label: 'SANDBOX' },
            { id: 'review', icon: Search, label: 'AUDIT' },
            { id: 'chat', icon: MessageSquare, label: 'DEBUG' },
            { id: 'history', icon: History, label: 'LOGS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id !== 'editor' && tab.id !== 'output') setIsSplit(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-mono transition-all ${
                activeTab === tab.id ? 'bg-dash-accent text-dash-bg shadow-sm' : 'text-dash-muted hover:text-dash-text'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-2 border-r border-dash-border pr-4 mr-2">
            <button 
              onClick={() => { setIsSplit(!isSplit); setActiveTab('editor'); }}
              className={`p-1.5 rounded transition-all ${isSplit ? 'text-dash-accent bg-dash-accent/10' : 'text-dash-muted hover:bg-dash-surface'}`}
              title="Toggle Split View"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setLiveMode(!liveMode)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono transition-all ${liveMode ? 'text-green-500 bg-green-500/10' : 'text-dash-muted hover:bg-dash-surface'}`}
              title="Toggle Live Preview"
            >
              <Activity className="w-3 h-3" />
              {liveMode ? 'LIVE_ON' : 'LIVE_OFF'}
            </button>
          </div>
          <button 
            onClick={handleRun}
            className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-dash-accent text-dash-bg rounded font-mono text-[10px] font-bold hover:scale-105 transition-all shadow-lg shadow-dash-accent/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            RUN_CODE
          </button>
          <select 
            value={language.id}
            onChange={(e) => setLanguage(LANGUAGES.find(l => l.id === e.target.value) || LANGUAGES[0])}
            className="bg-dash-surface border border-dash-border rounded px-2 py-1 outline-none text-dash-accent font-mono text-[10px] cursor-pointer hover:border-dash-accent transition-colors"
          >
            {LANGUAGES.map(lang => <option key={lang.id} value={lang.id}>{lang.name.toUpperCase()}</option>)}
          </select>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <section className={`flex-1 flex flex-col border-r border-dash-border bg-dash-bg transition-all duration-300 ${
          activeTab === 'editor' || (isSplit && activeTab === 'output') ? 'translate-x-0 opacity-100 flex' : 'hidden'
        }`}>
          <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30">
            <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted uppercase">
              <Terminal className="w-3 h-3" />
              ROOT_BUFFER.{language.ext}
              {quickStatus.status && (
                <div className={`ml-4 px-2 py-0.5 rounded border text-[9px] font-bold ${quickStatus.status === 'PASS' ? 'border-dash-accent text-dash-accent bg-dash-accent/5' : 'border-yellow-500 text-yellow-500 bg-yellow-500/5'}`}>
                  {quickStatus.status}
                </div>
              )}
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-3 text-[10px] font-mono text-dash-muted">
                {isBotMinimized && (
                  <button 
                    onClick={() => setIsBotMinimized(false)}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-dash-accent/20 border border-dash-accent/30 text-dash-accent rounded hover:bg-dash-accent hover:text-dash-bg transition-all font-bold animate-pulse"
                  >
                    <Bot className="w-3 h-3" /> AI
                  </button>
                )}
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {codeMetrics.lines}L</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {codeMetrics.complexity}</span>
              </div>
              <button onClick={() => { setCode(''); setQuickStatus({ status: null, message: '' }); }} className="text-[10px] uppercase font-mono hover:text-dash-accent transition-colors">RESET</button>
            </div>
          </div>
          <div className="flex-1 relative group overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Input your ${language.name} source for intelligent analysis...`}
              className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none font-mono text-sm leading-relaxed focus:outline-none placeholder:text-dash-muted/20"
              spellCheck={false}
            />
            
            {loading && (
              <div className="absolute inset-0 bg-dash-bg/40 backdrop-blur-[1px] flex items-center justify-center z-10 text-center">
                <div>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-10 h-10 border-2 border-dash-accent/20 border-t-dash-accent rounded-full mb-4 mx-auto" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-dash-accent">PROCESSING_NEURAL_LINK</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-dash-border flex justify-between items-center bg-dash-surface/20">
            <div className="text-[10px] font-mono text-dash-muted flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3" />
                READY: {language.name} MOD_LINKED
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleRun}
                className="px-4 py-1.5 bg-dash-surface border border-dash-border rounded text-[10px] font-mono hover:border-dash-accent transition-colors flex items-center gap-2 group"
              >
                <Play className="w-3.5 h-3.5 group-hover:text-dash-accent transition-colors" />
                EXECUTE_SANDBOX
              </button>
              <button 
                disabled={loading || !code.trim()}
                onClick={handleDeepScan}
                className="cyber-button font-mono text-xs flex items-center gap-2 disabled:opacity-30"
              >
                <Zap className="w-3.5 h-3.5" />
                INITIATE_AUDIT
              </button>
            </div>
          </div>
        </section>

        <section className={`flex-1 flex flex-col bg-dash-surface/10 ${
          (activeTab === 'editor' && !isSplit) ? 'hidden' : 'flex'
        }`}>
          <AnimatePresence mode="wait">
            {activeTab === 'output' && (
              <motion.div key="output" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col bg-dash-bg">
                <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted">
                    <Play className="w-3.5 h-3.5" /> LIVE_PREVIEW_SANDBOX
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={saveSession}
                      className="text-[10px] font-mono text-dash-accent hover:text-white flex items-center gap-1.5 px-2 py-0.5 border border-dash-accent/30 rounded"
                    >
                      <Save className="w-3 h-3" /> SAVE_SESSION
                    </button>
                    <button 
                      onClick={() => setLogs([])}
                      className="text-[10px] font-mono text-dash-muted hover:text-dash-accent flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> CLEAR_LOGS
                    </button>
                  </div>
                </div>
                
                {/* Visual Preview / Simulation View */}
                <div className="flex-[2] bg-dash-bg relative overflow-hidden">
                  {iframeSrc ? (
                    <div className="w-full h-full bg-white">
                      <iframe id="sandbox-iframe" title="sandbox" srcDoc={iframeSrc} className="w-full h-full border-none" />
                    </div>
                  ) : language.type === 'simulated' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 relative">
                      <div className="absolute inset-0 opacity-10 pointer-events-none">
                         <div className="h-full w-full flex flex-wrap gap-1 p-2 overflow-hidden font-mono text-[8px] text-dash-accent">
                          {Array.from({ length: 500 }).map((_, i) => (
                            <span key={i}>{Math.random() > 0.5 ? '1' : '0'}</span>
                          ))}
                        </div>
                      </div>
                      <div className="relative z-10">
                        <Cpu className="w-16 h-16 mb-6 text-dash-accent animate-pulse" />
                        <h3 className="text-dash-text font-mono text-lg mb-2 tracking-tighter">NEURAL_SIMULATION_ACTIVE</h3>
                        <p className="text-dash-muted font-mono text-[10px] uppercase tracking-widest max-w-xs">
                          {language.name} source identified. Standard runtime hijacked by Sentinel Neural Core for predictive execution.
                        </p>
                        <div className="mt-8 flex gap-2 justify-center">
                          <div className="w-1 h-1 bg-dash-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-1 bg-dash-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                          <div className="w-1 h-1 bg-dash-accent rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <Terminal className="w-12 h-12 mb-4 text-dash-muted opacity-20" />
                      <p className="text-dash-muted font-mono text-[10px] uppercase tracking-widest">Environment Restricted for {language.name}</p>
                    </div>
                  )}
                </div>

                {/* Console Log Area */}
                <div className="flex-1 border-t border-dash-border flex flex-col min-h-[150px] bg-black">
                  <div className="h-8 border-b border-dash-border bg-dash-surface/10 flex items-center px-4">
                    <span className="text-[9px] font-mono text-dash-muted tracking-widest">LOG_TERMINAL</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed custom-scrollbar">
                    {logs.length === 0 ? (
                      <div className="text-dash-muted opacity-30 italic">Awaiting runtime events...</div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className={`mb-1 flex gap-3 ${
                          log.type === 'error' ? 'text-red-400' : log.type === 'info' ? 'text-dash-accent' : 'text-gray-300'
                        }`}>
                          <span className="text-dash-muted opacity-50 flex-shrink-0">[{log.time}]</span>
                          <span className="break-all">{log.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-dash-muted">
                    <Search className="w-3 h-3" /> AUDIT_LOG_ENTRY
                  </div>
                  {analysis && <button onClick={() => { const blob = new Blob([analysis], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit_report.md'; a.click(); }} className="text-dash-accent hover:text-white transition-colors text-[10px] flex items-center gap-1.5"><Download className="w-3 h-3" /> EXPORT</button>}
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {!analysis ? (
                    <div className="h-full flex flex-col items-center justify-center text-dash-muted opacity-20"><Sparkles className="w-12 h-12 mb-4" /> REVEGETATING_CORE...</div>
                  ) : (
                    <div className="markdown-body"><ReactMarkdown>{analysis}</ReactMarkdown></div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                <div className="h-10 border-b border-dash-border flex items-center px-4 bg-dash-surface/30 text-[11px] font-mono text-dash-muted">
                  <MessageSquare className="w-3 h-3 mr-2" /> DEBUG_MOD_V8
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.length === 0 && <div className="h-full flex flex-col items-center justify-center text-dash-muted font-mono opacity-20"><Bug className="w-12 h-12 mb-4" /> ASSISTANT_WAITING</div>}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-4 font-sans text-sm ${m.role === 'user' ? 'bg-dash-accent text-dash-bg font-bold' : 'glass-panel border-dash-border'}`}>
                        <div className="markdown-body text-inherit">{m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 bg-dash-bg border-t border-dash-border flex gap-3"><input type="text" value={chatInp} onChange={(e) => setChatInp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask for refactoring..." className="flex-1 bg-dash-surface border border-dash-border rounded-lg px-4 py-2 text-sm outline-none font-mono" /><button onClick={handleChat} className="bg-dash-accent text-dash-bg px-5 rounded-lg active:scale-95 transition-all"><Send className="w-4 h-4" /></button></div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                <div className="h-10 border-b border-dash-border flex items-center justify-between px-4 bg-dash-surface/30 text-[11px] font-mono text-dash-muted">
                  <div className="flex items-center">
                    <History className="w-3 h-3 mr-2" /> ARCHIVED_SESSIONS
                  </div>
                  {historyLedger.length > 0 && (
                    <button 
                      onClick={() => {
                        setHistoryLedger([]);
                        localStorage.removeItem('sentinel_v2_history');
                      }}
                      className="text-[9px] text-red-500/60 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> WIPE_ALL
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                  {historyLedger.length === 0 && <div className="text-center text-dash-muted opacity-20 font-mono mt-20">NO_ARCHIVES</div>}
                  {historyLedger.map((item: any) => (
                    <div key={item.id} className="p-4 glass-panel rounded-lg hover:border-dash-accent transition-colors group relative cursor-pointer" onClick={() => { 
                      setCode(item.code); 
                      setAnalysis(item.analysis); 
                      if (item.logs) {
                        setLogs(item.logs);
                        setActiveTab('output');
                      } else {
                        setActiveTab('review');
                      }
                    }}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-dash-accent">{item.lang}</span>
                          {item.logs && <span className="text-[8px] bg-dash-accent/20 text-dash-accent px-1.5 rounded-full font-mono uppercase">Session</span>}
                          {!item.logs && <span className="text-[8px] bg-dash-surface text-dash-muted px-1.5 rounded-full font-mono uppercase">Audit</span>}
                        </div>
                        <span className="text-[9px] text-dash-muted">{item.date}</span>
                      </div>
                      <p className="text-[11px] text-dash-muted truncate font-mono opacity-50">{item.code.substring(0, 80)}...</p>
                      <button onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-50 hover:!opacity-100 text-red-500 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer className="h-8 border-t border-dash-border bg-dash-surface/50 flex items-center px-6 text-[9px] uppercase tracking-widest font-mono text-dash-muted justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-dash-accent" /> SYSTEM_VIBRATION: OPTIMAL</div>
          <div className="flex items-center gap-2 text-dash-accent"><span className="w-1.5 h-1.5 rounded-full bg-dash-accent" /> NEURAL_NET: GROQ_LPU_ENABLED</div>
        </div>
        <div className="flex items-center gap-4 opacity-50"><ShieldCheck className="w-3 h-3" /> ENCRYPTED_MOD_V2</div>
      </footer>
      <SentinelMini 
        code={code} 
        language={language.name} 
        getChatResponse={getChatResponse} 
        isMinimized={isBotMinimized}
        setIsMinimized={setIsBotMinimized}
      />
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); } .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-dash-border); border-radius: 10px; } textarea { caret-color: var(--color-dash-accent); } .technical-grid { background-image: radial-gradient(circle at 1px 1px, #1e1e1e 1px, transparent 0); background-size: 20px 20px; }`}</style>
    </div>
  );
}
