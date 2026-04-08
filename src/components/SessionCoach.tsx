import { useState } from 'react';
import { useSessionCoach } from '@/api/ai';
import { Bot, Send, Loader2, X } from 'lucide-react';

interface SessionCoachProps {
  sessionId: string;
}

export default function SessionCoach({ sessionId }: SessionCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const coach = useSessionCoach();

  const handleAsk = () => {
    if (!question.trim()) return;
    setAnswer('');
    coach.mutate(
      { sessionId, question: question.trim() },
      {
        onSuccess: (data) => {
          setAnswer(data.answer);
          setQuestion('');
        },
        onError: (err: any) => {
          setAnswer(err.userMessage || 'Failed to get response. Try again.');
        },
      },
    );
  };

  const handleClose = () => {
    setIsOpen(false);
    setAnswer('');
    setQuestion('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-4 z-50 w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
      >
        <Bot className="w-7 h-7 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text">AI Coach</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-text-muted active:text-text touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Answer */}
        {answer && (
          <div className="bg-background rounded-xl p-3 text-sm text-text leading-relaxed">
            {answer}
          </div>
        )}

        {coach.isError && !answer && (
          <div className="bg-danger/10 rounded-xl p-3 text-sm text-danger">
            Failed to get response. Try again.
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Should I go heavier? Keep same weight?..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            className="flex-1 h-12 rounded-xl bg-background border border-border px-4 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            autoFocus
          />
          <button
            onClick={handleAsk}
            disabled={coach.isPending || !question.trim()}
            className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center disabled:opacity-50 touch-manipulation"
          >
            {coach.isPending ? (
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
