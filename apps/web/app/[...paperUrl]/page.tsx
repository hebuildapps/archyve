'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResearchResult, NormalizedPaper } from '@archyve/shared';
import { keyStore } from '@/lib/security/AIKeyStore';
import { supabaseClient } from '@/lib/db/supabaseClient';
import { ResearchHeader } from '@/components/research/ResearchHeader';
import { SummarySection } from '@/components/research/SummarySection';
import { ShouldIReadCard } from '@/components/research/ShouldIReadCard';
import { OpenAccessSection } from '@/components/research/OpenAccessSection';
import { ResearchContextSection } from '@/components/research/ResearchContextSection';
import { RelatedResourcesSection } from '@/components/research/RelatedResourcesSection';
import { SourcesSection } from '@/components/research/SourcesSection';
import { LoadingSkeleton, LoadingStep } from '@/components/research/LoadingSkeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AlertCircle, ArrowLeft, Key, Lock, Settings } from 'lucide-react';
import { Chatbox } from '@/components/research/Chatbox';
import { TextSelectionMenu } from '@/components/research/TextSelectionMenu';

export default function ResearchDossierPage() {
  const params = useParams();
  const router = useRouter();

  // Page states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);

  // Auth & API Key states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('gemini');
  const [model, setModel] = useState<string>('gemini-3.5-flash');

  // Paper & Dossier states
  const [paper, setPaper] = useState<NormalizedPaper | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isNewPaper, setIsNewPaper] = useState(false);
  const [paperUrl, setPaperUrl] = useState<string>('');

  // Generation trigger state
  const generationTriggeredRef = useRef(false);

  // Assistant & Selection states
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const dossierContainerRef = useRef<HTMLDivElement>(null);

  const handleAddToAssistant = (text: string) => {
    setQuotedText(text);
  };

  // Live progress states
  const [currentPercent, setCurrentPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');

  // Progressive loader steps indicator
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: 'identify', label: 'Verifying paper identity', status: 'loading' },
    { id: 'metadata', label: 'Retrieving related literature', status: 'pending' },
    { id: 'open_access', label: 'Scanning open-access repositories', status: 'pending' },
    { id: 'ai', label: 'Generating AI research dossier', status: 'pending' },
  ]);

  // Decode URL from segment params
  useEffect(() => {
    if (!params?.paperUrl) return;
    const parts = Array.isArray(params.paperUrl) ? params.paperUrl : [params.paperUrl];
    let decodedUrl = parts.map(decodeURIComponent).join('/');
    decodedUrl = decodedUrl.replace(/^(https?:)\/([^\/])/, '$1//$2');
    setPaperUrl(decodedUrl);
  }, [params]);

  // Verify auth session and load API key on mount
  useEffect(() => {
    async function checkAuthAndKey() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          setSessionToken(session.access_token);
        } else {
          setIsAuthenticated(false);
          setSessionToken(null);
        }
      } catch (err) {
        console.error('Session verify error:', err);
      }

      // Check keyStore
      const currentProvider = keyStore.getProvider();
      const key = keyStore.getApiKey(currentProvider);
      const currentModel = keyStore.getModel(currentProvider);

      setProvider(currentProvider);
      setModel(currentModel);

      if (key) {
        setHasApiKey(true);
        setApiKey(key);
      } else {
        setHasApiKey(false);
        setApiKey(null);
      }
    }

    checkAuthAndKey();
  }, []);

  // Fetch /api/research (Cache lookup & scrape checkpoint)
  useEffect(() => {
    if (!paperUrl) return;

    let isMounted = true;
    const controller = new AbortController();

    async function initialLookup() {
      try {
        setLoading(true);
        setError(null);
        setCurrentPercent(0);
        setStatusMessage('Starting research...');

        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: paperUrl,
            source: 'unknown',
            trigger: 'url_prepend',
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported by browser.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const chunk = JSON.parse(line);

            if (chunk.status === 'error') {
              throw new Error(chunk.message || 'Error occurred during lookup');
            }

            if (isMounted) {
              if (chunk.percentage !== undefined) {
                setCurrentPercent(chunk.percentage);
              }
              if (chunk.message) {
                setStatusMessage(chunk.message);
              }

              // Update visual checklist steps based on status and live data
              setSteps((prev) =>
                prev.map((s) => {
                  if (chunk.status === 'cache' && s.id === 'identify') {
                    return { ...s, status: 'completed', detail: 'Publisher Identified' };
                  }
                  if (chunk.status === 'cache' && s.id === 'cache') {
                    return { ...s, status: 'loading' };
                  }
                  if (chunk.status === 'scraping' && s.id === 'identify') {
                    return { ...s, status: 'loading' };
                  }
                  if (chunk.status === 'enriching') {
                    if (s.id === 'identify') return { ...s, status: 'completed', detail: 'Publisher DOM Verified' };
                    if (s.id === 'cache') return { ...s, status: 'completed', detail: 'Cache Miss (New Paper)' };
                    if (s.id === 'metadata') return { ...s, status: 'loading' };
                  }
                  if (chunk.status === 'validating') {
                    if (s.id === 'identify') return { ...s, status: 'completed', detail: 'Publisher DOM Verified' };
                    if (s.id === 'metadata') return { ...s, status: 'loading', detail: 'Crossref / OpenAlex Syncing' };
                  }
                  return s;
                })
              );

              if (chunk.status === 'checkpoint' && chunk.data) {
                const checkedPaper = chunk.data.paper;
                setPaper(checkedPaper);
                setIsNewPaper(true);
                setSteps((prev) =>
                  prev.map((s) => {
                    if (s.id === 'identify') return { ...s, status: 'completed', detail: checkedPaper.publisher || 'Verified' };
                    if (s.id === 'cache') return { ...s, status: 'completed', detail: 'Cache Miss' };
                    if (s.id === 'metadata') return { ...s, status: 'completed', detail: checkedPaper.doi ? `DOI: ${checkedPaper.doi}` : 'Metadata Linked' };
                    if (s.id === 'open_access') return { ...s, status: 'loading' };
                    return s;
                  })
                );
                setLoading(false);
              }

              if (chunk.status === 'completed' && chunk.data) {
                const finalPaper = chunk.data.paper;
                const finalResult = chunk.data.result;
                setPaper(finalPaper);
                setResult(finalResult);
                setCurrentPercent(100);
                setStatusMessage('Loaded from archive.');
                setSteps((prev) =>
                  prev.map((s) => {
                    if (s.id === 'identify') return { ...s, status: 'completed', detail: finalPaper.publisher || 'Verified' };
                    if (s.id === 'metadata') return { ...s, status: 'completed', detail: finalPaper.doi ? `DOI: ${finalPaper.doi}` : 'Verified' };
                    if (s.id === 'open_access') return { ...s, status: 'completed', detail: finalResult.openAccess?.available ? 'Legal PDF Found' : 'Paywalled' };
                    if (s.id === 'ai') return { ...s, status: 'completed', detail: 'Dossier Synthesized' };
                    return { ...s, status: 'completed' };
                  })
                );
                // Graceful delay for cached hits so progress finishes smoothly
                setTimeout(() => {
                  if (isMounted) setLoading(false);
                }, 800);
              }
            }
          }
        }
      } catch (err: any) {
        if (isMounted && err.name !== 'AbortError') {
          setError(err.message || 'Error occurred during initial search.');
          setLoading(false);
        }
      }
    }

    initialLookup();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [paperUrl]);

  // Authenticated Generation Flow (resuming after checkpoint gate)
  useEffect(() => {
    // Check constraints: must be a new paper, authenticated, key present, paper details ready, and not triggered yet
    if (!isNewPaper || !isAuthenticated || !hasApiKey || !paper || !sessionToken || generationTriggeredRef.current) {
      return;
    }

    generationTriggeredRef.current = true;
    let isMounted = true;

    async function generateDossier() {
      console.log('[FRONTEND] generateDossier() START');
      setLoading(true);
      setCurrentPercent(20);
      console.log('[FRONTEND] setProgress called: 20');
      setStatusMessage('Resuming generation pipeline...');
      console.log('[FRONTEND] setStatus/Message called: Resuming generation pipeline...');

      try {
        // Fetch fresh session token dynamically to ensure it has not expired
        const { data: { session: freshSession } } = await supabaseClient.auth.getSession();
        const activeToken = freshSession?.access_token || sessionToken;

        console.log('[FRONTEND] fetch /api/research/generate START');
        const res = await fetch('/api/research/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`,
            'x-ai-provider': provider,
            'x-ai-model': model,
            'x-ai-key': apiKey || '',
          },
          body: JSON.stringify({ paper }),
        });

        console.log('[FRONTEND] fetch /api/research/generate RESPONSE RECEIVED:', res.status);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Generation error: status ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported by browser.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('[FRONTEND] stream reader done = true');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            console.log('[FRONTEND] stream chunk received:', line);
            const chunk = JSON.parse(line);
            console.log('[FRONTEND] parsed progress event:', chunk);

            if (chunk.status === 'error') {
              throw new Error(chunk.message || 'Generation failed');
            }

            if (isMounted) {
              if (chunk.percentage !== undefined) {
                setCurrentPercent(chunk.percentage);
                console.log('[FRONTEND] setProgress called:', chunk.percentage);
              }
              if (chunk.message) {
                setStatusMessage(chunk.message);
                console.log('[FRONTEND] setStatus/Message called:', chunk.message);
              }

              // Update step indicator status with real-time text details
              setSteps((prev) =>
                prev.map((s) => {
                  if (chunk.status === 'enriching') {
                    if (s.id === 'identify') return { ...s, status: 'completed', detail: paper?.publisher || 'Verified' };
                    if (s.id === 'metadata') return { ...s, status: 'loading', detail: 'Crossref / OpenAlex Synced' };
                  }
                  if (chunk.status === 'validating') {
                    if (s.id === 'metadata') return { ...s, status: 'completed', detail: paper?.doi ? `DOI: ${paper.doi}` : 'Metadata Linked' };
                    if (s.id === 'open_access') return { ...s, status: 'loading', detail: 'Unpaywall / arXiv Scanned' };
                  }
                  if (chunk.status === 'interpreting') {
                    if (s.id === 'metadata') return { ...s, status: 'completed', detail: 'Identity Confirmed' };
                    if (s.id === 'open_access') return { ...s, status: 'completed', detail: 'Repositories Checked' };
                    if (s.id === 'ai') return { ...s, status: 'loading', detail: `${provider.toUpperCase()} (${model})` };
                  }
                  return s;
                })
              );

              if (chunk.status === 'completed' && chunk.data) {
                console.log('[FRONTEND] Final completed dossier response received:', chunk.data);
                const finalPaper = chunk.data.paper || paper;
                const finalResult = chunk.data.result;
                setCurrentPercent(100);
                setStatusMessage('Dossier ready.');
                setSteps((prev) =>
                  prev.map((s) => ({ ...s, status: 'completed' }))
                );
                setPaper(finalPaper);
                setResult(finalResult);
                setIsNewPaper(false);
                setLoading(false);
                return;
              }
            } else {
              console.warn('[FRONTEND] Ignored chunk because isMounted is false');
            }
          }
        }
        console.log('[FRONTEND] Stream reading completed successfully');

        if (isMounted) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[FRONTEND] Error in generateDossier:', err);
        if (isMounted) {
          setError(err.message || 'AI dossier generation failed.');
          setLoading(false);
        }
      }
    }

    generateDossier();

    return () => {
      console.log('[FRONTEND] useEffect generateDossier cleanup, setting isMounted = false');
      isMounted = false;
    };
  }, [isNewPaper, isAuthenticated, hasApiKey, paper, sessionToken, apiKey, provider, model]);

  // Loading View
  if (loading) {
    return (
      <main className="flex-1 bg-bg-base dark:bg-bg-base-dark flex flex-col justify-center min-h-screen">
        <LoadingSkeleton
          steps={steps}
          paperTitle={paper?.title}
          paperAuthors={paper?.authors}
          progressPercent={currentPercent}
          statusMessage={statusMessage}
        />
      </main>
    );
  }

  // Error View with Retry and Feedback Toast
  if (error) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d0f] select-none text-white px-4">
        <div className="flex flex-col items-center max-w-md w-full text-center">
          {/* Brand Emblem */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="/archyve-logo.svg"
              alt="Archyve"
              className="w-9 h-9 object-contain"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-serif font-medium tracking-tight text-[#f5f5f7] mb-2">
            Retrieval Failed
          </h1>
          <p className="text-xs sm:text-[13px] text-[#8e8e93] font-sans leading-relaxed mb-6 max-w-sm">
            {error}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                generationTriggeredRef.current = false;
                window.location.reload();
              }}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-[#B7FF38] text-black hover:bg-[#a6ec2e] transition-colors cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => setShowFeedbackToast(true)}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f5f7] border border-white/[0.08] transition-colors cursor-pointer"
            >
              Send Feedback
            </button>
          </div>

          <button
            onClick={() => router.push('/')}
            className="mt-6 text-[11px] text-[#636369] hover:text-[#8e8e93] transition-colors cursor-pointer font-sans"
          >
            ← Back to Home
          </button>
        </div>

        {/* Feedback Support Toast - Stays in place, no auto-dismiss */}
        {showFeedbackToast && (
          <div className="fixed bottom-6 right-6 z-[9999] max-w-[420px] w-full p-4 rounded-2xl bg-[#0f1117] border border-[#232733] shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none select-none">🙌</span>
              <div className="flex-1 text-left">
                <h4 className="text-[13px] font-semibold text-[#f5f5f7] leading-tight">
                  Got feedback or need support?
                </h4>
                <p className="text-xs text-[#9aa2b1] mt-1 leading-relaxed">
                  We&apos;re here to help! Please reach out to{' '}
                  <a
                    href="mailto:archyveai@gmail.com"
                    className="text-[#7c8cff] underline hover:text-[#99a6ff] transition-colors cursor-pointer"
                  >
                    archyveai@gmail.com
                  </a>
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackToast(false)}
                className="text-[#636369] hover:text-[#f5f5f7] text-xs transition-colors p-1 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      </main>
    );
  }


  // Gate Card 1: Anonymous User Lock Gate (New paper)
  if (isNewPaper && !isAuthenticated && paper) {
    return (
      <main className="flex-1 bg-background py-12 px-4 font-sans">
        <div className="max-w-3xl mx-auto space-y-8">
          <button
            onClick={() => router.push('/')}
            className="hover:opacity-85 transition-opacity inline-flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/archyve-logo.svg"
              alt="Archyve Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-serif font-semibold text-base text-foreground tracking-tight">archyve</span>
          </button>

          {/* Scraped metadata details are visible! */}
          <ResearchHeader
            title={paper.title}
            authors={paper.authors}
            publisher={paper.publisher}
            publicationYear={paper.publicationYear}
            venue={paper.venue}
            doi={paper.doi}
            url={paper.url}
          />

          {/* Authenticated check gate card */}
          <div className="rounded-3xl bg-card border border-border p-8 shadow-xs space-y-6 text-center text-foreground relative overflow-hidden max-w-lg mx-auto">
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-highlight-glow/30 text-brand-primary border border-brand-primary/20 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-serif font-medium tracking-tight text-foreground">
                  Want to complete your research analysis?
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed font-sans">
                  Unlock metadata discovery, legal open-access PDF finders, and structured AI-powered insights for this paper.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push(`/login?resumeUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`)}
                  className="w-full sm:w-auto btn-primary inline-flex items-center justify-center gap-1.5"
                >
                  <span>Sign Up / Login</span>
                  <span className="font-sans">→</span>
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Gate Card 2: Authenticated but No BYOK Configured Gate
  if (isNewPaper && isAuthenticated && !hasApiKey && paper) {
    return (
      <main className="flex-1 bg-background py-12 px-4 font-sans">
        <div className="max-w-3xl mx-auto space-y-8">
          <button
            onClick={() => router.push('/')}
            className="hover:opacity-85 transition-opacity inline-flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/archyve-logo.svg"
              alt="Archyve Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-serif font-semibold text-base text-foreground tracking-tight">archyve</span>
          </button>

          <ResearchHeader
            title={paper.title}
            authors={paper.authors}
            publisher={paper.publisher}
            publicationYear={paper.publicationYear}
            venue={paper.venue}
            doi={paper.doi}
            url={paper.url}
          />

          {/* API Key Required gate card overlay */}
          <div className="rounded-3xl bg-card border border-border p-8 shadow-xs space-y-6 text-center text-foreground relative overflow-hidden max-w-lg mx-auto">
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-highlight-glow/30 text-brand-primary border border-brand-primary/20 flex items-center justify-center mx-auto shadow-xs">
                <Key className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-serif font-medium tracking-tight text-foreground">
                  AI Provider Key Required
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed font-sans">
                  You are logged in, but you haven&apos;t configured your AI API key yet. Archyve operates in BYOK-mode to keep services sustainable.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push(`/settings?resumeUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`)}
                  className="w-full sm:w-auto btn-primary inline-flex items-center justify-center gap-1.5"
                >
                  <span>Go to Settings</span>
                  <span className="font-sans">→</span>
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Render full dossier (Cache hit or fresh validated generation completed)
  if (!result || !paper) return null;

  return (
    <main className="flex-1 bg-background py-12 px-4 font-sans relative min-h-screen">
      <div
        ref={dossierContainerRef}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="hover:opacity-85 transition-opacity inline-flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/archyve-logo.svg"
              alt="Archyve Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-serif font-semibold text-base text-foreground tracking-tight">archyve</span>
          </button>
          <ThemeToggle />
        </div>

        <ResearchHeader
          title={paper.title}
          authors={paper.authors}
          publisher={paper.publisher}
          publicationYear={paper.publicationYear}
          venue={paper.venue}
          doi={paper.doi}
          url={paper.url}
        />

        <SummarySection summary={result.summary} />

        <ShouldIReadCard
          score={result.readRecommendation.score}
          explanation={result.readRecommendation.explanation}
          relevanceTopics={result.readRecommendation.relevanceTopics}
          difficulty={result.readRecommendation.difficulty}
          estimatedReadingTime={result.readRecommendation.estimatedReadingTime}
        />

        <OpenAccessSection
          available={result.openAccess.available}
          sourceName={result.openAccess.sourceName}
          url={result.openAccess.url}
        />

        <ResearchContextSection
          keyContributions={result.keyContributions}
          researchContext={result.researchContext}
          relatedConcepts={result.relatedConcepts}
        />

        <RelatedResourcesSection
          relatedPapers={result.relatedPapers}
          implementations={result.implementations}
        />

        <SourcesSection sources={result.sources} />
      </div>

      {/* Floating Menubar when user selects text */}
      <TextSelectionMenu
        containerRef={dossierContainerRef}
        onAddToAssistant={handleAddToAssistant}
      />


      <Chatbox
        paper={paper}
        result={result}
        initialQuotedText={quotedText}
        onClearQuotedText={() => setQuotedText(null)}
      />
    </main>
  );
}
