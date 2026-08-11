'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/db/supabaseClient';
import { AlertCircle, Loader2 } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab selector
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState('/');

  useEffect(() => {
    const rawResume = searchParams.get('resumeUrl');
    if (rawResume) {
      setResumeUrl(decodeURIComponent(rawResume));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        // Sign up logic
        const { error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        setSuccessMsg('Registration successful! Please check your email for verification, or sign in.');
        setIsSignUp(false);
      } else {
        // Sign in logic
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        // Redirect to original page
        router.push(resumeUrl);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full border border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-900/5 p-8 shadow-sm space-y-6">
      
      {/* Tab selection */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={() => { setIsSignUp(false); setError(null); }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            !isSignUp 
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setIsSignUp(true); setError(null); }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            isSignUp 
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-650"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-mono">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 text-xs">
            <span className="leading-relaxed font-mono">{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 bg-bg-base dark:bg-bg-base-dark flex flex-col justify-center py-20 px-4">
      <Suspense fallback={
        <div className="flex justify-center text-zinc-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading login form...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
