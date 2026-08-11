import React from 'react';
import { Star, Clock, AlertCircle } from 'lucide-react';

interface ShouldIReadCardProps {
  score: number;
  explanation: string;
  relevanceTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadingTime: string;
}

export function ShouldIReadCard({
  score,
  explanation,
  relevanceTopics,
  difficulty,
  estimatedReadingTime,
}: ShouldIReadCardProps) {
  const getDifficultyColor = (diff: typeof difficulty) => {
    switch (diff) {
      case 'beginner':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30';
      case 'intermediate':
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30';
      case 'advanced':
        return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30';
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 p-6 mb-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800/80 mb-6">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Should you read this?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
            {explanation}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-baseline gap-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3.5 py-2 rounded-lg font-serif">
            <span className="text-2xl font-bold">{score.toFixed(1)}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-sans">/5</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mb-2">Relevance Focus</div>
          <div className="flex flex-wrap gap-1.5">
            {relevanceTopics.map((topic, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mb-2">Reading Difficulty</div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getDifficultyColor(
              difficulty
            )}`}
          >
            {difficulty}
          </span>
        </div>

        <div>
          <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mb-2">Est. Reading Time</div>
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span>{estimatedReadingTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
