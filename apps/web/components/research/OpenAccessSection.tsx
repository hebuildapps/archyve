import React from 'react';
import { ShieldCheck, FileDown, AlertTriangle } from 'lucide-react';

interface OpenAccessSectionProps {
  available: boolean;
  sourceName?: string | null;
  url?: string | null;
}

export function OpenAccessSection({
  available,
  sourceName,
  url,
}: OpenAccessSectionProps) {
  return (
    <section className="mb-10 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/5">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
        Open Access Check
      </h2>

      {available && url ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Legitimate Free Version Available
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Verified on {sourceName || 'Open-Access Repositories'}
              </div>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Read Free Version</span>
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 py-1">
          <AlertTriangle className="w-4.5 h-4.5 text-zinc-400" />
          <span className="text-sm font-mono">
            No legitimate open-access version identified. Publisher paywall may apply.
          </span>
        </div>
      )}
    </section>
  );
}
