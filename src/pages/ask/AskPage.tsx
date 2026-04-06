import { useState, useRef, useEffect } from 'react';
import { useFitnessChat } from '@/api/ai';
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How much protein should I eat daily?',
  'Best exercises for chest growth?',
  'How to break a bench press plateau?',
  'Should I do cardio while bulking?',
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const chat = useFitnessChat();

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const question = (text || input).trim();
    if (!question || chat.isPending) return;

    const userMsg: Message = { id: ++idRef.current, role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    chat.mutate(
      { question },
      {
        onSuccess: (data) => {
          const aiMsg: Message = { id: ++idRef.current, role: 'assistant', content: data.answer };
          setMessages((prev) => [...prev, aiMsg]);
        },
        onError: () => {
          const errMsg: Message = {
            id: ++idRef.current,
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          };
          setMessages((prev) => [...prev, errMsg]);
        },
      },
    );
  };

  const handleClear = () => {
    setMessages([]);
    chat.reset();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Ask AI</h1>
          <p className="text-xs text-text-muted">Your personal fitness assistant</p>
        </div>
        {!isEmpty && (
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-text-muted hover:text-danger active:scale-95 transition-all touch-manipulation"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-text mb-1">Fitness Assistant</h2>
              <p className="text-sm text-text-muted max-w-[280px]">
                Ask me anything about exercise, diet, workout plans, supplements, or recovery.
              </p>
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs text-text-muted text-center">Try asking</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl bg-surface border border-border hover:border-primary/50 text-text transition-colors active:scale-[0.98] touch-manipulation"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-surface border border-border text-text rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-surface-light flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} className="text-text-muted" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {chat.isPending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="pt-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about fitness, diet, exercises..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 h-12 rounded-xl bg-surface border border-border px-4 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={chat.isPending || !input.trim()}
            className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform touch-manipulation"
          >
            {chat.isPending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
