'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/db/supabaseClient';
import {
  Search,
  BookOpen,
  ShieldCheck,
  Cpu,
  Settings,
  History,
  ArrowRight,
  User,
  LogOut
} from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { DitherShaderCardReveal } from '@/components/dither-shader-card-reveal';
import { ArchyveScrambleBlock } from '@/components/ArchyveScrambleBlock';

interface RecentPaper {
  id: string;
  title: string;
  publisher: string;
  publication_year: number | null;
  url: string;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();

  // Input fields
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Recent papers
  const [recentPapers, setRecentPapers] = useState<RecentPaper[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Sunset Modal state
  const [isSunsetModalOpen, setIsSunsetModalOpen] = useState(false);

  useEffect(() => {
    // Check Auth status
    async function checkAuth() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          setUserEmail(session.user?.email || null);
          fetchRecentHistory();
        } else {
          setIsAuthenticated(false);
          setUserEmail(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoadingSession(false);
      }
    }

    checkAuth();

    // Listen to changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user?.email || null);
        fetchRecentHistory();
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
        setRecentPapers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch recent papers from public corpus
  const fetchRecentHistory = async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await supabaseClient
        .from('papers')
        .select('id, title, publisher, publication_year, url, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentPapers(data || []);
    } catch (err) {
      console.warn('Recent papers query error (tables may not be set up):', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please paste a paper URL.');
      return;
    }

    try {
      new URL(trimmed);
      const pathUrl = encodeURIComponent(trimmed);
      router.push(`/${pathUrl}`);
    } catch {
      setError('Please enter a valid URL including http:// or https://');
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
  };

  return (
    <div className="flex-1 bg-background flex flex-col justify-between py-10 px-4 sm:px-6 font-sans">

      {/* Top Header menu */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1.5">
          <img
            src="/archyve-logo.svg"
            alt="Archyve Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="font-serif font-semibold text-lg text-foreground tracking-tight">archyve</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {!loadingSession && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-full shadow-xs">
                  <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">{userEmail}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 ml-1 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="btn-ghost"
                >
                  Sign In
                </button>
              )}
            </>
          )}
          <ThemeToggle />
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shadow-xs"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full space-y-10 my-auto">

        {/* Branding header */}
        <div className="text-center space-y-3">
          <div>
            <ArchyveScrambleBlock
              text="Archyve Intelligence"
              onClick={() => setIsSunsetModalOpen(true)}
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-medium tracking-[-0.01em] text-foreground leading-[1.15]">
            Research intelligence layer.
          </h1>
          <p className="text-sm font-sans text-muted-foreground max-w-md mx-auto leading-relaxed">
            Analyze publisher pages instantly. Existing corpus is free to read anonymously. New generations require local AI key store.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative rounded-2xl border border-border bg-card p-1.5 shadow-xs focus-within:border-brand-primary/70 transition-colors">
            <div className="flex items-center">
              <div className="pl-3.5 pr-2 text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste a paper URL (IEEE, Springer, Elsevier, JSTOR, arXiv)..."
                className="w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-sans"
              />
              <button
                type="submit"
                className="btn-primary shrink-0 ml-2"
              >
                Analyze Paper
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-mono pl-2">{error}</p>
          )}
        </form>

        {/* Authenticated Workspace History */}
        {isAuthenticated && (
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-brand-primary">
              <History className="w-4 h-4 text-brand-primary" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Your Workspace Recent History
              </h2>
            </div>

            {loadingRecent ? (
              <div className="text-xs text-muted-foreground font-mono">Loading history...</div>
            ) : recentPapers.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
                {recentPapers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => router.push(`/${encodeURIComponent(paper.url)}`)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-card-muted/40 transition-colors group"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-serif font-medium text-foreground truncate group-hover:text-brand-primary transition-colors">
                        {paper.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {paper.publisher} {paper.publication_year ? `(${paper.publication_year})` : ''}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                No recent searches. Paste a URL to start generating your research corpus.
              </p>
            )}
          </div>
        )}

      </main>

      {/* Feature proposition grid (unauthenticated only) */}
      {!isAuthenticated && (
        <footer className="max-w-3xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-border">
          <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-brand-primary">
              <BookOpen className="w-3.5 h-3.5" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Adapter Scrape
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Detects and parses specific identifiers from IEEE, Springer, JSTOR, and arXiv URLs.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-brand-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Source Validation
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Queries Crossref & OpenAlex API, validates details, and locates legal Open Access PDFs.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-brand-primary">
              <Cpu className="w-3.5 h-3.5" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                AI Synthesis
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generates a structured, schema-validated JSON dossier with summaries and reading assessments.
            </p>
          </div>
        </footer>
      )}

      {/* Sunset & Migration Dithered Shader Card Reveal Modal */}
      <DitherShaderCardReveal
        isOpen={isSunsetModalOpen}
        onClose={() => setIsSunsetModalOpen(false)}
      />

    </div>
  );
}
