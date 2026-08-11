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
    <div className="flex-1 bg-bg-base dark:bg-bg-base-dark flex flex-col justify-between py-12 px-4 font-sans">
      
      {/* Top Header menu */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1.5 font-serif font-bold text-lg text-zinc-900 dark:text-zinc-50">
          <span className="w-6 h-6 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold font-serif">A</span>
          <span>Archyve</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {!loadingSession && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="hidden sm:inline font-mono text-[11px]">{userEmail}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                    title="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                >
                  Sign In
                </button>
              )}
            </>
          )}
          <button
            onClick={() => router.push('/settings')}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full space-y-12 my-auto">
        
        {/* Branding header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Research intelligence layer.
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Analyze publisher pages instantly. Existing corpus is free to read anonymously. New generations require login and local API keys.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste a paper URL (IEEE, Springer, Elsevier, JSTOR, arXiv)..."
              className="w-full pl-11 pr-32 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 dark:focus:ring-zinc-650 dark:focus:border-zinc-650 font-sans"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600">
              <Search className="w-4 h-4" />
            </div>
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Analyze Paper
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-500 font-mono pl-1">{error}</p>
          )}
        </form>

        {/* Authenticated Workspace History */}
        {isAuthenticated && (
          <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              <History className="w-4 h-4 text-zinc-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Your Workspace Recent History
              </h2>
            </div>
            
            {loadingRecent ? (
              <div className="text-xs text-zinc-400 font-mono">Loading history...</div>
            ) : recentPapers.length > 0 ? (
              <div className="divide-y divide-zinc-150 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800/80 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/10">
                {recentPapers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => router.push(`/${encodeURIComponent(paper.url)}`)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {paper.title}
                      </div>
                      <div className="text-xs text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">
                        {paper.publisher} {paper.publication_year ? `(${paper.publication_year})` : ''}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono leading-relaxed">
                No recent searches. Paste a URL to start generating your research corpus.
              </p>
            )}
          </div>
        )}

      </main>

      {/* Feature proposition grid (unauthenticated only) */}
      {!isAuthenticated && (
        <footer className="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 mt-8 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Adapter Scrape
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Detects and parses specific identifiers from IEEE, Springer, JSTOR, and arXiv URLs.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                Source Validation
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Queries Crossref & OpenAlex API, validates details, and locates legal Open Access PDFs.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
                AI Synthesis
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Generates a structured, schema-validated JSON dossier with summaries and reading assessments.
            </p>
          </div>
        </footer>
      )}

    </div>
  );
}
