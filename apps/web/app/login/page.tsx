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
    <div className="max-w-md mx-auto w-full border border-border rounded-2xl bg-card p-8 shadow-xs space-y-6">
      
      {/* Tab selection */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setIsSignUp(false); setError(null); }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            !isSignUp 
              ? 'border-brand-primary text-foreground' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setIsSignUp(true); setError(null); }}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            isSignUp 
              ? 'border-brand-primary text-foreground' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-muted-foreground">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-mono">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary text-xs">
            <span className="leading-relaxed font-mono">{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
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
    <div className="flex-1 bg-background flex flex-col justify-center py-20 px-4">
      <Suspense fallback={
        <div className="flex justify-center text-muted-foreground text-xs gap-2 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
          <span>Loading login form...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
