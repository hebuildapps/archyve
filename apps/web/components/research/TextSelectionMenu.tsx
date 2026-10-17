'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface TextSelectionMenuProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  onAddToAssistant: (text: string) => void;
}

interface MenuCoords {
  top: number;
  left: number;
  width: number;
}

export function TextSelectionMenu({ containerRef, onAddToAssistant }: TextSelectionMenuProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelection = useCallback(() => {
    if (typeof window === 'undefined') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setCoords(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setCoords(null);
      setSelectedText('');
      return;
    }

    // Ensure the selection occurred within the dossier container if specified
    if (containerRef?.current) {
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (
        !anchorNode ||
        !focusNode ||
        !containerRef.current.contains(anchorNode) ||
        !containerRef.current.contains(focusNode)
      ) {
        setCoords(null);
        setSelectedText('');
        return;
      }
    }

    // Avoid triggering when selecting text inside inputs or textareas
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      setCoords(null);
      setSelectedText('');
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setCoords(null);
        return;
      }

      setSelectedText(text);
      // Position above the selection
      setCoords({
        top: Math.max(10, rect.top - 46),
        left: rect.left + rect.width / 2,
        width: rect.width,
      });
    } catch {
      setCoords(null);
    }
  }, [containerRef]);

  useEffect(() => {
    const handleDocumentSelectionChange = () => {
      // Small debounce to allow mouseup to settle
      requestAnimationFrame(handleSelection);
    };

    const handleScrollOrResize = () => {
      // Re-calculate or hide on major scroll
      handleSelection();
    };

    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [handleSelection]);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      onAddToAssistant(selectedText);
      setCoords(null);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!mounted || !coords || !selectedText) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <button
        type="button"
        onClick={handleAddClick}
        className="group inline-flex items-center gap-2 px-2.5 py-2.5 rounded-full bg-neutral-900/95 dark:bg-neutral-100/95 text-neutral-100 dark:text-neutral-900 border border-neutral-700/50 dark:border-neutral-300/50 shadow-xl backdrop-blur-md text-xs font-sans font-medium transition-all cursor-pointer"
      >
        <span className="tracking-tight">Add to assistant</span>
        <ArrowRight className="w-3 h-3 rotate-45 opacity-60 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>,
    document.body
  );
}
