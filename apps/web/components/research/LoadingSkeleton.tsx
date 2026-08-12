import React from 'react';
import { Loader2, Check, FileText } from 'lucide-react';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed';
}

interface LoadingSkeletonProps {
  steps?: LoadingStep[];
  paperTitle?: string;
  paperAuthors?: string[];
  progressPercent?: number;
  statusMessage?: string;
}

const defaultSteps: LoadingStep[] = [
  { id: 'identify', label: 'Identifying publisher page and adapters', status: 'loading' },
  { id: 'cache', label: 'Checking cache and database persistence', status: 'pending' },
  { id: 'metadata', label: 'Enriching academic metadata (Crossref / OpenAlex)', status: 'pending' },
  { id: 'open_access', label: 'Scanning open-access repositories (arXiv / Unpaywall)', status: 'pending' },
  { id: 'ai', label: 'Generating structured AI dossier analysis', status: 'pending' },
];

export function LoadingSkeleton({ 
  steps = defaultSteps, 
  paperTitle, 
  paperAuthors,
  progressPercent: customProgressPercent,
  statusMessage
}: LoadingSkeletonProps) {
  // Compute progress percentage based on completed steps or custom value
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = typeof customProgressPercent === 'number' 
    ? customProgressPercent 
    : Math.min(completedCount * 20, 105); // cap or clamp later

  return (
    <div className="space-y-6 max-w-xl mx-auto py-12 px-4 font-sans">
      
      <div className="text-center pb-4">
        <h2 className="text-lg font-serif font-semibold text-zinc-950 dark:text-zinc-50 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          <span>Researching Paper...</span>
        </h2>
      </div>

      {/* "You're Looking for:" Box (Inspiration: img 3) */}
      {paperTitle && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-1.5 shadow-sm">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            You&apos;re Looking for:
          </span>
          <div className="flex items-start gap-3.5 pt-1">
            <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-850 dark:text-zinc-100 leading-snug line-clamp-2">
                {paperTitle}
              </h3>
              {paperAuthors && paperAuthors.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-sans">
                  {paperAuthors.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Research Progress" Percentage Card (Inspiration: img 3) */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-3.5 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
            Research Progress
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50 flex items-baseline justify-between">
            <span>{Math.min(progressPercent, 100)}%</span>
            {statusMessage && (
              <span className="text-[11px] font-sans font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar track */}
        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-zinc-950 dark:bg-zinc-50 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Step List Card (Inspiration: img 3) */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-4 shadow-sm">
        <div className="space-y-3">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isLoading = step.status === 'loading';
            
            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Custom Checklist Icon (Inspiration: img 3 check circle) */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : isLoading 
                    ? 'border-zinc-400 dark:border-zinc-650 bg-transparent text-zinc-500' 
                    : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-transparent'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <span className={`text-xs block leading-relaxed ${
                    isCompleted 
                      ? 'text-zinc-800 dark:text-zinc-200 font-semibold' 
                      : isLoading 
                      ? 'text-zinc-950 dark:text-white font-semibold animate-pulse' 
                      : 'text-zinc-400 dark:text-zinc-650'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
