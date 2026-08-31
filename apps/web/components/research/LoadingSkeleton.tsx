import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Check, FileText } from 'lucide-react';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed';
  detail?: string;
  badge?: string;
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

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>[]{}/~+=-_";

function ScrambleStepText({
  targetText,
  detailText,
  isCompleted
}: {
  targetText: string;
  detailText?: string;
  isCompleted: boolean;
}) {
  const [text, setText] = useState(targetText);
  const prevCompletedRef = useRef(false);

  useEffect(() => {
    // When transitioning into completed state, trigger a quick high-tech scramble resolve
    if (isCompleted && !prevCompletedRef.current) {
      prevCompletedRef.current = true;
      const fullTarget = detailText ? `${targetText} — ${detailText}` : targetText;
      const len = fullTarget.length;
      let step = 0;
      const scrambleDuration = 6; // quick burst (~180ms)
      const resolveSpeed = 3;

      const interval = setInterval(() => {
        step++;
        if (step <= scrambleDuration) {
          const scrambled = fullTarget
            .split("")
            .map((c) => (c === " " || c === "—" || c === ":" ? c : CHARS[Math.floor(Math.random() * CHARS.length)]))
            .join("");
          setText(scrambled);
        } else {
          const resolveStep = step - scrambleDuration;
          const lockIndex = Math.min(len, resolveStep * resolveSpeed);

          const resolved = fullTarget
            .split("")
            .map((c, i) => {
              if (c === " " || c === "—" || c === ":") return c;
              if (i < lockIndex) return fullTarget[i];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join("");

          setText(resolved);

          if (lockIndex >= len) {
            setText(fullTarget);
            clearInterval(interval);
          }
        }
      }, 25);

      return () => clearInterval(interval);
    } else if (isCompleted && detailText) {
      setText(`${targetText} — ${detailText}`);
    } else {
      setText(targetText);
    }
  }, [isCompleted, targetText, detailText]);

  return (
    <span className="font-mono text-xs leading-relaxed inline-block break-words">
      {text}
    </span>
  );
}

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
    : Math.min(completedCount * 25, 100);

  const activeStep = steps.find((s) => s.status === 'loading') || steps.find((s) => s.status === 'pending');

  return (
    <div className="space-y-6 max-w-xl mx-auto py-12 px-4 font-sans selection:bg-brand-primary/20">

      {/* Header with Pulsating Status */}
      <div className="text-center space-y-1.5 pb-2">
        <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight flex items-center justify-center gap-2.5">
          <span>Synthesizing Intelligence...</span>
        </h2>
      </div>

      {/* "Target Paper" Card if available */}
      {paperTitle && (
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card space-y-2 shadow-xs relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-primary">
              Target Document
            </span>
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-card-muted border border-border">
              Parsed
            </span>
          </div>

          <div className="flex items-start gap-3.5 pt-0.5">
            <div className="w-9 h-9 rounded-xl bg-card-muted border border-border flex items-center justify-center text-brand-primary shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-serif font-medium text-foreground leading-snug line-clamp-2">
                {paperTitle}
              </h3>
              {paperAuthors && paperAuthors.length > 0 && (
                <p className="text-[11px] text-muted-foreground truncate mt-1 font-mono">
                  {paperAuthors.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Research Progress" Percentage Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Research Progress</span>
            <span className="text-foreground font-bold">{Math.min(progressPercent, 100)}%</span>
          </div>

          <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tracking-tight flex items-baseline justify-between">
            <span>{Math.min(progressPercent, 100)}<span className="text-xl font-mono text-muted-foreground ml-0.5">%</span></span>
            {statusMessage && (
              <span className="text-xs font-mono font-normal text-brand-primary animate-pulse text-right line-clamp-1 max-w-[280px]">
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Progress Track with high-tech glowing sweep */}
        <div className="relative w-full h-2.5 bg-card-muted rounded-full overflow-hidden border border-border/50">
          <div
            className="h-full bg-brand-primary rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          >
            {/* Glow sweep reflection */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Step List Card with Monospace Scramble Resolvers */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Pipeline Execution Checklist
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {completedCount} of {steps.length} Complete
          </span>
        </div>

        <div className="space-y-3.5 pt-1">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isLoading = step.status === 'loading';

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3.5 p-2.5 rounded-xl transition-all duration-300 ${isLoading
                    ? 'bg-brand-primary/5 border border-brand-primary/20 shadow-xs'
                    : isCompleted
                      ? 'bg-card-muted/20 border border-transparent'
                      : 'opacity-50 border border-transparent'
                  }`}
              >
                {/* Step indicator circle */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-colors duration-300 ${isCompleted
                    ? 'bg-brand-primary border-brand-primary text-brand-primary-foreground shadow-xs'
                    : isLoading
                      ? 'border-brand-primary bg-highlight-glow/30 text-brand-primary shadow-[0_0_8px_rgba(183,255,56,0.35)]'
                      : 'border-border bg-card text-transparent'
                  }`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="font-mono text-[9px] text-muted-foreground">{idx + 1}</span>
                  )}
                </div>

                {/* Step Label with Scramble Animation */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className={`transition-colors duration-200 ${isCompleted
                      ? 'text-foreground font-medium'
                      : isLoading
                        ? 'text-brand-primary font-semibold'
                        : 'text-muted-foreground'
                    }`}>
                    <ScrambleStepText
                      targetText={step.label}
                      detailText={step.detail}
                      isCompleted={isCompleted}
                    />
                  </div>

                  {step.badge && (
                    <span className="inline-block px-1.5 py-0.2 rounded font-mono text-[9px] bg-card-muted text-muted-foreground border border-border mt-0.5">
                      {step.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
