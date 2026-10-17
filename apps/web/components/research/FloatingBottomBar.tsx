'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';

interface FloatingBottomBarProps {
  isOpen: boolean;
  onOpen: () => void;
}

export function FloatingBottomBar({ isOpen, onOpen }: FloatingBottomBarProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
    }
  }, []);

  // Listen for Ctrl+I / Cmd+I shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);

  // If sidebar is already open, hide the bottom floating trigger to avoid clutter
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="group flex items-center gap-4 pl-4 pr-2 py-2 rounded-full bg-card/90 dark:bg-[#1A2323]/90 backdrop-blur-xl border border-border hover:border-brand-primary/60 dark:hover:border-brand-accent/60 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer select-none max-w-sm"
      >
        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />
          <span className="text-xs sm:text-sm font-sans font-normal tracking-tight">
            Ask a question...
          </span>
        </div>

        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground/80 bg-muted/80 rounded-md border border-border/80 tracking-tighter">
            {isMac ? '⌘I' : 'Ctrl+I'}
          </kbd>

          <div
            className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 active:scale-95 transition-transform"
            aria-label="Open Assistant"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>
    </div>
  );
}
