'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { keyStore } from '@/lib/security/AIKeyStore';
import { supabaseClient } from '@/lib/db/supabaseClient';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut,
  Globe,
  Calendar,
  Laptop,
  KeyRound,
  Check,
  ChevronDown,
  ExternalLink,
  Download
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SessionData {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
}

type SectionKey = 'ai-config' | 'account' | 'shortcuts' | 'about';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawResumeUrl = searchParams.get('resumeUrl');
  const resumeUrl = rawResumeUrl ? decodeURIComponent(rawResumeUrl) : null;

  // Navigation state
  const [activeSection, setActiveSection] = useState<SectionKey>('ai-config');

  // Sliding pill navigation ref & state
  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });

  useEffect(() => {
    const updatePill = () => {
      const activeEl = navItemRefs.current[activeSection];
      if (activeEl) {
        setPillStyle({
          top: activeEl.offsetTop,
          height: activeEl.offsetHeight,
          ready: true,
        });
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [activeSection]);

  // AI Config states
  const [provider, setProvider] = useState('gemini');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Auth / Session states
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  const fallbackGemini = ['gemini-3.5-pro', 'gemini-3.5-flash'];
  const fallbackGroq = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

  const fetchModels = async (currentProvider: string, currentApiKey: string) => {
    if (!currentApiKey.trim()) {
      setAvailableModels(currentProvider === 'groq' ? fallbackGroq : fallbackGemini);
      return;
    }
    try {
      if (currentProvider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${currentApiKey}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter active chat-capable models and sort intelligently
          const list = (data.data || [])
            .filter((m: any) => m.active !== false && !m.id.includes('whisper') && !m.id.includes('guard') && !m.id.includes('tts'))
            .map((m: any) => m.id)
            .sort((a: string, b: string) => {
              if (a === 'openai/gpt-oss-120b') return -1;
              if (b === 'openai/gpt-oss-120b') return 1;
              return a.localeCompare(b);
            });
          setAvailableModels(list.length > 0 ? list : fallbackGroq);
        } else {
          setAvailableModels(fallbackGroq);
        }
      } else {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentApiKey}`);
        if (res.ok) {
          const data = await res.json();
          const list = (data.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''))
            .sort((a: string, b: string) => {
              if (a.includes('2.5') || a.includes('flash')) return -1;
              if (b.includes('2.5') || b.includes('flash')) return 1;
              return a.localeCompare(b);
            });
          setAvailableModels(list.length > 0 ? list : fallbackGemini);
        } else {
          setAvailableModels(fallbackGemini);
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setAvailableModels(currentProvider === 'groq' ? fallbackGroq : fallbackGemini);
    }
  };

  useEffect(() => {
    const currentProvider = keyStore.getProvider();
    setProvider(currentProvider);

    const key = keyStore.getApiKey(currentProvider) || '';
    if (key) setApiKey(key);

    const currentModel = keyStore.getModel(currentProvider);
    if (
      currentProvider === 'groq' &&
      (!currentModel || currentModel === 'llama-3.3-70b-versatile')
    ) {
      setModel('openai/gpt-oss-120b');
    } else {
      setModel(currentModel);
    }

    fetchModels(currentProvider, key);

    async function checkSession() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          setUserEmail(session.user?.email || null);
          setSessionData({
            id: session.user.id,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome-based Browser',
            ipAddress: '127.0.0.1 (Local Client)',
            createdAt: session.user.created_at ? new Date(session.user.created_at).toLocaleString() : new Date().toLocaleString(),
          });
        } else {
          setUserEmail(null);
          setSessionData(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoadingSession(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setUserEmail(session.user?.email || null);
        setSessionData({
          id: session.user.id,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome-based Browser',
          ipAddress: '127.0.0.1 (Local Client)',
          createdAt: session.user.created_at ? new Date(session.user.created_at).toLocaleString() : new Date().toLocaleString(),
        });
      } else {
        setUserEmail(null);
        setSessionData(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    keyStore.setProvider(newProvider);
    const key = keyStore.getApiKey(newProvider) || '';
    setApiKey(key);
    const loadedModel = keyStore.getModel(newProvider);
    setModel(loadedModel);
    fetchModels(newProvider, key);
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (resumeUrl && !apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter a valid API key to resume research.');
      return;
    }

    keyStore.setProvider(provider);
    keyStore.setApiKey(apiKey, provider);
    keyStore.setModel(model, provider);
    setTestStatus('success');
    setTestMessage('Configurations saved to local client vault.');

    if (resumeUrl) {
      router.push(resumeUrl);
      return;
    }

    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 3000);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('API Key is required to test connection.');
      return;
    }

    setTestStatus('testing');
    setTestMessage(`Connecting to ${provider === 'groq' ? 'Groq' : 'Google Gemini'} endpoint...`);

    try {
      if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
          setTestStatus('success');
          setTestMessage('Connection verified. Groq API key is valid.');
          fetchModels(provider, apiKey);
        } else {
          const errJson = await response.json().catch(() => ({}));
          setTestStatus('error');
          setTestMessage(`Connection failed: ${errJson.error?.message || response.statusText}`);
        }
      } else {
        const targetModel = model.trim() || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping connection test' }] }],
          }),
        });

        if (response.ok) {
          setTestStatus('success');
          setTestMessage('Connection verified. Gemini API key is valid.');
          fetchModels(provider, apiKey);
        } else {
          const errJson = await response.json().catch(() => ({}));
          setTestStatus('error');
          setTestMessage(`Connection failed: ${errJson.error?.message || response.statusText}`);
        }
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Network error: ${err.message || err}`);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  const navItems: { key: SectionKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      key: 'ai-config',
      label: 'AI Configuration',
      badge: 'BYOK',
      icon: (
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
          <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,176a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,176Zm0-40a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,136Zm0-40a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Z" opacity="0.2" />
          <path d="M208,24H48A24,24,0,0,0,24,48V208a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V48A24,24,0,0,0,208,24Zm8,184a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,40a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,136Zm0,40a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,176Z" />
        </svg>
      ),
    },
    {
      key: 'account',
      label: 'Account & Sessions',
      icon: (
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
          <path d="M128,32A96,96,0,0,0,63.8,199.38h0A72,72,0,0,1,128,160a40,40,0,1,1,40-40,40,40,0,0,1-40,40,72,72,0,0,1,64.2,39.37A96,96,0,0,0,128,32Z" opacity="0.2" fill="currentColor" /><path d="M63.8,199.37a72,72,0,0,1,128.4,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" /><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" /><circle cx="128" cy="120" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
        </svg>
      ),
    },
    {
      key: 'shortcuts',
      label: 'Shortcuts & Extension',
      icon: (
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
          <rect width="256" height="256" fill="none" />
          <path d="M224,64H32A16,16,0,0,0,16,80v96a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V80A16,16,0,0,0,224,64ZM72,112a8,8,0,1,1,8-8A8,8,0,0,1,72,112Zm40,0a8,8,0,1,1,8-8A8,8,0,0,1,112,112Zm40,0a8,8,0,1,1,8-8A8,8,0,0,1,152,112Zm40,0a8,8,0,1,1,8-8A8,8,0,0,1,192,112ZM160,160H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z" opacity="0.2" />
          <path d="M224,56H32A24,24,0,0,0,8,80v96a24,24,0,0,0,24,24H224a24,24,0,0,0,24-24V80A24,24,0,0,0,224,56Zm8,120a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H224a8,8,0,0,1,8,8ZM72,96a8,8,0,1,0,8,8A8,8,0,0,0,72,96Zm40,0a8,8,0,1,0,8,8A8,8,0,0,0,112,96Zm40,0a8,8,0,1,0,8,8A8,8,0,0,0,152,96Zm40,0a8,8,0,1,0,8,8A8,8,0,0,0,192,96ZM160,144H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Z" />
        </svg>
      ),
    },
    {
      key: 'about',
      label: 'About & Specs',
      icon: (
        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,176a16,16,0,1,1,16-16A16,16,0,0,1,128,200Zm16-56a8,8,0,0,1-8,8,8,8,0,0,1-8-8V104a8,8,0,0,1,8-8,8,8,0,0,1,8,8Z" opacity="0.2" />
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,8,8,0,0,1-8-8V104a8,8,0,0,1,8-8,8,8,0,0,1,8,8ZM128,68a12,12,0,1,0,12,12A12,12,0,0,0,128,68Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">

      {/* Shell Top Header Bar */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(resumeUrl || '/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline font-mono">{resumeUrl ? 'Return to Paper' : 'Dashboard'}</span>
          </button>

          <span className="text-border">/</span>

          <div className="flex items-center gap-1.5">
            <img src="/archyve-logo.svg" alt="Archyve" className="w-5 h-5 object-contain" />
            <span className="font-serif font-semibold text-sm text-foreground tracking-tight">Settings Shell</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Shell Viewport Layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-6 lg:p-8">

        {/* Sidebar Nav Shell */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="p-1 rounded-2xl border border-border bg-card shadow-xs space-y-1">
            <div className="px-3 pt-2.5 pb-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Preferences
            </div>

            {/* Vertical Segmented Control container */}
            <div className="relative flex flex-col gap-1">
              {/* Sliding active background pill layer */}
              <div
                className="absolute left-0 right-0 rounded-xl bg-card-subtle shadow-xs border border-border/80 pointer-events-none z-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
                style={{
                  top: 0,
                  height: pillStyle.height ? `${pillStyle.height}px` : undefined,
                  transform: `translateY(${pillStyle.top}px)`,
                  opacity: pillStyle.ready ? 1 : 0,
                }}
              />

              {navItems.map((item) => {
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    ref={(el) => {
                      navItemRefs.current[item.key] = el;
                    }}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={`relative z-10 w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors duration-200 text-left cursor-pointer select-none ${isActive
                      ? 'text-foreground font-semibold text-brand-primary dark:text-brand-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card-muted/30 font-medium'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-brand-primary dark:text-brand-accent' : 'text-muted-foreground'
                        }`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:bg-brand-accent/10 dark:text-brand-accent border border-brand-primary/20 transition-colors duration-200">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User status card widget in sidebar */}
          <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-2">
            <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
              Account Status
            </div>
            {loadingSession ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />
                <span>Checking status...</span>
              </div>
            ) : userEmail ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-mono text-foreground truncate font-medium">{userEmail}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-[11px] font-mono text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1.5 pt-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Anonymous session. Sign in to save history.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full btn-default text-xs"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Viewport */}
        <main className="flex-1 min-w-0">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-8">

            {/* SECTION 1: AI CONFIGURATION */}
            {activeSection === 'ai-config' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight">
                    AI Configuration
                  </h1>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    Manage client-side provider keys and active models. Keys remain exclusively in local browser storage.
                  </p>
                </div>

                {resumeUrl && (
                  <div className="p-3.5 rounded-2xl bg-highlight-glow/30 border border-brand-primary/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <KeyRound className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>Configure your API key below to resume research on your paper.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(resumeUrl)}
                      className="text-muted-foreground hover:text-foreground underline text-[11px] font-mono shrink-0"
                    >
                      Cancel & Return
                    </button>
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-6">

                  {/* Provider selection row */}
                  <div className="p-4 rounded-2xl border border-border bg-card-muted/40 space-y-3">
                    <div>
                      <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                        Select AI Provider
                      </h3>
                      <p className="text-xs text-foreground/80 mt-0.5">
                        Choose your LLM provider for synthesis, validation, and paper dossier generation.
                      </p>
                    </div>

                    {/* Custom Dropdown Selector for Provider */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProviderDropdownOpen(!isProviderDropdownOpen);
                          setIsModelDropdownOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none flex items-center justify-between shadow-xs hover:border-muted-foreground/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {provider === 'groq' ? 'Groq' : 'Google Gemini'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {provider === 'groq' ? '· GPT-OSS 120B & other models' : '· Gemini 3.5 Flash / Pro'}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isProviderDropdownOpen && (
                        <div className="absolute top-full mt-1.5 inset-x-0 z-50 rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
                          <button
                            type="button"
                            onClick={() => {
                              handleProviderChange('gemini');
                              setIsProviderDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono text-left transition-colors ${provider === 'gemini'
                              ? 'bg-card-subtle text-brand-primary dark:text-brand-accent font-bold'
                              : 'text-foreground hover:bg-card-muted'
                              }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">Google Gemini</span>
                              <span className="text-[10px] text-muted-foreground font-sans">Official Gemini 2.5/1.5 generation models</span>
                            </div>
                            {provider === 'gemini' && <Check className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleProviderChange('groq');
                              setIsProviderDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono text-left transition-colors ${provider === 'groq'
                              ? 'bg-card-subtle text-brand-primary dark:text-brand-accent font-bold'
                              : 'text-foreground hover:bg-card-muted'
                              }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">Groq (BYOK)</span>
                              <span className="text-[10px] text-muted-foreground font-sans">Ultra-fast inference with GPT-OSS 120B & other supported models</span>
                            </div>
                            {provider === 'groq' && <Check className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Key Row */}
                  <div className="p-4 rounded-2xl border border-border bg-card-muted/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                          {provider === 'groq' ? 'Groq API Key' : 'Gemini API Key'}
                        </h3>
                        <p className="text-xs text-foreground/80 mt-0.5">
                          Personal API key encrypted and saved only on this machine.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-border bg-card">
                        Local Vault
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={provider === 'groq' ? 'gsk_...' : 'AIzaSy...'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-brand-primary font-mono text-xs shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Active Model Selector */}
                  <div className="p-4 rounded-2xl border border-border bg-card-muted/40 space-y-3">
                    <div>
                      <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Model
                      </h3>
                      <p className="text-xs text-foreground/80 mt-0.5">
                        The specific reasoning model queried for research dossiers.
                      </p>
                    </div>

                    {/* Custom Dropdown Selector */}
                    <div className="space-y-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none flex items-center justify-between shadow-xs hover:border-muted-foreground/40 transition-colors"
                        >
                          <span>{model || (availableModels[0] || 'Select Model')}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isModelDropdownOpen && (
                          <div className="absolute top-full mt-1.5 inset-x-0 z-50 rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md max-h-48 overflow-y-auto">
                            {availableModels.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setModel(m);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors ${model === m
                                  ? 'bg-card-subtle text-brand-primary dark:text-brand-accent font-bold'
                                  : 'text-foreground hover:bg-card-muted'
                                  }`}
                              >
                                <span>{m}</span>
                                {model === m && <Check className="w-3 h-3 text-brand-primary dark:text-brand-accent" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label htmlFor="custom-model-input" className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                          Or Specify Custom Model ID
                        </label>
                        <input
                          id="custom-model-input"
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder={provider === 'groq' ? 'e.g. openai/gpt-oss-120b' : 'e.g. gemini-2.5-pro-experimental'}
                          className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-brand-primary font-mono shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions & Test Status */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="btn-primary inline-flex items-center gap-1.5"
                    >
                      <span>{resumeUrl ? 'Resume Research' : 'Save Configurations'}</span>
                      {resumeUrl && <span className="font-sans">→</span>}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="btn-ghost"
                    >
                      Test Connection
                    </button>
                  </div>

                  {testStatus !== 'idle' && (
                    <div className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs ${testStatus === 'success' ? 'bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary' :
                      testStatus === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400' :
                        'bg-card-muted border border-border text-foreground'
                      }`}>
                      {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5 text-brand-primary" />}
                      {testStatus === 'success' && <CheckCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />}
                      {testStatus === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                      <span className="font-mono text-[11px] leading-relaxed break-all">{testMessage}</span>
                    </div>
                  )}

                </form>
              </div>
            )}

            {/* SECTION 2: ACCOUNT & SESSIONS */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight">
                    Account & Sessions
                  </h1>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    Manage your authentication state and inspect active workspace session parameters.
                  </p>
                </div>

                {loadingSession ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                    <span>Verifying session credentials...</span>
                  </div>
                ) : userEmail && sessionData ? (
                  <div className="space-y-6">
                    {/* User profile banner */}
                    <div className="p-4 rounded-2xl border border-border bg-card-muted/40 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-serif text-foreground">
                            {userEmail.split('@')[0]}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-highlight-glow/20 border border-brand-primary/20 text-[10px] font-mono font-semibold text-brand-primary">
                            Authenticated
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{userEmail}</p>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>

                    {/* Session metadata grid */}
                    <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                          Active Device Session
                        </h3>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live Connection
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <KeyRound className="w-3 h-3" />
                              <span>Session ID</span>
                            </span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={sessionData.id}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-card-muted/40 font-mono text-[11px] text-muted-foreground focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                            <Laptop className="w-3 h-3" />
                            <span>Client User Agent</span>
                          </div>
                          <div className="p-3 rounded-xl border border-border bg-card-muted/40 font-mono text-[11px] text-foreground leading-relaxed">
                            {sessionData.userAgent}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                            <Globe className="w-3 h-3" />
                            <span>Origin IP Address</span>
                          </div>
                          <div className="p-3 rounded-xl border border-border bg-card-muted/40 font-mono text-[11px] text-foreground">
                            {sessionData.ipAddress}
                          </div>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                            <Calendar className="w-3 h-3" />
                            <span>Session Established</span>
                          </div>
                          <div className="p-3 rounded-xl border border-border bg-card-muted/40 font-mono text-[11px] text-foreground">
                            {sessionData.createdAt}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-border bg-card-muted/40 space-y-4 text-center">
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      You are currently anonymous. Signing in enables cross-device workspace history and generation persistence.
                    </p>
                    <button
                      onClick={() => router.push('/login')}
                      className="btn-primary"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight">
                    Shortcuts & Browser Extension
                  </h1>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    Quick keyboard commands and direct publisher extension hooks.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 rounded-2xl border border-border bg-card-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                        Global Activation Shortcut
                      </h3>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-card border border-border text-foreground">
                        Default
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      Press <kbd className="px-2 py-0.5 bg-card border border-border rounded font-mono text-xs text-foreground font-bold shadow-xs">Ctrl + Shift + H</kbd> &#91; Mac: <kbd className="px-2 py-0.5 bg-card border border-border rounded font-mono text-xs text-foreground font-bold shadow-xs">Cmd + Shift + H</kbd> &#93; on supported publisher pages (IEEE, Springer, Elsevier, JSTOR, arXiv) to trigger instant dossier extraction.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card-muted/40 space-y-2">
                    <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Extension Options Bridge
                    </h3>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      Custom URLs and local adapter overrides can be configured directly inside your browser&apos;s Extension Management pane under <em>archyve Options</em>.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-border bg-card-muted/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                            Browser Extensions
                          </h3>
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            v3.0
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-1">
                          Install the archyve bridge on Chromium and Gecko browsers for 1-click dossier extraction directly on paper URLs.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <a
                        href="https://ggl.link/archyve"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-brand-primary/40 hover:bg-card-subtle/50 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card-muted border border-border flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                              <circle fill="#000000" cx="64.149" cy="64.236" r="60.999" />
                              <circle fill="#4285F4" cx="64.149" cy="64.235" r="22.736" />
                              <path fill="#EA4335" d="M119.602 36.508C104.336 5.792 67.06-6.732 36.343 8.534A62.105 62.105 0 0012.578 29.3l24.955 43.253c-4.597-14.606 3.521-30.174 18.127-34.77a27.676 27.676 0 017.935-1.274" />
                              <path fill="#34A853" d="M12.578 29.3c-19.1 28.492-11.486 67.071 17.005 86.171a62.133 62.133 0 0029.575 10.319l26.063-44.363c-9.745 11.811-27.22 13.486-39.032 3.74a27.717 27.717 0 01-8.657-12.613" />
                              <path fill="#FBBC05" d="M59.158 125.791c34.204 2.585 64.027-23.047 66.613-57.25a62.097 62.097 0 00-6.17-32.031H63.595c15.312.07 27.67 12.541 27.598 27.854a27.725 27.725 0 01-5.972 17.064" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                              Chromium
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Chrome Web Store
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                      </a>

                      <a
                        href="https://dub.sh/archyve"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-brand-primary/40 hover:bg-card-subtle/50 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card-muted border border-border flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                            <img
                              src="/edge-logo.svg"
                              alt="Microsoft Edge"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground group-hover:text-brand-primary transition-colors">
                              Microsoft Edge
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Edge Add-ons Store
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight">
                    About archyve
                  </h1>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    Project Architecture, Announcement & Legal Policy
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card-muted/40 space-y-4 text-xs">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground font-mono">Architecture Version</span>
                    <span className="font-mono text-foreground font-bold">2.0.0 (Release)</span>
                  </div>

                  <div className="flex items-center gap-4 pt-2 font-mono text-xs font-semibold">
                    <button
                      onClick={() => router.push('/blog')}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-brand-primary hover:underline group"
                    >
                      Announcement Blog <svg className="size-3 rotate-180 transition-transform duration-200 ease-out-quint group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
                    </button>
                    <button
                      onClick={() => router.push('/privacy')}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-brand-primary hover:underline group"
                    >
                      Privacy Policy <svg className="size-3 rotate-180 transition-transform duration-200 ease-out-quint group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
                    </button>
                    <a
                      href="https://github.com/hebuildapps/archyve"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 whitespace-nowrap text-brand-primary hover:underline group"
                    >
                      GitHub Repository <svg className="size-3 rotate-180 transition-transform duration-200 ease-out-quint group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-xs gap-2 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
          <span>Loading settings...</span>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
