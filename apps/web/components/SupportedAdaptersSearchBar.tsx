'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

import { SUPPORTED_ADAPTERS, type AdapterOption } from '@/lib/adapters/config';

interface SupportedAdaptersSearchBarProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}

/**
 * Split a string into two visual halves for the center-split tilt effect
 */
function SplitTiltText({
  text,
  isTransitioning,
  className = '',
  style = {},
}: {
  text: string;
  isTransitioning: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const midpoint = Math.ceil(text.length / 2);
  const leftHalf = text.slice(0, midpoint);
  const rightHalf = text.slice(midpoint);

  return (
    <span className={`inline-flex items-center ${className}`} style={style}>
      <span
        className={`inline-block ${isTransitioning
          ? 'animate-center-split-out-left'
          : 'animate-center-split-in-left'
          }`}
      >
        {leftHalf}
      </span>
      <span
        className={`inline-block ${isTransitioning
          ? 'animate-center-split-out-right'
          : 'animate-center-split-in-right'
          }`}
      >
        {rightHalf}
      </span>
    </span>
  );
}

export function SupportedAdaptersSearchBar({
  urlInput,
  setUrlInput,
  onSubmit,
  error,
}: SupportedAdaptersSearchBarProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const isHoveredByUserRef = useRef(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Transition controller
  useEffect(() => {
    if (activeIndex === displayedIndex) return;
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDisplayedIndex(activeIndex);
      setIsTransitioning(false);
    }, 240);

    return () => clearTimeout(timer);
  }, [activeIndex, displayedIndex]);

  // Automated rotating carousel: stays for 2000ms and transitions to next
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHoveredByUserRef.current) {
        setActiveIndex((prev) => (prev + 1) % SUPPORTED_ADAPTERS.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handlePillMouseEnter = (index: number) => {
    isHoveredByUserRef.current = true;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveIndex(index);
  };

  const handlePillMouseLeave = () => {
    // When cursor leaves, keep cycle paused for ~2000ms before resuming rotation
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveredByUserRef.current = false;
    }, 3000);
  };

  const handlePillClick = (adapter: AdapterOption, index: number) => {
    // Select the adapter preview without inserting any URL into the search bar
    setActiveIndex(index);
  };

  const currentAdapter = SUPPORTED_ADAPTERS[displayedIndex] || SUPPORTED_ADAPTERS[0];
  const hasInput = Boolean(urlInput.trim());

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* SUPPORTS strip with exact filled pills matching screenshot */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 select-none">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/75 font-semibold mr-1">
          SUPPORTS
        </span>

        {SUPPORTED_ADAPTERS.map((adapter, idx) => {
          return (
            <button
              key={adapter.id}
              type="button"
              onMouseEnter={() => handlePillMouseEnter(idx)}
              onMouseLeave={handlePillMouseLeave}
              onClick={() => handlePillClick(adapter, idx)}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-sans font-bold transition-all duration-200 cursor-pointer shadow-xs opacity-95 hover:opacity-100 hover:-translate-y-0.5"
              style={{
                backgroundColor: adapter.bgColor,
                color: adapter.fgColor,
              }}
            >
              {/* Slanting lines square icon */}
              <span
                className="w-3.5 h-3.5 rounded-[2px] shrink-0"
                style={{
                  backgroundImage: `repeating-linear-gradient(135deg, ${adapter.fgColor} 0, ${adapter.fgColor} 1.5px, transparent 1.5px, transparent 3.5px)`,
                  backgroundColor: `color-mix(in srgb, ${adapter.fgColor} 28%, transparent)`,
                }}
              />
              <span className="tracking-tight">{adapter.name}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic e.g. <Adapter Name> with Center Rise & Tilt */}
      <div className="flex items-center gap-1.5 px-1 font-mono text-xs overflow-hidden h-5 select-none">
        <span className="text-muted-foreground/70">e.g.</span>
        <div className="relative inline-block">
          <SplitTiltText
            key={`title-${currentAdapter.id}-${displayedIndex}`}
            text={currentAdapter.name}
            isTransitioning={isTransitioning}
            className="font-semibold"
            style={{ color: currentAdapter.bgColor }}
          />
        </div>
      </div>

      {/* Search Input Container with Echoed Right-Bottom Border */}
      <form onSubmit={onSubmit} className="relative w-full">
        {/* Outer offset container providing the bottom-right echoed border layer */}
        <div className="relative w-full rounded-xl transition-all duration-300">
          {/* Echo Border Element positioned behind at right-bottom side */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300"
            style={{
              transform: 'translate(4px, 4px)',
              backgroundColor: currentAdapter.bgColor,
              opacity: 0.95,
              zIndex: 0,
            }}
          />

          {/* Main Search Bar Box - Outline border is synced with the supporter color */}
          <div
            className="relative z-10 rounded-xl bg-[#171a1c] dark:bg-[#121516] p-1 shadow-sm transition-colors duration-300"
            style={{
              border: `1.5px solid ${currentAdapter.bgColor}`,
            }}
          >
            <div className="flex items-center gap-2 px-1">
              <div className="relative flex-1 flex items-center min-w-0 pl-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-transparent py-2 text-xs sm:text-sm font-mono text-[#dcdedc] placeholder:text-transparent focus:outline-none z-20 relative"
                  placeholder=""
                  autoComplete="off"
                  spellCheck="false"
                />

                {/* Animated Dynamic Placeholder with Center Rise & Tilt */}
                {!urlInput && (
                  <div className="absolute inset-y-0 left-2 right-0 flex items-center pointer-events-none z-10 overflow-hidden">
                    <SplitTiltText
                      key={`placeholder-${currentAdapter.id}-${displayedIndex}`}
                      text={currentAdapter.displayUrl}
                      isTransitioning={isTransitioning}
                      className="font-mono text-[10px] sm:text-[10px] text-[#7e8785] truncate"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`shrink-0 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-medium text-xs transition-all duration-200 cursor-pointer shadow-xs border ${
                  hasInput
                    ? 'bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-900 border-white/20 shadow-sm'
                    : 'bg-[#545759] hover:bg-[#626668] active:bg-[#4b4e50] text-[#e8ebec] border-white/5'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  className={`pt-0.5 w-5.5 h-5.5 transition-colors duration-200 ${
                    hasInput ? 'text-neutral-900' : 'text-[#cfd2d4]'
                  }`}
                >
                  <rect width="256" height="256" fill="none" />
                  <rect
                    x="40"
                    y="40"
                    width="176"
                    height="176"
                    rx="8"
                    transform="translate(0 256) rotate(-90)"
                    opacity={hasInput ? "0.15" : "0.2"}
                    fill={hasInput ? "#000000" : "#000000"}
                  />
                  <rect
                    x="40"
                    y="40"
                    width="176"
                    height="176"
                    rx="8"
                    transform="translate(0 256) rotate(-90)"
                    fill="none"
                    stroke={hasInput ? "#171a1c" : "transparent"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <line
                    x1="160"
                    y1="96"
                    x2="96"
                    y2="160"
                    fill="none"
                    stroke={hasInput ? "#171a1c" : "#000000"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <polyline
                    points="112 96 160 96 160 144"
                    fill="none"
                    stroke={hasInput ? "#171a1c" : "#000000"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                </svg>
                <span>Analyze</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-mono pl-2 mt-2">{error}</p>
        )}
      </form>
    </div>
  );
}
