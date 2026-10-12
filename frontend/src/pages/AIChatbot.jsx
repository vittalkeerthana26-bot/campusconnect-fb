import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { chatWithAIAgent } from '../services/api';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Zap, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Terminal,
  Shield,
  GraduationCap
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "📅 What events are scheduled on campus?",
  "🎟️ Register me for Campus Hackathon",
  "📚 Where is the library and when does it close?",
  "🍽️ What are cafeteria and mess timings?",
  "🔍 Did anyone find a lost water bottle or ID card?",
  "🎓 What is the attendance criteria for semester exams?",
  "🛡️ Can students delete campus events?",
  "💼 Tell me about placement packages and recruiters",
  "🌐 How do I connect to campus Wi-Fi?"
];

export default function AIChatbot() {
  const { currentUser, isStudent, isAdmin } = useUser();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `Hello ${currentUser ? currentUser.name : 'there'}! 👋 I am the **CampusConnect AI Agent** for KL University.\n\nI can check live schedules, register you for events, look up clubs, search the campus lost & found, or explain portal permissions.\n\nHow can I help you today?`,
      toolsUsed: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('campusconnect-agent');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend = null) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Build history
      const historyPayload = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content
      }));

      const res = await chatWithAIAgent({
        message: text,
        history: historyPayload,
        userId: currentUser?.id,
        role: currentUser?.role || 'STUDENT'
      });

      setEngine(res.engine);

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.reply,
        toolsUsed: res.tools_used || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue: ${err.message || 'Could not connect to AI engine.'}`,
        toolsUsed: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: `Chat session refreshed. How can I help you, ${currentUser ? currentUser.name : 'Student'}?`,
        toolsUsed: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Simple Markdown renderer helper
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bullet items
      if (line.startsWith('• ') || line.startsWith('- ')) {
        const itemContent = line.replace(/^[•\-]\s*/, '');
        return (
          <li key={idx} className="chat-bullet-item">
            {formatBoldItalic(itemContent)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="chat-spacer" />;
      }
      return (
        <p key={idx} className="chat-paragraph">
          {formatBoldItalic(line)}
        </p>
      );
    });
  };

  const formatBoldItalic = (str) => {
    // Basic regex for **bold** and *italic*
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }
    return parts.length > 0 ? parts : str;
  };

  return (
    <div className="page-wrapper chatbot-page-layout">
      {/* Top Banner */}
      <header className="chat-header-banner">
        <div className="chat-agent-avatar-block">
          <div className="bot-avatar-glow">
            <Bot size={24} />
          </div>
          <div>
            <div className="agent-title-row">
              <h1 className="agent-name">CampusConnect AI Assistant</h1>
              <span className="agent-engine-pill">
                <Sparkles size={12} /> {engine}
              </span>
            </div>
            <p className="agent-subtext">
              Real agent with live database access • Events, Registrations, Clubs & Lost Items
            </p>
          </div>
        </div>

        <div className="chat-meta-controls">
          <div className="user-context-pill">
            {isAdmin ? <Shield size={14} /> : <GraduationCap size={14} />}
            <span>{currentUser?.name || 'Student'} ({currentUser?.role || 'STUDENT'})</span>
          </div>
          <button 
            type="button" 
            className="chat-action-btn"
            onClick={handleResetChat}
            title="Reset conversation"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Chat Messages Container */}
      <div className="chat-messages-scroll-area">
        <div className="chat-messages-list">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`chat-message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className="message-content-wrapper">
                <div className="message-header">
                  <span className="sender-name">
                    {msg.role === 'user' ? 'You' : 'CampusConnect Agent'}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>

                {/* Tool calls execution pills */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="tool-calls-container">
                    {msg.toolsUsed.map((tool, tIdx) => (
                      <div key={tIdx} className="tool-pill-badge" title={tool.result_summary}>
                        <Zap size={11} className="zap-icon" />
                        <span className="tool-name">Tool: {tool.tool_name}</span>
                        <span className="tool-desc">({tool.result_summary})</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="message-body-text">
                  {renderFormattedText(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message-bubble bot-bubble loading-bubble">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-content-wrapper">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="agent-thinking-text">Agent is searching campus database & reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Prompt Suggestions */}
      <div className="chat-suggestions-shelf">
        <span className="suggestions-label">Suggestions:</span>
        <div className="suggestions-scroll">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button 
              key={idx} 
              className="suggestion-chip"
              onClick={() => handleSend(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-bar">
        <textarea
          className="chat-textarea-input"
          placeholder="Ask anything about campus events, clubs, remaining seats, or tell me to register you..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button 
          type="button" 
          className="chat-send-btn"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Send size={16} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
