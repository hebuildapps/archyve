'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Database, KeyRound, Server, Eye, RefreshCw, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PrivacyPolicyPage() {
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
              href="/blog"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
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

      {/* Main Privacy Document */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">

        {/* Document Header */}
        <section className="space-y-4 border-b border-border pb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-border bg-card text-[11px] font-mono text-muted-foreground">
            <Shield className="w-3 h-3 text-brand-primary" />
            <span>LEGAL & ARCHITECTURE TRANSPARENCY</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-foreground">
            Archyve Privacy Policy
          </h1>

          <p className="text-xs font-mono text-muted-foreground">
            Last Updated: August 26, 2026 &middot; Architecture Version 2.0.0
          </p>

          <p className="text-sm font-sans text-muted-foreground leading-relaxed">
            This policy transparently explains how Archyve collects, processes, and stores data across our web application, API endpoints, and browser extension. We believe in architectural clarity: what is stored client-side vs. server-side, what external services are invoked, and how your AI keys are protected.
          </p>
        </section>

        {/* 1. Architecture Overview & Core Principle */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-primary" />
            <span>1. Bring Your Own Key (BYOK) & Key Storage</span>
          </h2>
          <div className="p-4 rounded-2xl border border-border bg-card-muted/40 text-xs sm:text-sm text-foreground/85 leading-relaxed space-y-2">
            <p>
              Archyve operates on a <strong>Bring Your Own Key (BYOK)</strong> model for AI synthesis. When you input your Google Gemini or Groq API key in Settings:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Your API key is saved <strong>exclusively in your browser&apos;s <code className="font-mono text-[11px] text-foreground">localStorage</code></strong>.</li>
              <li>Your API keys are <strong>never stored in our database tables</strong> and are never written to permanent disk logs on our servers.</li>
              <li>When you generate a research dossier for a paper not yet in cache, your key is transmitted via secure HTTPS request headers (<code className="font-mono text-[11px] text-foreground">x-ai-key</code>) directly to our server route, used in-memory solely to authorize the completion request to your selected respective AI Provider, and discarded immediately after the stream closes.</li>
            </ul>
          </div>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary" />
            <span>2. Information We Collect</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-foreground/85 leading-relaxed">
            <p>
              Depending on how you use Archyve, the following data points may be collected:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <strong className="font-mono text-xs text-foreground uppercase tracking-wide block">Account & Auth Data</strong>
                <p className="text-xs text-muted-foreground">
                  If you register an account, your account creds remain hashed. Unauthenticated users may read existing public dossiers without creating an account.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <strong className="font-mono text-xs text-foreground uppercase tracking-wide block">Paper URLs & Queries</strong>
                <p className="text-xs text-muted-foreground">
                  When you submit a paper URL (e.g. IEEE, Springer, JSTOR, arXiv) for analysis, the URL and extracted public bibliographic identifiers are processed by our backend.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <strong className="font-mono text-xs text-foreground uppercase tracking-wide block">Research Dossier Corpus</strong>
                <p className="text-xs text-muted-foreground">
                  Generated paper summaries, reading assessments, and source citations are saved to our public papers index in our database to enable fast.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <strong className="font-mono text-xs text-foreground uppercase tracking-wide block">Operational Analytics</strong>
                <p className="text-xs text-muted-foreground">
                  We log basic operational metrics including cache hit/miss status, trigger type (URL prepend vs extension), and pipeline latency in milliseconds to maintain performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. External Service Providers */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-primary" />
            <span>3. External Service Providers & Data Flow</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-foreground/85 leading-relaxed">
            <p>
              To construct validated research dossiers, Archyve communicates with specific external APIs:
            </p>
            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card text-xs">
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-foreground font-semibold">Bright Data</strong>
                  <p className="text-muted-foreground mt-0.5">Used for publisher web scraping to extract title, DOI, and author metadata from protected publisher web portals.</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card-muted border border-border shrink-0">Web Extraction</span>
              </div>

              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-foreground font-semibold">Crossref & OpenAlex</strong>
                  <p className="text-muted-foreground mt-0.5">Public scientific metadata registries queried with paper titles and DOIs to verify bibliographic identity.</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card-muted border border-border shrink-0">Scholarly Metadata</span>
              </div>

              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-foreground font-semibold">Unpaywall</strong>
                  <p className="text-muted-foreground mt-0.5">Queried with validated DOIs to discover legally accessible Open Access full-text PDF links.</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card-muted border border-border shrink-0">Open Access Finder</span>
              </div>

              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-foreground font-semibold">GitHub Search API</strong>
                  <p className="text-muted-foreground mt-0.5">Queried with paper titles to find publicly available code repositories associated with the research.</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card-muted border border-border shrink-0">Code Retrieval</span>
              </div>

              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-foreground font-semibold">Gemini & Groq provider support</strong>
                  <p className="text-muted-foreground mt-0.5">Receives structured metadata prompts using your provided API key to produce the research dossier.</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-card-muted border border-border shrink-0">AI Synthesis</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Local Storage & Cookies */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-primary" />
            <span>4. Local Storage & Cookies</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-foreground/85 leading-relaxed">
            <p>
              We utilize browser <code className="font-mono text-[11px] text-foreground">localStorage</code> for user preferences and client-side credentials:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs font-mono">
              <li><code className="text-foreground">archyve_gemini_api_key</code> / <code className="text-foreground">archyve_groq_api_key</code>: Your local BYOK API keys.</li>
              <li><code className="text-foreground">archyve_ai_provider</code>: Selected provider (<code className="text-foreground">gemini</code> or <code className="text-foreground">groq</code>).</li>
              <li><code className="text-foreground">archyve_theme</code>: Dark or light appearance preference.</li>
            </ul>
          </div>
        </section>

        {/* 5. Caching & Data Retention */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-brand-primary" />
            <span>5. Caching & Retention</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-foreground/85 leading-relaxed">
            <p>
              <strong>Redis Caching:</strong> Paper dossiers are cached in Redis with a 7-day Time-To-Live (TTL) to deliver near-instant responses for subsequent queries.
            </p>
            <p>
              <strong>Database:</strong> Public paper metadata (title, abstract, authors, DOI) and generated dossiers are stored permanently in the public corpus to allow all researchers to benefit from previously generated intelligence.
            </p>
          </div>
        </section>

        {/* 6. User Rights & Contact */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-primary" />
            <span>6. Your Rights & Contact</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-foreground/85 leading-relaxed">
            <p>
              You have the right to delete your local credentials at any time by clearing your API keys in the <Link href="/settings" className="text-brand-primary underline">Settings page</Link> or clearing your browser&apos;s site data.
            </p>
            <p>
              For account inquiries, privacy questions, or data removal requests, please open an issue or reach out via our official GitHub repository:
            </p>
            <div className="p-4 rounded-xl border border-border bg-card space-y-1">
              <span className="font-mono text-xs text-muted-foreground block">Project Support & Issues</span>
              <a
                href="https://github.com/hebuildapps/archyve_v2/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-brand-primary hover:underline"
              >
                https://github.com/hebuildapps/archyve_v2/issues
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
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
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/privacy" className="text-foreground font-semibold">Privacy</Link>
            <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
            <a
              href="https://github.com/hebuildapps/archyve_v2"
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
