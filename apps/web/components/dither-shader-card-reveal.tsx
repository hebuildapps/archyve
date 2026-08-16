"use client";

import React, { useEffect, useRef, useState } from "react";
import { DitherShader } from "@/components/ui/dither-shader";
import { ArrowUpRight, X, Sparkles } from "lucide-react";

interface DitherShaderCardRevealProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DitherShaderCardReveal({
  isOpen = true,
  onClose,
}: DitherShaderCardRevealProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
    isHovered: false,
  });

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // Max 12 deg tilt
    const rotateY = ((x - centerX) / centerX) * 12;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({
      rotateX,
      rotateY,
      glareX,
      glareY,
      glareOpacity: 0.25,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0,
      isHovered: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300 animate-in fade-in [perspective:1200px]"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: tilt.isHovered
            ? "transform 0.08s ease-out, box-shadow 0.15s ease-out"
            : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease",
          transformStyle: "preserve-3d",
        }}
        className="relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-white/20 bg-neutral-950 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] cursor-default will-change-transform select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Specular 3D Glare Sheen */}
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-3xl transition-opacity duration-300"
          style={{
            opacity: tilt.glareOpacity,
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.35) 0%, transparent 60%)`,
          }}
        />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md transition-all hover:bg-black/80 hover:text-white border border-white/15"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Dither Shader Container */}
        <div className="relative h-[420px] sm:h-[460px] w-full overflow-hidden">
          <DitherShader
            src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2670&auto=format&fit=crop"
            gridSize={2}
            ditherMode="bayer"
            colorMode="grayscale"
            invert={false}
            animated={false}
            animationSpeed={0.02}
            primaryColor="#000000"
            secondaryColor="#f5f5f5"
            threshold={0.5}
            className="h-full w-full"
          />

          {/* Gradients & Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/30 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/70 pointer-events-none" />

          {/* Parallax Content Floating in 3D */}
          <div
            className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-8 text-white space-y-4"
            style={{
              transform: "translateZ(30px)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="space-y-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-[11px] font-mono tracking-wide text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>ARCHYVE EVOLUTION</span>
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-white leading-snug drop-shadow-md">
                The Archyve browser extension is sunsetting. Archyve v2 is here.
              </h2>

              {/* Body */}
              <p className="text-sm font-sans text-white/80 leading-relaxed max-w-lg">
                We are transitioning from the legacy browser extension to Archyve v2 — a dedicated, privacy-first research intelligence layer with direct URL parsing, local provider key vaults, and multi-publisher knowledge synthesis.
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/hebuildapps/archyve-v2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-950 font-sans text-xs font-semibold hover:bg-neutral-200 transition-all shadow-md active:scale-95"
              >
                <span>Read the Sunset & Migration Blog</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-sans text-xs font-medium backdrop-blur-md border border-white/15 transition-all active:scale-95"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DitherShaderDemo() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
    isHovered: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({
      rotateX,
      rotateY,
      glareX,
      glareY,
      glareOpacity: 0.25,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0,
      isHovered: false,
    });
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 [perspective:1200px]">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: tilt.isHovered
            ? "transform 0.08s ease-out"
            : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
        }}
        className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            opacity: tilt.glareOpacity,
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`,
          }}
        />
        <DitherShader
          src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2670&auto=format&fit=crop"
          gridSize={2}
          ditherMode="bayer"
          colorMode="grayscale"
          invert={false}
          animated={false}
          animationSpeed={0.02}
          primaryColor="#000000"
          secondaryColor="#f5f5f5"
          threshold={0.5}
          className="h-80 w-[500px] sm:h-96 sm:w-[600px]"
        />
      </div>
    </div>
  );
}
