import type { AIAnalysisResponse } from '@/types';
import { Brain } from 'lucide-react';

interface AnalysisResultProps {
  data: AIAnalysisResponse;
}

export default function AnalysisResult({ data }: AnalysisResultProps) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-[#6366f1]" />
          Analysis
        </h3>
        <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-line">
          {data.analysis}
        </p>
      </div>
      {data.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Suggestions</h4>
          <ol className="list-decimal list-inside space-y-1.5">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-[#94a3b8] leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
