'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, BookOpen, Layers } from 'lucide-react';

export interface HistoryPaper {
  id: string;
  title: string;
  publisher: string;
  publication_year: number | null;
  url: string;
  updated_at: string;
  abstract?: string | null;
  authors?: string[];
  doi?: string | null;
  venue?: string | null;
  confidence_score?: number;
  publisher_id?: string | null;
}

interface HistoryReportCardProps {
  paper: HistoryPaper;
}

export function HistoryReportCard({ paper }: HistoryReportCardProps) {
  const router = useRouter();

  const handleNavigate = () => {
    router.push(`/${encodeURIComponent(paper.url)}`);
  };

  const authorsText = paper.authors && paper.authors.length > 0
    ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
    : null;

  // Clean abstract of XML/ETX tags if present
  const cleanAbstract = paper.abstract
    ? paper.abstract.replace(/<[^>]*>?/gm, '').replace(/<<[^>]*>>?/gm, '').trim()
    : 'Full synthesis dossier, contributions breakdown, and citation intelligence available.';

  return (
    <div
      onClick={handleNavigate}
      onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
      role="button"
      tabIndex={0}
      className="group relative w-full h-[230px] rounded-2xl border border-border/80 bg-card overflow-hidden text-left transition-all duration-300 hover:border-brand-primary/60 dark:hover:border-lime-500/40 hover:shadow-xl hover:shadow-emerald-950/10 cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-brand-primary/30 select-none"
    >
      {/* 1. Underlying Report Document Layer */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between bg-radial-[at_top_left] from-card to-card-muted/30 overflow-hidden">
        
        {/* Subtle schematic technical grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: '14px 14px',
          }}
        />

        {/* Real Document Content Preview */}
        <div className="space-y-2 z-0">
          {/* Metadata bar */}
          <div className="flex items-center gap-2 pt-8">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-foreground/5 text-muted-foreground border border-border/60">
              {paper.publisher}
            </span>
            {paper.publication_year && (
              <span className="text-[10px] font-mono text-muted-foreground/80">
                {paper.publication_year}
              </span>
            )}
            {paper.doi && (
              <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[130px] hidden sm:inline">
                {paper.doi}
              </span>
            )}
          </div>

          {/* Paper Title in Document Serif */}
          <h3 className="text-sm font-serif font-medium text-foreground leading-snug line-clamp-2 tracking-tight group-hover:text-brand-primary dark:group-hover:text-lime-400 transition-colors">
            {paper.title}
          </h3>

          {/* Authors */}
          {authorsText && (
            <p className="text-[11px] font-sans text-muted-foreground/75 line-clamp-1">
              {authorsText}
            </p>
          )}

          {/* Abstract Snippet Quote */}
          <p className="text-[11px] font-serif leading-relaxed text-muted-foreground/70 line-clamp-2 italic border-l-2 border-border/70 pl-2.5 mt-1">
            "{cleanAbstract}"
          </p>
        </div>

      </div>

      {/* 2. Dithered Green Curved Arc in Bottom-Right Corner (Barely Visible / 5% Opacity Accent) */}
      <div className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none z-10 overflow-hidden rounded-br-2xl">
        <svg
          viewBox="0 0 128 128"
          className="w-full h-full text-emerald-500 dark:text-lime-400 transition-opacity duration-300 opacity-[0.05] group-hover:opacity-[0.14]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Bayer 8x8 Dithering Pattern */}
            <pattern id={`dither-matrix-${paper.id}`} width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.75" fill="currentColor" opacity="0.9" />
              <circle cx="5" cy="1" r="0.35" fill="currentColor" opacity="0.4" />
              <circle cx="3" cy="3" r="0.75" fill="currentColor" opacity="0.8" />
              <circle cx="7" cy="3" r="0.3" fill="currentColor" opacity="0.3" />
              <circle cx="1" cy="5" r="0.45" fill="currentColor" opacity="0.5" />
              <circle cx="5" cy="5" r="0.8" fill="currentColor" opacity="0.95" />
              <circle cx="3" cy="7" r="0.3" fill="currentColor" opacity="0.3" />
              <circle cx="7" cy="7" r="0.6" fill="currentColor" opacity="0.7" />
            </pattern>

            {/* 4th Quadrant Radial Glow */}
            <radialGradient id={`glow-grad-${paper.id}`} cx="0" cy="0" r="128" fx="0" fy="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.0" />
              <stop offset="60%" stopColor="currentColor" stopOpacity="0.15" />
              <stop offset="90%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </radialGradient>

            {/* 4th Quadrant Fade Mask for Dither Dots */}
            <radialGradient id={`dither-fade-grad-${paper.id}`} cx="0" cy="0" r="128" fx="0" fy="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.15" />
              <stop offset="80%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="0.8" />
            </radialGradient>

            {/* Convex 4th Quadrant Sector Mask */}
            <mask id={`dither-arc-mask-${paper.id}`}>
              <path d="M 128 0 A 128 128 0 0 1 0 128 L 128 128 Z" fill={`url(#dither-fade-grad-${paper.id})`} />
            </mask>

            {/* 4th Quadrant Clip Path */}
            <clipPath id={`arc-clip-${paper.id}`}>
              <path d="M 128 0 A 128 128 0 0 1 0 128 L 128 128 Z" />
            </clipPath>
          </defs>

          {/* 1. Underlying Glow */}
          <path
            d="M 128 0 A 128 128 0 0 1 0 128 L 128 128 Z"
            fill={`url(#glow-grad-${paper.id})`}
          />

          {/* 2. Dither Matrix */}
          <rect
            width="128"
            height="128"
            fill={`url(#dither-matrix-${paper.id})`}
            clipPath={`url(#arc-clip-${paper.id})`}
            mask={`url(#dither-arc-mask-${paper.id})`}
          />

          {/* 3. Outer Arc Curve Line */}
          <path
            d="M 128 0 A 128 128 0 0 1 0 128"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.15"
          />
        </svg>
      </div>

      {/* 3. Transparent Covering Sheath with Top-Left Name & Action */}
      <div className="absolute inset-0 z-20 pointer-events-none p-3.5 flex flex-col justify-between bg-card/35 dark:bg-background/30 backdrop-blur-[1.5px] group-hover:backdrop-blur-none group-hover:bg-transparent transition-all duration-300 rounded-2xl border border-transparent group-hover:border-brand-primary/30 dark:group-hover:border-lime-500/30">
        
        {/* Top Header on the Transparent Covering */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Top-Left Corner: Paper Name in Small Font Size */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-card/90 dark:bg-card-muted/90 backdrop-blur-md shadow-xs max-w-[80%] min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-lime-400 shrink-0 animate-pulse" />
            <span className="text-[11px] font-serif font-medium text-foreground tracking-tight truncate">
              {paper.title}
            </span>
          </div>

          {/* Top-Right Corner: Static Arrow Badge (No movement on hover) */}
          <div className="p-1 rounded-full border border-border/80 bg-card/90 dark:bg-card-muted/90 text-muted-foreground group-hover:text-brand-primary dark:group-hover:text-lime-400 group-hover:border-brand-primary/40 transition-colors shadow-xs">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Empty bottom space */}
        <div />
      </div>
    </div>
  );
}
