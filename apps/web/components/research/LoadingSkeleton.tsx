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
    : Math.min(completedCount * 20, 105);

  return (
    <div className="space-y-6 max-w-xl mx-auto py-12 px-4 font-sans">
      
      <div className="text-center pb-2">
        <h2 className="text-xl font-serif font-medium text-foreground flex items-center justify-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
          <span>Researching Paper...</span>
        </h2>
      </div>

      {/* "You're Looking for:" Box */}
      {paperTitle && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1.5 shadow-xs">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-primary">
            You&apos;re Looking for:
          </span>
          <div className="flex items-start gap-3.5 pt-1">
            <div className="w-10 h-10 rounded-xl bg-card-muted border border-border flex items-center justify-center text-brand-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-serif font-medium text-foreground leading-snug line-clamp-2">
                {paperTitle}
              </h3>
              {paperAuthors && paperAuthors.length > 0 && (
                <p className="text-xs text-muted-foreground truncate mt-0.5 font-sans">
                  {paperAuthors.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Research Progress" Percentage Card */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-3.5 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Research Progress
          </span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-baseline justify-between">
            <span>{Math.min(progressPercent, 100)}%</span>
            {statusMessage && (
              <span className="text-[11px] font-mono font-normal text-muted-foreground animate-pulse">
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar track */}
        <div className="w-full h-2 bg-card-muted rounded-full overflow-hidden border border-border/40">
          <div 
            className="h-full bg-brand-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Step List Card */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
        <div className="space-y-3">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isLoading = step.status === 'loading';
            
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  isCompleted 
                    ? 'bg-brand-primary border-brand-primary text-white' 
                    : isLoading 
                    ? 'border-brand-primary bg-highlight-glow/30 text-brand-primary' 
                    : 'border-border bg-transparent text-transparent'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <span className={`text-xs block leading-relaxed font-mono ${
                    isCompleted 
                      ? 'text-foreground font-semibold' 
                      : isLoading 
                      ? 'text-brand-primary font-semibold animate-pulse' 
                      : 'text-muted-foreground/60'
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
