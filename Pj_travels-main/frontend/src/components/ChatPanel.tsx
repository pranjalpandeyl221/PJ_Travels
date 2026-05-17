import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '../types';
import ChatMessage from './ChatMessage';

interface Props {
  messages: Message[];
  planning: boolean;
  onSend: (prompt: string) => void;
}

const SUGGESTIONS = [
  "Plan a 4-day trip to Gwalior under INR 12,000",
  "Weekend getaway to Jaipur for 2",
  "5-day Kerala trip for family of 4",
  "Backpacking in Himachal for 7 days",
];

export default function ChatPanel({ messages, planning, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || planning) return;
    setInput('');
    onSend(trimmed);
  };

  const hasMessages = messages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className="w-2 h-2 rounded-full bg-ocean" />
        <span className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
          Chat
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scroll-smooth">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full ocean-gradient flex items-center justify-center text-white text-lg mb-3">
              ✈️
            </div>
            <p className="text-sm text-night-600 leading-relaxed">
              Tell us where you want to go and we&apos;ll plan your perfect trip.
            </p>
            <p className="text-xs text-ocean-500/60 mt-1">
              Try: &ldquo;{SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]}&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {planning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5"
          >
            <span className="w-6 h-6 rounded-full ocean-gradient flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 mt-0.5">
              P
            </span>
            <div className="bg-white border border-ocean-100 rounded-2xl rounded-tl-sm px-4 py-3 card-shadow">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-ocean/60"
                    style={{
                      animation: 'bounceDot 1.2s infinite ease-in-out',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="pt-3 mt-auto">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasMessages ? "Ask for changes..." : "Where do you want to go?"}
            disabled={planning}
            className="w-full px-4 py-2.5 pr-10 text-sm bg-white border border-ocean-100 rounded-xl placeholder:text-ocean-400/50 text-night-800 focus:outline-none focus:border-ocean/40 focus:ring-2 focus:ring-ocean/10 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || planning}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg ocean-gradient flex items-center justify-center text-white text-xs disabled:opacity-30 transition-opacity"
          >
            ↑
          </button>
        </div>
      </form>
    </motion.div>
  );
}