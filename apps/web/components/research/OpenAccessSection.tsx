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
    <section className="mb-10 p-5 rounded-2xl border border-border bg-card shadow-xs">
      <h2 className="text-xs font-mono uppercase tracking-wider text-brand-primary mb-3 font-semibold">
        Open Access Check
      </h2>

      {available && url ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-highlight-glow/30 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Legitimate Free Version Available
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Verified on {sourceName || 'Open-Access Repositories'}
              </div>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Read Free Version</span>
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-muted-foreground py-1">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-mono">
            No legitimate open-access version identified. Publisher paywall may apply.
          </span>
        </div>
      )}
    </section>
  );
}
