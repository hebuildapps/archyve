'use client';

import React from 'react';

interface BrandExternalArrowProps {
  className?: string;
}

export function BrandExternalArrow({ className = 'h-3.5 w-3.5' }: BrandExternalArrowProps) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className} shrink-0`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full text-brand-primary dark:text-lime-400 overflow-visible"
      >
        {/* Crisp flat bottom platform base line */}
        <line x1="2" y1="14.5" x2="14" y2="14.5" />

        {/* Diagonal arrow with distinct vertical gap and hover animation */}
        <g className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <line x1="4.5" y1="11.5" x2="12.5" y2="3.5" />
          <polyline points="7 3.5 12.5 3.5 12.5 9" />
        </g>
      </svg>
    </span>
  );
}

