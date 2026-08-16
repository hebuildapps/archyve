'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { keyStore } from '@/lib/security/AIKeyStore';
import { supabaseClient } from '@/lib/db/supabaseClient';
import {
  Key,
  User,
  Keyboard,
  Info,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut,
  Globe,
  Calendar,
  Laptop,
  KeyRound,
  HelpCircle
} from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';

interface SessionData {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // States
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const fallbackGemini = ['gemini-3.5-flash', 'gemini-3.6-pro'];
  const fallbackGroq = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama-3.1-8b-instant'];

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
          const list = data.data.map((m: any) => m.id);
          setAvailableModels(list.length > 0 ? list : fallbackGroq);
        } else {
          setAvailableModels(fallbackGroq);
        }
      } else {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentApiKey}`);
        if (res.ok) {
          const data = await res.json();
          const list = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''));
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

  // Load configuration on mount
  useEffect(() => {
    // Load Provider
    const currentProvider = keyStore.getProvider();
    setProvider(currentProvider);

    // Load API Key and Model
    const key = keyStore.getApiKey(currentProvider) || '';
    if (key) setApiKey(key);

    const currentModel = keyStore.getModel(currentProvider);
    setModel(currentModel);

    // Fetch models on load
    fetchModels(currentProvider, key);

    // Check Auth session
    async function checkSession() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          setUserEmail(session.user?.email || null);
          setSessionData({
            id: session.user.id,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome-based Browser',
            ipAddress: '127.0.0.1 (Local Session)',
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

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setUserEmail(session.user?.email || null);
        setSessionData({
          id: session.user.id,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome-based Browser',
          ipAddress: '127.0.0.1 (Local Session)',
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

  // Update form inputs when provider changes
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

  // Save configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    keyStore.setProvider(provider);
    keyStore.setApiKey(apiKey, provider);
    keyStore.setModel(model, provider);
    setTestStatus('success');
    setTestMessage('Settings saved locally.');
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 3000);
  };

  // Test API Key connection
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('API Key is empty.');
      return;
    }

    setTestStatus('testing');
    setTestMessage(`Testing connection to ${provider === 'groq' ? 'Groq' : 'Gemini'} API...`);

    try {
      if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        if (response.ok) {
          setTestStatus('success');
          setTestMessage('Connection successful! Your Groq API Key is valid.');
          fetchModels(provider, apiKey);
        } else {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = errJson.error?.message || `Status code ${response.status}`;
          setTestStatus('error');
          setTestMessage(`Connection failed: ${errMsg}`);
        }
      } else {
        const targetModel = model.trim() || 'gemini-3.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, confirm connection status' }] }],
          }),
        });

        if (response.ok) {
          setTestStatus('success');
          setTestMessage('Connection successful! Your Gemini API Key is valid.');
          fetchModels(provider, apiKey);
        } else {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = errJson.error?.message || `Status code ${response.status}`;
          setTestStatus('error');
          setTestMessage(`Connection failed: ${errMsg}`);
        }
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Network error: ${err.message || err}`);
    }
  };

  // Log out
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  return (
    <div className="flex-1 bg-background py-12 px-4 font-sans">
      <main className="max-w-xl mx-auto space-y-8">

        {/* Top action row */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="btn-ghost inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <ThemeToggle />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-primary/20 bg-highlight-glow/20 text-brand-primary text-xs font-mono font-medium mb-2">
            <span>Preferences</span>
          </div>
          <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight">
            Settings & AI Configuration
          </h1>
        </div>

        {/* 1. AI Configuration (BYOK) */}
        <section className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
            <Key className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-semibold font-serif">AI Settings (Bring Your Own Key)</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-muted-foreground">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary font-sans"
              >
                <option value="gemini" className="bg-card text-foreground">Google Gemini</option>
                <option value="groq" className="bg-card text-foreground">Groq (BYOK)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-muted-foreground">
                {provider === 'groq' ? 'Groq API Key' : 'Gemini API Key'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'groq' ? 'gsk_...' : 'AIzaSy...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-muted-foreground">
                Model Name
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary font-mono text-xs"
              >
                {!availableModels.includes(model) && model && (
                  <option value={model} className="bg-card text-foreground">{model} (Current)</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground">{m}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                API Keys and configuration are stored client-side in LocalStorage. They are never sent to our database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                className="btn-ghost"
              >
                Test Connection
              </button>
            </div>
          </form>

          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
              testStatus === 'success' ? 'bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary' :
              testStatus === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400' :
              'bg-card-muted border border-border text-foreground'
            }`}>
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5 text-brand-primary" />}
              {testStatus === 'success' && <CheckCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />}
              {testStatus === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="font-mono text-[11px] leading-relaxed break-all">{testMessage}</span>
            </div>
          )}
        </section>

        {/* 2. Account Information */}
        <section className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
            <User className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-semibold font-serif">Account Settings</h2>
          </div>

          {loadingSession ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
              <span>Verifying account status...</span>
            </div>
          ) : userEmail && sessionData ? (
            <div className="space-y-6">

              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-serif tracking-tight text-foreground">
                      {userEmail.split('@')[0]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-highlight-glow/20 border border-brand-primary/20 text-[10px] font-mono font-semibold text-brand-primary">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{userEmail}</p>
                </div>

                {/* Created Date */}
                <div className="text-xs text-muted-foreground sm:text-right font-mono">
                  Since {sessionData.createdAt.split(',')[0]}
                </div>
              </div>

              {/* Inner Session Info Card */}
              <div className="p-4 rounded-xl border border-border bg-card-muted/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground">Session Info</h3>
                  <span className="px-2 py-0.5 rounded-full bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary text-[10px] font-mono font-semibold">
                    Active
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Session ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                      <KeyRound className="w-3 h-3" />
                      <span>Session ID</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={sessionData.id}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-mono text-[10px] text-muted-foreground focus:outline-none"
                    />
                  </div>

                  {/* User Agent */}
                  <div className="flex gap-3">
                    <Laptop className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-[11px] text-muted-foreground">User Agent</div>
                      <div className="text-[11px] text-foreground font-mono leading-relaxed mt-0.5 max-w-sm">
                        {sessionData.userAgent}
                      </div>
                    </div>
                  </div>

                  {/* IP Address */}
                  <div className="flex gap-3">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-[11px] text-muted-foreground">IP Address</div>
                      <div className="text-[11px] text-foreground font-mono mt-0.5">
                        {sessionData.ipAddress}
                      </div>
                    </div>
                  </div>

                  {/* Created */}
                  <div className="flex gap-3">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-[11px] text-muted-foreground">Created</div>
                      <div className="text-[11px] text-foreground font-mono mt-0.5">
                        {sessionData.createdAt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log out action */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Session</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are currently signed out. Sign in to analyze new papers and record your research history.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="btn-primary"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </section>

        {/* 3. Extension Info */}
        <section className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
            <Keyboard className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-semibold font-serif">Extension Information</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <h4 className="font-semibold text-foreground mb-0.5">Keyboard Shortcut</h4>
              <p className="text-muted-foreground leading-relaxed">
                Trigger analysis instantly using <kbd className="px-1.5 py-0.5 bg-card-muted border border-border rounded font-mono text-[10px] text-foreground">Ctrl+Shift+H</kbd> (Mac: <kbd className="px-1.5 py-0.5 bg-card-muted border border-border rounded font-mono text-[10px] text-foreground">Cmd+Shift+H</kbd>).
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <h4 className="font-semibold text-foreground mb-0.5">Extension Behavior</h4>
              <p className="text-muted-foreground leading-relaxed">
                Preferences and configuration (such as custom URLs or local overrides) are managed directly within the extension's Options page, accessible via your browser's extension manager.
              </p>
            </div>
          </div>
        </section>

        {/* 4. About */}
        <section className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
            <Info className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-semibold font-serif">About</h2>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-foreground font-semibold">2.0.0 (Phase 1B MVP)</span>
            </div>
            <div className="flex gap-3 pt-2 border-t border-border text-muted-foreground font-semibold">
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground transition-colors">Changelog</a>
              <span>·</span>
              <a href="#" className="hover:text-rose-600 transition-colors">Report Issue</a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
