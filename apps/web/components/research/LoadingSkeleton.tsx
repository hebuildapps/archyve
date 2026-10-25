import React from 'react';

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

export function LoadingSkeleton({
  steps,
  progressPercent: customProgressPercent,
  statusMessage,
}: LoadingSkeletonProps) {
  // Compute progress percentage based on completed steps or custom percent
  let computedPercent = 0;
  if (typeof customProgressPercent === 'number') {
    computedPercent = customProgressPercent;
  } else if (steps && steps.length > 0) {
    const completedCount = steps.filter((s) => s.status === 'completed').length;
    computedPercent = Math.min((completedCount / steps.length) * 100, 100);
  } else {
    computedPercent = 15;
  }

  const clampedPercent = Math.min(Math.max(computedPercent, 0), 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d0f] select-none">
      {/* Centered Composition */}
      <div className="flex flex-col items-center">
        {/* Archyve Brand Emblem */}
        <div className="flex items-center justify-center">
          <img
            src="/archyve-logo.svg"
            alt="Archyve"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
          />
        </div>

        {/* Thin Horizontal Progress Line */}
        <div className="mt-5 w-[160px] h-[1.5px] bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B7FF38]/35 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${clampedPercent}%` }}
          />
        </div>

        {/* Understated Typography & Sub-state Feedback */}
        <div className="mt-2.5 flex flex-col items-center gap-1">
          <p className="text-[11px] font-normal tracking-[-0.01em] text-[#636369] font-sans">
            Loading…
          </p>
          {statusMessage && statusMessage !== 'Loading…' && (
            <p className="text-[10px] font-normal tracking-tight text-[#8e8e93] font-sans transition-all duration-300">
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
