import { useState, useEffect, useRef } from 'react';
import { useDietPlan, useSaveDietPlan, useDeleteDietPlan, useDietChat, useGenerateDiet } from '@/api/diet';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UtensilsCrossed, Bot, Send, Loader2, Sparkles, Trash2, Save, Edit3, X, Check } from 'lucide-react';

export default function DietPage() {
  const { data: plan, isLoading } = useDietPlan();
  const savePlan = useSaveDietPlan();
  const deletePlan = useDeleteDietPlan();
  const dietChat = useDietChat();
  const generateDiet = useGenerateDiet();

  // Diet plan editing
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saved, setSaved] = useState(false);

  // AI Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Generate
  const [showGenerate, setShowGenerate] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [generatedDiet, setGeneratedDiet] = useState('');

  useEffect(() => {
    if (plan) {
      setEditContent(plan.content);
    }
  }, [plan]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSave = () => {
    if (!editContent.trim()) return;
    savePlan.mutate(editContent.trim(), {
      onSuccess: () => {
        setIsEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  const handleDelete = () => {
    deletePlan.mutate(undefined, {
      onSuccess: () => {
        setEditContent('');
        setIsEditing(false);
      },
    });
  };

  const handleStartEdit = () => {
    setEditContent(plan?.content || '');
    setIsEditing(true);
  };

  const handleAsk = () => {
    if (!question.trim()) return;
    const q = question.trim();
    const newHistory = [...chatHistory, { role: 'user', content: q }];
    setChatHistory(newHistory);
    setQuestion('');

    dietChat.mutate(
      { question: q, history: chatHistory },
      {
        onSuccess: (data) => {
          setChatHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
        },
        onError: () => {
          setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Failed to get response. Try again.' }]);
        },
      },
    );
  };

  const handleGenerate = () => {
    generateDiet.mutate(preferences.trim() || undefined, {
      onSuccess: (data) => {
        setGeneratedDiet(data.diet);
      },
    });
  };

  const handleUseGenerated = () => {
    setEditContent(generatedDiet);
    setIsEditing(true);
    setShowGenerate(false);
    setGeneratedDiet('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-2">
        <div className="h-8 w-32 rounded bg-surface-light/50 animate-pulse" />
        <div className="h-64 rounded-xl bg-surface-light/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Diet</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setShowGenerate((p) => !p); setChatOpen(false); }}
        >
          <Sparkles className="w-4 h-4 mr-1" /> AI Generate
        </Button>
      </div>

      {/* AI Generate Section */}
      {showGenerate && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-primary">Generate Diet with AI</p>
          </div>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Any preferences? e.g. vegetarian, no dairy, high protein, Indian food..."
            rows={2}
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none resize-none mb-3"
          />
          {generatedDiet ? (
            <div className="space-y-3">
              <div className="bg-background rounded-xl p-3 text-sm text-text leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {generatedDiet}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleUseGenerated}>
                  <Check className="w-4 h-4 mr-1" /> Use This Diet
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setGeneratedDiet('')}>
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              loading={generateDiet.isPending}
              onClick={handleGenerate}
            >
              Generate My Diet Plan
            </Button>
          )}
        </Card>
      )}

      {/* Current Diet Plan */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-text-muted" />
            <p className="text-text-muted text-xs uppercase tracking-wide font-medium">My Diet Plan</p>
          </div>
          {plan && !isEditing && (
            <div className="flex gap-1">
              <button onClick={handleStartEdit} className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-light transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={`Enter your diet plan, e.g.:\n9:15am - 50gm paneer + 1tbsp chia seeds\n9:35am - breakfast (poha/daliya)\n10:00am - 1 multivitamin\n...\nNote: drink 2ltr water`}
              rows={14}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none resize-none font-mono leading-relaxed"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" loading={savePlan.isPending} onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : plan ? (
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {plan.content}
          </div>
        ) : (
          <div className="text-center py-8">
            <UtensilsCrossed className="w-10 h-10 text-surface-light mx-auto mb-3" />
            <p className="text-text-muted text-sm mb-4">No diet plan yet. Add your daily meals.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1" /> Write My Diet
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowGenerate(true); }}>
                <Sparkles className="w-4 h-4 mr-1" /> AI Generate
              </Button>
            </div>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-success text-sm mt-2">
            <Check className="w-4 h-4" /> Diet plan saved
          </div>
        )}
      </Card>

      {/* AI Diet Chat */}
      <Card className="p-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => { setChatOpen((p) => !p); setShowGenerate(false); }}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <p className="text-sm font-bold text-primary">Ask AI About Your Diet</p>
          </div>
          <span className="text-xs text-text-muted">{chatOpen ? 'Close' : 'Open'}</span>
        </button>

        {chatOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-text-muted">
              Ask anything about your diet — calorie adjustments, weight progress, macro splits, meal timing...
            </p>

            {/* Chat messages */}
            {chatHistory.length > 0 && (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary/15 text-text ml-8'
                        : 'bg-background text-text mr-8'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {dietChat.isPending && (
                  <div className="flex items-center gap-2 text-text-muted text-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Why is my weight not increasing?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="flex-1 h-11 rounded-xl bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
              />
              <button
                onClick={handleAsk}
                disabled={dietChat.isPending || !question.trim()}
                className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center disabled:opacity-50 touch-manipulation"
              >
                {dietChat.isPending ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
