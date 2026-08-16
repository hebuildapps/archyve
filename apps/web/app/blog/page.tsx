'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Cpu, Search, Database, Key, Heart } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DitherShader } from '@/components/ui/dither-shader';

export default function BlogAnnouncementPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-primary/20">
      
      {/* Top Floating Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/settings"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <div className="pl-2 border-l border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Editorial Article */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">

        {/* 1. Hero / Announcement Header with Dithered Landscape Card */}
        <section className="space-y-6">
          <div className="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden border border-border bg-card shadow-lg">
            <DitherShader
              src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2670&auto=format&fit=crop"
              gridSize={2}
              ditherMode="bayer"
              colorMode="grayscale"
              invert={false}
              animated={false}
              primaryColor="#050505"
              secondaryColor="#ffffff"
              threshold={0.46}
              className="h-full w-full"
            />
            {/* Dark gradient for text clarity */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-8 text-white space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-[11px] font-mono tracking-wider text-white/90 w-fit">
                <img src="/archyve-logo.svg" alt="Archyve" className="w-3 h-3 object-contain" />
                <span>ARCHYVE V2 RELEASE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-white leading-tight">
                Introducing Archyve V2.
              </h1>
              <p className="text-xs sm:text-sm font-sans text-white/80 max-w-xl leading-relaxed">
                A short note on research workflows, paper validation, and turning fragmented scientific literature into actionable intelligence.
              </p>
              <div className="pt-2 flex items-center gap-3 text-[11px] font-mono text-white/60">
                <span>August 2026</span>
                <span>·</span>
                <span>Product Announcement</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-lg sm:text-xl font-serif italic text-foreground/90 leading-relaxed">
              Archyve V2 is a research-intelligence platform engineered to turn scattered, paywalled, and noisy scientific literature into trustworthy, accessible, and structured research dossiers.
            </p>
          </div>
        </section>

        {/* 2. Why Archyve Exists */}
        <section className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            01 / Background
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            Why Archyve exists.
          </h2>
          <p>
            The academic web is deeply fragmented. When researchers discover an intriguing paper on IEEE Xplore, Springer Nature, Elsevier ScienceDirect, JSTOR, or arXiv, the publisher page provides only a tiny sliver of the truth. Crucial context—whether an open-access pre-print exists, who cited what, what real implementations are hosted on GitHub, and what prior art laid the foundation—is scattered across dozens of disconnected tools and databases.
          </p>
          <p>
            Information is rarely missing; instead, the workflow is prohibitively expensive in human attention. Researchers spend ten to twenty minutes per paper switching browser tabs, searching metadata registries, and cross-referencing authors just to answer a fundamental question: <em>&ldquo;Is this paper worth twenty minutes of deep reading?&rdquo;</em> We built Archyve to answer that question in under thirty seconds.
          </p>
        </section>

        {/* 3. Before Archyve / With Archyve Comparison */}
        <section className="space-y-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            02 / Workflow Evolution
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            Before Archyve vs. With Archyve.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Before Card */}
            <div className="p-6 rounded-2xl border border-border bg-card-muted/40 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Without Archyve
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Manual & Friction-Heavy</span>
              </div>
              <ol className="space-y-2.5 text-xs text-muted-foreground font-sans">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-foreground/60 shrink-0">1.</span>
                  <span>Encounter paper on paywalled publisher portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-foreground/60 shrink-0">2.</span>
                  <span>Search DOI manually across Google Scholar and Crossref.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-foreground/60 shrink-0">3.</span>
                  <span>Search Unpaywall or arXiv repositories for legal OA PDFs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-foreground/60 shrink-0">4.</span>
                  <span>Search GitHub for reproducible repository implementations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-foreground/60 shrink-0">5.</span>
                  <span>Paste raw unstructured abstracts into generic LLMs and hope for no hallucinations.</span>
                </li>
              </ol>
            </div>

            {/* With Archyve Card */}
            <div className="p-6 rounded-2xl border border-brand-primary/40 bg-card shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-primary">
                  With Archyve V2
                </span>
                <span className="text-[10px] font-mono text-brand-primary px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                  Single Flow
                </span>
              </div>
              <ol className="space-y-2.5 text-xs text-foreground/90 font-sans">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span><strong>Research URL</strong> &rarr; Triggered via shortcut or browser extension.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span><strong>Identity Validation</strong> &rarr; Strict title & author similarity verification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span><strong>Scholarly Enrichment</strong> &rarr; Automated OpenAlex, Crossref & Unpaywall sync.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span><strong>Evidence Retrieval</strong> &rarr; Real GitHub codebases and foundational precursors.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span><strong>Structured Dossier</strong> &rarr; Clear recommendation score, summaries, and context.</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* 4. What Makes Archyve Different */}
        <section className="space-y-6">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            03 / Core Engineering
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            What makes Archyve different.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 text-foreground font-mono text-xs font-semibold">
                <Search className="w-4 h-4 text-brand-primary" />
                <span>Publisher-Aware Extraction</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dedicated adapter parsers for IEEE Xplore, Springer Nature, Elsevier ScienceDirect, JSTOR, and arXiv extract exact document IDs and DOIs straight from the DOM.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 text-foreground font-mono text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Pre-Synthesis Validation</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before sending a prompt to an AI model, Archyve validates external metadata against the publisher baseline to prevent hallucinating incorrect literature.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 text-foreground font-mono text-xs font-semibold">
                <Database className="w-4 h-4 text-brand-primary" />
                <span>Evidence-Aware Retrieval</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Related papers and GitHub implementations are retrieved from live indexes first and fed as grounded context to the model, eliminating synthetic paper names.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 text-foreground font-mono text-xs font-semibold">
                <Key className="w-4 h-4 text-brand-primary" />
                <span>BYOK Local Key Vault</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bring Your Own Key architecture. Your Gemini and Groq API keys remain strictly in local browser storage, and are never saved to our database.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Built for Trust, Not Just Summaries */}
        <section className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            04 / Integrity
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            Built for trust, not just summaries.
          </h2>
          <p>
            Most AI research tools fail silently by producing eloquent summaries of papers that do not exist or mismatching author attributions. In academic research, an ungrounded summary is worse than no summary at all.
          </p>
          <p>
            Archyve treats identity verification as a first-class engineering invariant. If an external API returns a paper with a divergent title or conflicting author list, the system flags the mismatch, computes Jaccard word-overlap similarity, and prevents the AI synthesis pipeline from proceeding until identity is confirmed. Every claim in the dossier links directly back to verified source citations.
          </p>
        </section>

        {/* 6. Built With the Ecosystem */}
        <section className="p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-primary font-semibold">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>Built With the Ecosystem</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground tracking-tight">
            Grateful to our infrastructure & data providers.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Archyve stands on the shoulders of open scientific infrastructure and powerful data platforms. We would specifically like to thank:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground/90 font-sans pt-1">
            <li className="p-3 rounded-xl border border-border bg-card-muted/30">
              <strong className="font-semibold block text-foreground">Bright Data</strong>
              <span className="text-muted-foreground">Powering resilient web data collection and dynamic publisher DOM extraction.</span>
            </li>
            <li className="p-3 rounded-xl border border-border bg-card-muted/30">
              <strong className="font-semibold block text-foreground">Crossref & OpenAlex</strong>
              <span className="text-muted-foreground">Open scholarly metadata registries providing universal DOI resolution and citation graphs.</span>
            </li>
            <li className="p-3 rounded-xl border border-border bg-card-muted/30">
              <strong className="font-semibold block text-foreground">Unpaywall</strong>
              <span className="text-muted-foreground">Locating legal, open-access full-text PDFs across institutional repositories.</span>
            </li>
            <li className="p-3 rounded-xl border border-border bg-card-muted/30">
              <strong className="font-semibold block text-foreground">GitHub API</strong>
              <span className="text-muted-foreground">Connecting theoretical scientific proposals directly to open-source code repositories.</span>
            </li>
          </ul>
        </section>

        {/* 7. What We Built in V2 */}
        <section className="space-y-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            05 / Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            What we built in V2.
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="font-mono text-brand-primary font-bold">01</span>
              <div>
                <strong className="text-foreground">Modern Next.js & TypeScript Architecture:</strong> A complete rewrite with clean modular packages (<code className="px-1.5 py-0.5 bg-card-muted rounded font-mono text-[11px] text-foreground">apps/web</code>, <code className="px-1.5 py-0.5 bg-card-muted rounded font-mono text-[11px] text-foreground">apps/extension</code>, <code className="px-1.5 py-0.5 bg-card-muted rounded font-mono text-[11px] text-foreground">packages/shared</code>) and Zod schema safety.
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="font-mono text-brand-primary font-bold">02</span>
              <div>
                <strong className="text-foreground">Dual-Tier Caching Pipeline:</strong> High-speed Upstash Redis key-value caching with 7-day TTL paired with Supabase PostgreSQL for persistent community dossier indexing.
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="font-mono text-brand-primary font-bold">03</span>
              <div>
                <strong className="text-foreground">Browser Extension & Shortcut Bridge:</strong> Instant analysis trigger via <kbd className="px-1.5 py-0.5 bg-card-muted border border-border rounded font-mono text-[11px] text-foreground">Ctrl+Shift+H</kbd> or the extension popup.
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
              <span className="font-mono text-brand-primary font-bold">04</span>
              <div>
                <strong className="text-foreground">Multi-Provider AI Engine:</strong> Seamless switching between Google Gemini and Groq models with dynamic real-time model resolution.
              </div>
            </div>
          </div>
        </section>

        {/* 8. What's Next */}
        <section className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">
          <div className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-semibold">
            06 / Roadmap
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
            What&apos;s next.
          </h2>
          <p>
            V2 represents our baseline foundation. Looking ahead, we are actively experimenting with several research directions:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted-foreground font-sans">
            <li><strong>Deeper Full-Text Parsing:</strong> Extracting figures, equations, and benchmark tables directly from open-access PDFs.</li>
            <li><strong>Citation Graph Exploration:</strong> Visualizing how papers branch from seminal foundational works over time.</li>
            <li><strong>Broader Publisher Adapters:</strong> Expanding adapter support to Nature, Science, ACM Digital Library, and PubMed.</li>
            <li><strong>Self-Hosted Local Models:</strong> Direct support for local Ollama and vLLM inference endpoints.</li>
          </ul>
        </section>

        {/* 9. Closing CTA Card */}
        <section className="p-8 sm:p-10 rounded-3xl border border-border bg-card text-center space-y-6 shadow-md relative overflow-hidden">
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
              Start researching with Archyve.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Analyze your first paper or check your settings to configure your personal API key.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/settings"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <span>Configure Settings</span>
            </Link>

            <a
              href="https://github.com/hebuildapps/archyve-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost inline-flex items-center gap-2 font-mono text-xs"
            >
              <span>GitHub Repo &rarr;</span>
            </a>
          </div>
        </section>

      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-border py-8 bg-card/40 mt-12 text-xs font-mono text-muted-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/archyve-logo.svg" alt="Archyve" className="w-4 h-4 object-contain" />
            <span className="font-serif font-semibold text-foreground">Archyve V2</span>
            <span>·</span>
            <span>Research Intelligence</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/blog" className="text-foreground font-semibold">Blog</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
            <a
              href="https://github.com/hebuildapps/archyve-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
