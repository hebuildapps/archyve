'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/db/supabaseClient';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: signin | signup | forgot | recovery
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Privacy Policy Agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

    const type = searchParams.get('type');
    if (type === 'recovery') {
      setAuthMode('recovery');
    }

    // Listen to Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recovery');
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setPasswordError(null);

    // Terms agreement validation for Sign Up & Sign In
    if ((authMode === 'signup' || authMode === 'signin') && !agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    // Password validation for Sign Up or Recovery
    if (authMode === 'signup' || authMode === 'recovery') {
      const hasMinLength = password.length >= 6;
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`^]/.test(password);

      if (!hasMinLength && !hasSpecialChar) {
        setPasswordError('6 min chars, then add a special character');
        return;
      }
      if (!hasMinLength) {
        setPasswordError('6 min chars required');
        return;
      }
      if (!hasSpecialChar) {
        setPasswordError('Add a special character');
        return;
      }

      if (authMode === 'recovery' && password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'forgot') {
        // Send Supabase password reset link
        const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/login?type=recovery`,
        });

        if (resetError) throw resetError;

        setSuccessMsg('Password reset link sent! Please check your email inbox.');
      } else if (authMode === 'recovery') {
        // Set new password after clicking email recovery link
        const { error: updateError } = await supabaseClient.auth.updateUser({
          password,
        });

        if (updateError) throw updateError;

        setSuccessMsg('Password successfully updated! Redirecting...');
        setTimeout(() => {
          router.push(resumeUrl);
        }, 1200);
      } else if (authMode === 'signup') {
        // Sign up logic via Supabase Auth
        const { error: signUpError } = await supabaseClient.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) throw signUpError;

        setSuccessMsg('Registration successful! Please check your email for confirmation, or sign in.');
        setAuthMode('signin');
      } else {
        // Sign in logic via Supabase Auth
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        // Reset welcome banner on every login so it shows as requested
        if (typeof window !== 'undefined') {
          localStorage.removeItem('archyve_welcome_dismissed');
        }

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
    <div className="max-w-[420px] mx-auto w-full space-y-6">
      {/* Branding Logo Header */}
      <div className="flex flex-col items-center justify-center space-y-1 text-center">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          <img
            src="/archyve-logo.svg"
            alt="Archyve Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="font-serif font-semibold text-2xl text-foreground tracking-tight">
            archyve
          </span>
        </button>
      </div>

      <div className="border border-border/80 rounded-2xl bg-card p-7 sm:p-8 shadow-xs space-y-5">
        {/* Forgot Password View */}
        {authMode === 'forgot' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-serif font-medium tracking-tight text-foreground">
                Reset your password
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your email address and we&apos;ll send you a secure link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="heramb@archyve.xyz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors placeholder:text-muted-foreground/60"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-mono">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-mono">{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#374151] hover:bg-[#232b35] dark:bg-[#2d3135] dark:hover:bg-[#383e44] text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Send reset link</span>
              </button>
            </form>
          </div>
        ) : authMode === 'recovery' ? (
          /* Password Recovery Set New Password View */
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-medium tracking-tight text-foreground">
                Set new password
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose a new secure password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card-muted/40 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>

              {passwordError && (
                <p className="text-xs text-rose-500 font-mono flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-mono">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-mono">{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#374151] hover:bg-[#232b35] dark:bg-[#2d3135] dark:hover:bg-[#383e44] text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Update password</span>
              </button>
            </form>
          </div>
        ) : (
          /* Sign In & Sign Up Form matching reference image */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs sm:text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="heramb@archyve.xyz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-card-muted/30 text-sm text-foreground focus:outline-none focus:border-brand-primary transition-colors placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Password Field with right-aligned Forgot password? link */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-foreground">
                  Password
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-normal text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border ${passwordError && authMode === 'signup'
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-border/80 focus:border-brand-primary'
                    } bg-card-muted/30 text-sm text-foreground focus:outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {authMode === 'signup' && passwordError && (
                <p className="text-xs text-rose-500 font-mono flex items-center gap-1.5 pt-0.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-highlight-glow/20 border border-brand-primary/20 text-brand-primary flex items-start gap-2.5 text-xs text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{successMsg}</span>
              </div>
            )}

            {/* Dark Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#374151] hover:bg-[#232b35] dark:bg-[#2d3135] dark:hover:bg-[#383e44] text-white font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{authMode === 'signup' ? 'Sign up with email' : 'Sign in with email'}</span>
            </button>

            {/* OR CONTINUE WITH Divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/80" />
              </div>
              <div className="relative px-3 bg-card text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                OR CONTINUE WITH
              </div>
            </div>

            {/* Privacy Policy & Terms of Service Agreement Checkbox matching screenshot */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none group text-left">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-[4px] border-border text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-foreground underline underline-offset-2 hover:text-brand-primary transition-colors"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-foreground underline underline-offset-2 hover:text-brand-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Switcher between Sign In and Sign Up */}
            <div className="text-center pt-2 border-t border-border/40">
              {authMode === 'signin' ? (
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setError(null);
                      setSuccessMsg(null);
                      setPasswordError(null);
                    }}
                    className="text-foreground font-medium underline underline-offset-2 hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    Register
                  </button>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setError(null);
                      setSuccessMsg(null);
                      setPasswordError(null);
                    }}
                    className="text-foreground font-medium underline underline-offset-2 hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 bg-background flex flex-col justify-center py-20 px-4">
      <Suspense
        fallback={
          <div className="flex justify-center text-muted-foreground text-xs gap-2 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
            <span>Loading login form...</span>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
