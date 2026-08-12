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
        <section className="p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <Key className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">AI Settings</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq (BYOK)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {provider === 'groq' ? 'Groq API Key' : 'Gemini API Key'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'groq' ? 'gsk_...' : 'AIzaSy...'}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Model Name
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
              >
                {!availableModels.includes(model) && model && (
                  <option value={model}>{model} (Current)</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-mono">
                API Keys and configuration are stored client-side in LocalStorage. They are never sent to our database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Test Connection
              </button>
            </div>
          </form>

          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${testStatus === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' :
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
        <section className="p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"></rect><path d="M232,128c0,12.51-17.82,21.95-22.68,33.69-4.68,11.32,1.42,30.64-7.78,39.85s-28.53,3.1-39.85,7.78C150,214.18,140.5,232,128,232s-22-17.82-33.69-22.68c-11.32-4.68-30.65,1.42-39.85-7.78s-3.1-28.53-7.78-39.85C41.82,150,24,140.5,24,128s17.82-22,22.68-33.69C51.36,83,45.26,63.66,54.46,54.46S83,51.36,94.31,46.68C106.05,41.82,115.5,24,128,24S150,41.82,161.69,46.68c11.32,4.68,30.65-1.42,39.85,7.78s3.1,28.53,7.78,39.85C214.18,106.05,232,115.5,232,128Z" opacity="0.2"></path><path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Zm28-72c0,17.38-13.76,31.93-32,35.28V144a8,8,0,0,1-16,0v-8a8,8,0,0,1,8-8c13.23,0,24-9,24-20s-10.77-20-24-20-24,9-24,20v4a8,8,0,0,1-16,0v-4c0-19.85,17.94-36,40-36S168,88.15,168,108Z"></path></svg>
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
              <div className="p-5 rounded-[24px] border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
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

        {/* 3. Extension Info */}
        <section className="p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
            <Keyboard className="w-4.5 h-4.5 text-zinc-400" />
            <h2 className="text-sm font-semibold">Extension Information</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">Keyboard Shortcut</h4>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Trigger analysis instantly using <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px]">Ctrl+Shift+H</kbd> (Mac: <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded font-mono text-[10px]">Cmd+Shift+H</kbd>).
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">Extension Behavior</h4>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Preferences and configuration (such as custom URLs or local overrides) are managed directly within the extension's Options page, accessible via your browser's extension manager.
              </p>
            </div>
          </div>
        </section>

        {/* 4. About */}
        <section className="p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/5 space-y-3 shadow-sm">
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
