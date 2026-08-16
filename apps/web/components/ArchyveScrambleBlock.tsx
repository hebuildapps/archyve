"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

interface ArchyveScrambleBlockProps {
  text?: string;
  onClick?: () => void;
  className?: string;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>[]{}/~+=-_";

export function ArchyveScrambleBlock({
  text = "Archyve Intelligence",
  onClick,
  className = "",
}: ArchyveScrambleBlockProps) {
  const [displayText, setDisplayText] = useState(text);
  const isHoveredRef = useRef(false);

  // Scrambler engine
  const scrambleAndResolve = useCallback(() => {
    const originalText = text;
    const len = originalText.length;
    let step = 0;
    const scrambleDurationSteps = 12; // Initial random scramble frames (~360ms)
    const resolveSpeed = 2; // Steps per character resolution
    let lockIndex = len; // locks from len down to 0 (right-to-left)

    const interval = setInterval(() => {
      step++;

      if (step <= scrambleDurationSteps) {
        // Phase 1: Pure random scramble across all characters
        const scrambled = originalText
          .split("")
          .map((char) => {
            if (char === " ") return " ";
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");
        setDisplayText(scrambled);
      } else {
        // Phase 2: Right-to-left resolution
        // Calculate which characters from the end are locked
        const resolveStep = step - scrambleDurationSteps;
        lockIndex = len - Math.floor(resolveStep / resolveSpeed);

        if (lockIndex <= 0) {
          // Fully resolved back to original text
          setDisplayText(originalText);
          clearInterval(interval);
          return;
        }

        const resolved = originalText
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i >= lockIndex) {
              // Locked to actual original character
              return originalText[i];
            }
            // Still actively scrambling
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");

        setDisplayText(resolved);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  // Looping schedule: hold for 3.8s, scramble & resolve, repeat
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isCancelled = false;

    const runLoop = () => {
      if (isCancelled) return;
      cleanup = scrambleAndResolve();

      // Next cycle after resolution + hold period (~4.5s total)
      timeoutId = setTimeout(() => {
        runLoop();
      }, 4600);
    };

    let timeoutId = setTimeout(runLoop, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [scrambleAndResolve]);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className={`group relative inline-flex items-center cursor-pointer border-none bg-transparent p-0 transition-transform active:scale-[0.98] ${className}`}
      aria-label={text}
    >
      {/* 
        Sharp-cornered rectangular background block matching @archyve-logo.svg.
        The block height is sized from top to baseline so characters with descenders 
        ('y', 'g', 'p', etc.) extend outside the bottom edge, recreating the Greptile effect.
      */}
      <span
        className="absolute inset-x-0 top-0 bottom-[5px] bg-[#B7FF38] shadow-[0_1px_3px_rgba(10,28,0,0.15)] group-hover:bg-[#a6f720] transition-colors"
        style={{
          borderRadius: "0px", // Strict sharp geometric corners
        }}
      />

      {/* Text layer with sharp monospace/geometric character */}
      <span className="relative z-10 px-2.5 pt-0.5 pb-1 font-mono text-xs font-bold tracking-tight block-text leading-none select-none flex items-center">
        {displayText.split("").map((char, index) => {
          // Check if char naturally breaks out below baseline
          const isDescender = "ygjpq,".includes(char);
          return (
            <span
              key={index}
              className={`inline-block transition-transform duration-75 ${isDescender ? "relative z-20 font-bold" : ""
                }`}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      </span>
    </button>
  );
}

export default ArchyveScrambleBlock;
