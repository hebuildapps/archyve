"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DitherShader } from "@/components/ui/dither-shader";

interface DitherShaderCardRevealProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DitherShaderCardReveal({
  isOpen = true,
  onClose,
}: DitherShaderCardRevealProps) {
  const router = useRouter();
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

    // Subtle micro-tilt (max 3 degrees)
    const rotateX = ((y - centerY) / centerY) * -3;
    const rotateY = ((x - centerX) / centerX) * 3;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({
      rotateX,
      rotateY,
      glareX,
      glareY,
      glareOpacity: 0.12,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/35 backdrop-blur-[2px] transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.005, 1.005, 1.005)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: tilt.isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
        }}
        className="relative w-full max-w-[400px] sm:max-w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 shadow-2xl cursor-default will-change-transform select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Specular Glare */}
        <div
          className="pointer-events-none absolute inset-0 z-30 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: tilt.glareOpacity,
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
          }}
        />

        {/* Dither Shader Container with Credit-Card proportions */}
        <div className="relative h-[250px] sm:h-[265px] w-full overflow-hidden">
          <DitherShader
            src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2670&auto=format&fit=crop"
            gridSize={2}
            ditherMode="bayer"
            colorMode="grayscale"
            invert={false}
            animated={false}
            primaryColor="#050505"
            secondaryColor="#ffffff"
            threshold={0.44}
            className="h-full w-full"
          />

          {/* Minimal bottom gradient strictly for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />

          {/* Minimal, Short & Uncluttered Content */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-5 text-white space-y-2.5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-[10px] font-mono tracking-wider text-white/90">
                <img src="/archyve-logo.svg" alt="Archyve Logo" className="w-3 h-3 object-contain" />
                <span>archyve v2</span>
              </div>

              <h2 className="text-lg sm:text-xl font-serif font-medium tracking-tight text-white leading-tight">
                Research intelligence layer.
              </h2>

              <p className="text-[11px] font-sans text-white/75 leading-relaxed line-clamp-2 max-w-[320px]">
                Direct URL parsing, private key vaults, and multi-source synthesis.
              </p>
            </div>

            {/* Shiny White Announcement Button */}
            <div className="pt-0.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  router.push('/blog');
                }}
                className="relative overflow-hidden px-3 py-1 rounded-[4px] bg-white text-neutral-950 font-semibold text-[10px] shadow-[0_0_12px_rgba(255,255,255,0.45)] hover:shadow-[0_0_18px_rgba(255,255,255,0.7)] transition-all cursor-pointer group active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-1">
                  <span>Announcement</span>
                  <span className="font-mono pl-1 text-[9px] opacity-70"><svg className="size-3 rotate-180 transition-transform duration-200 ease-out-quint group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg></span>
                </span>
                {/* Shiny gloss reflection animation */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/80 to-transparent transition-transform duration-700 pointer-events-none" />
              </button>
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
