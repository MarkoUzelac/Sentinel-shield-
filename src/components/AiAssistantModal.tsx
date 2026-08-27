import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { AppSkinConfig } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  skin: AppSkinConfig;
}

export const AiAssistantModal: React.FC<Props> = ({ isOpen, onClose, skin }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Greetings. I am Sentinel AI Advisor. I provide real-time cybersecurity guidance, threat intelligence analysis, and WireGuard / cellular privacy explanations. How can I assist you?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: data.reply || 'No response generated.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: 'Network error communicating with AI security engine.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'How do I detect IMSI-catchers?',
    'What makes WireGuard zero-log?',
    'How to verify call forwarding status?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        id="ai-assistant-modal"
        className="w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: skin.bgColor,
          borderColor: skin.primaryColor,
        }}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${skin.primaryColor}22`, border: `1px solid ${skin.primaryColor}55` }}
            >
              <Bot className="w-5 h-5" style={{ color: skin.primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
                  Sentinel AI Security Advisor
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px]" style={{ color: skin.textMutedColor }}>
                Server-side Gemini 2.5 Intelligence Proxy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border transition-colors hover:bg-white/10 cursor-pointer"
            style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${skin.primaryColor}22` }}
                >
                  <Bot className="w-4 h-4" style={{ color: skin.primaryColor }} />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                  m.sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none border'
                }`}
                style={{
                  backgroundColor: m.sender === 'user' ? skin.primaryColor : skin.cardColor,
                  color: m.sender === 'user' ? (skin.isDark ? '#000' : '#fff') : skin.textPrimaryColor,
                  borderColor: m.sender === 'assistant' ? skin.borderColor : undefined,
                }}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${skin.accentSecondary}22` }}
                >
                  <User className="w-4 h-4" style={{ color: skin.accentSecondary }} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${skin.primaryColor}22` }}>
                <Bot className="w-4 h-4" style={{ color: skin.primaryColor }} />
              </div>
              <div
                className="p-3 rounded-2xl border text-xs flex items-center gap-2"
                style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor, color: skin.textMutedColor }}
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: skin.primaryColor }} />
                <span>Analyzing threat telemetry...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t" style={{ borderColor: `${skin.borderColor}55`, backgroundColor: skin.surfaceColor }}>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors hover:scale-105 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: skin.cardColor,
                borderColor: skin.borderColor,
                color: skin.textSecondaryColor,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t flex items-center gap-2" style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Sentinel AI about cyber threats, WireGuard, or IMSI..."
            className="flex-1 py-2.5 px-4 rounded-xl border text-xs outline-none transition-all"
            style={{
              backgroundColor: skin.cardColor,
              borderColor: skin.borderColor,
              color: skin.textPrimaryColor,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: skin.primaryColor,
              color: skin.isDark ? '#000' : '#fff',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
