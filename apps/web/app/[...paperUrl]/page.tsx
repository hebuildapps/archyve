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
import { AlertCircle, ArrowLeft, Key, Lock, Settings } from 'lucide-react';

export default function ResearchDossierPage() {
  const params = useParams();
  const router = useRouter();

  // Page states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

              // Update visual checklist steps based on status
              setSteps((prev) =>
                prev.map((s) => {
                  if (chunk.status === 'cache' && s.id === 'identify') return { ...s, status: 'completed' };
                  if (chunk.status === 'cache' && s.id === 'cache') return { ...s, status: 'loading' };
                  if (chunk.status === 'scraping' && s.id === 'identify') return { ...s, status: 'loading' };
                  if (chunk.status === 'enriching' && s.id === 'identify') return { ...s, status: 'completed' };
                  if (chunk.status === 'enriching' && s.id === 'cache') return { ...s, status: 'completed' };
                  if (chunk.status === 'enriching' && s.id === 'metadata') return { ...s, status: 'loading' };
                  if (chunk.status === 'validating' && s.id === 'metadata') return { ...s, status: 'loading' };
                  return s;
                })
              );

              if (chunk.status === 'checkpoint' && chunk.data) {
                setPaper(chunk.data.paper);
                setIsNewPaper(true);
                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === 'identify' || s.id === 'cache' || s.id === 'metadata'
                      ? { ...s, status: 'completed' }
                      : s.id === 'open_access'
                      ? { ...s, status: 'loading' }
                      : s
                  )
                );
                setLoading(false);
              }

              if (chunk.status === 'completed' && chunk.data) {
                setPaper(chunk.data.paper);
                setResult(chunk.data.result);
                setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
                setLoading(false);
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
        console.log('[FRONTEND] fetch /api/research/generate START');
        const res = await fetch('/api/research/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
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

              // Update step indicator status
              setSteps((prev) =>
                prev.map((s) => {
                  if (chunk.status === 'enriching') {
                    if (s.id === 'identify') return { ...s, status: 'completed' };
                    if (s.id === 'metadata') return { ...s, status: 'loading' };
                  }
                  if (chunk.status === 'validating') {
                    if (s.id === 'metadata') return { ...s, status: 'completed' };
                    if (s.id === 'open_access') return { ...s, status: 'loading' };
                  }
                  if (chunk.status === 'interpreting') {
                    if (s.id === 'metadata' || s.id === 'open_access') return { ...s, status: 'completed' };
                    if (s.id === 'ai') return { ...s, status: 'loading' };
                  }
                  return s;
                })
              );

              if (chunk.status === 'completed' && chunk.data) {
                console.log('[FRONTEND] Final completed dossier response received:', chunk.data);
                setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
                setPaper(chunk.data.paper);
                setResult(chunk.data.result);
                setIsNewPaper(false);
                setLoading(false);
              }
            } else {
              console.warn('[FRONTEND] Ignored chunk because isMounted is false');
            }
          }
        }
        console.log('[FRONTEND] Stream reading completed successfully');

        // Reconcile final state: if still loading and we have a valid paper, try fetching the cache
        if (isMounted && paper) {
          console.log('[FRONTEND] Reconciling final state...');
          const checkRes = await fetch(`/api/research?url=${encodeURIComponent(paper.url)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.result) {
              setCurrentPercent(100);
              setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
              setPaper(checkData.paper);
              setResult(checkData.result);
              setIsNewPaper(false);
              setLoading(false);
              console.log('[FRONTEND] Reconciled successfully against final cache.');
            }
          }
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

  // Error View
  if (error) {
    return (
      <main className="flex-1 bg-bg-base dark:bg-bg-base-dark py-12 px-4">
        <div className="max-w-md mx-auto border border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 p-6 space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h2 className="text-sm font-semibold">Retrieval Failed</h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono break-words leading-relaxed">
            {error}
          </p>
          <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-4 flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Gate Card 1: Anonymous User Lock Gate (New paper)
  if (isNewPaper && !isAuthenticated && paper) {
    return (
      <main className="flex-1 bg-bg-base dark:bg-bg-base-dark py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Search Dashboard</span>
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

          {/* Authenticated check gate card overlay (Inspiration: img 2 dark glowing card) */}
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-8 shadow-2xl space-y-6 text-center text-white relative overflow-hidden max-w-lg mx-auto">
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-sans font-semibold tracking-tight">
                  Want to complete your research analysis?
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Unlock metadata discovery, legal open-access PDF finders, and structured AI-powered insights for this paper.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push(`/login?resumeUrl=${encodeURIComponent(window.location.pathname)}`)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Sign Up / Login</span>
                  <span className="font-sans">→</span>
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-900 transition-colors"
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
      <main className="flex-1 bg-bg-base dark:bg-bg-base-dark py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Search Dashboard</span>
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

          {/* Gemini API Key Required gate card overlay (Inspiration: img 2 dark glowing card) */}
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-8 shadow-2xl space-y-6 text-center text-white relative overflow-hidden max-w-lg mx-auto">
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Key className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-sans font-semibold tracking-tight">
                  Gemini API Key Required
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  You are logged in, but you haven&apos;t configured your Gemini API key yet. Archyve operates in BYOK-mode to keep services sustainable.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/20 inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Go to Settings</span>
                  <span className="font-sans">→</span>
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-900 transition-colors"
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
    <main className="flex-1 bg-bg-base dark:bg-bg-base-dark py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Search Dashboard</span>
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
    </main>
  );
}
