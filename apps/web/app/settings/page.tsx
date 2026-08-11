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

interface SessionData {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  
  // States
  const [apiKey, setApiKey] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  
  // Extension preferences
  const [enableFloatingButton, setEnableFloatingButton] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    // Load API Key
    const key = keyStore.getApiKey();
    if (key) setApiKey(key);

    // Load Extension preferences
    if (typeof window !== 'undefined') {
      const storedFlag = localStorage.getItem('archyve_enable_floating_button');
      setEnableFloatingButton(storedFlag === 'true');
    }

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

  // Save key
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    keyStore.setApiKey(apiKey);
    setTestStatus('success');
    setTestMessage('API Key saved locally.');
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 3000);
  };

  // Test API Key connection
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('API Key is empty.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection to Gemini API...');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
        setTestMessage('Connection successful! Your API Key is valid.');
      } else {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `Status code ${response.status}`;
        setTestStatus('error');
        setTestMessage(`Connection failed: ${errMsg}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Network error: ${err.message || err}`);
    }
  };

  // Handle preference toggle
  const handleFloatingButtonToggle = (checked: boolean) => {
    setEnableFloatingButton(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('archyve_enable_floating_button', checked ? 'true' : 'false');
    }
  };

  // Log out
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  return (
    <div className="flex-1 bg-bg-base dark:bg-bg-base-dark py-12 px-4 font-sans">
      <main className="max-w-xl mx-auto space-y-8">
        
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <h1 className="text-2xl font-serif font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>

        {/* 1. AI Configuration (BYOK) */}
        <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <Key className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">AI Settings</h2>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                AI Provider
              </label>
              <select
                disabled
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/30 text-sm text-zinc-500 cursor-not-allowed"
              >
                <option>Google Gemini (Default)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
              />
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-mono">
                API Keys are stored client-side in LocalStorage. They are never sent to our database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Save API Key
              </button>
              <button
                type="button"
                onClick={handleTestKey}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Test Connection
              </button>
            </div>
          </form>

          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${
              testStatus === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' :
              testStatus === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400' :
              'bg-zinc-50 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300'
            }`}>
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
              {testStatus === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
              {testStatus === 'error' && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
              <span className="font-mono text-[11px] leading-relaxed break-all">{testMessage}</span>
            </div>
          )}
        </section>

        {/* 2. Account Information */}
        <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <User className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">Account Settings</h2>
          </div>

          {loadingSession ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying account status...</span>
            </div>
          ) : userEmail && sessionData ? (
            <div className="space-y-6">
              
              {/* Profile Card Header (Inspiration: img 1) */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
                      {userEmail.split('@')[0]}
                    </span>
                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                      User
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">{userEmail}</p>
                </div>
                
                {/* Created Date */}
                <div className="text-xs text-zinc-400 dark:text-zinc-500 sm:text-right font-sans">
                  Since {sessionData.createdAt.split(',')[0]}
                </div>
              </div>

              {/* Inner Session Info Card (Inspiration: img 1) */}
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-850 dark:text-zinc-100">Session Info</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-semibold">
                    Active
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Session ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="font-semibold">Session ID</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={sessionData.id}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-905/30 font-mono text-[10px] text-zinc-600 dark:text-zinc-450 focus:outline-none"
                    />
                  </div>

                  {/* User Agent */}
                  <div className="flex gap-3">
                    <Laptop className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-zinc-650 dark:text-zinc-300">User Agent</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-450 font-mono leading-relaxed mt-0.5 max-w-sm">
                        {sessionData.userAgent}
                      </div>
                    </div>
                  </div>

                  {/* IP Address */}
                  <div className="flex gap-3">
                    <Globe className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-zinc-650 dark:text-zinc-300">IP Address</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-450 font-mono mt-0.5">
                        {sessionData.ipAddress}
                      </div>
                    </div>
                  </div>

                  {/* Created */}
                  <div className="flex gap-3">
                    <Calendar className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-zinc-650 dark:text-zinc-300">Created</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-450 font-mono mt-0.5">
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
                  className="px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-450 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Session</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                You are currently signed out. Sign in to analyze new papers and record your research history.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </section>

        {/* 3. Extension Preferences */}
        <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <Keyboard className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">Extension Preferences</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">Keyboard Shortcut</h4>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Trigger analysis instantly using <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px]">Ctrl+Shift+H</kbd> (Mac: <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px]">Cmd+Shift+H</kbd>).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-850">
              <div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">Floating Page Button</h4>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Show a floating &quot;Analyze with Archyve&quot; pill in the corner of supported publisher tabs.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableFloatingButton}
                onChange={(e) => handleFloatingButtonToggle(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-400"
              />
            </div>
          </div>
        </section>

        {/* 4. About */}
        <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <Info className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">About</h2>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Version</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">2.0.0 (Phase 1B MVP)</span>
            </div>
            <div className="flex gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 font-semibold">
              <a href="#" className="hover:underline">Documentation</a>
              <span>·</span>
              <a href="#" className="hover:underline">Changelog</a>
              <span>·</span>
              <a href="#" className="hover:underline text-rose-500">Report Issue</a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
