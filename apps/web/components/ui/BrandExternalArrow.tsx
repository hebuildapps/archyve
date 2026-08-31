'use client';

import React from 'react';

interface BrandExternalArrowProps {
  className?: string;
}

export function BrandExternalArrow({ className = 'h-3.5 w-3.5' }: BrandExternalArrowProps) {
  return (
    <span className={`relative inline-flex ${className} shrink-0`}>
      {/* Static base line */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className="absolute inset-0 h-full w-full fill-current text-brand-primary dark:text-lime-400"
      >
        <path d="M224,216a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,216Z" />
      </svg>

      {/* Animated arrow that moves on group-hover */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="56 48 152 136"
        className="absolute inset-0 h-2.5 w-2.5 fill-current text-brand-primary dark:text-lime-400 transition-all duration-300 ease-out translate-x-[2.5px] translate-y-[1px] group-hover:translate-x-[4.5px] group-hover:-translate-y-[1px]"
      >
        <path d="M80,176a8,8,0,0,0,5.66-2.34L184,75.31V152a8,8,0,0,0,16,0V56a8,8,0,0,0-8-8H96a8,8,0,0,0,0,16h76.69L74.34,162.34A8,8,0,0,0,80,176Z" />
      </svg>
    </span>
  );
}
