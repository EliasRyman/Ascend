import React, { useState } from 'react';
import {
    Check,
    X,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { signIn, signUp, signInWithGoogle } from '../supabase';

interface AuthPageProps {
    onSuccess: () => void;
}

const AuthPage = ({ onSuccess }: AuthPageProps) => {
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (activeTab === 'signup') {
                await signUp(email, password);
                setSuccess('Account created! Please check your email to verify.');
                setEmail('');
                setPassword('');
                setActiveTab('signin');
            } else {
                await signIn(email, password);
                onSuccess();
            }
        } catch (err: any) {
            if (err.message?.includes('Email not confirmed')) {
                setError('Please verify your email before signing in.');
            } else if (err.message?.includes('Invalid login')) {
                setError('Invalid email or password.');
            } else {
                setError(err.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign in failed. Please try again.');
            setGoogleLoading(false);
        }
    };

    const handleTabChange = (tab: 'signin' | 'signup') => {
        setActiveTab(tab);
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-100 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition-colors p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-600/30 mx-auto mb-4 overflow-hidden transform hover:scale-105 transition-transform">
                        <svg width="40" height="40" viewBox="0 0 720 340" fill="white">
                            <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Welcome to Ascend
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Your personal productivity companion
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => handleTabChange('signin')}
                            className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'signin'
                                ? 'text-violet-600 dark:text-violet-400'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Sign In
                            {activeTab === 'signin' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('signup')}
                            className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'signup'
                                ? 'text-violet-600 dark:text-violet-400'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Sign Up
                            {activeTab === 'signup' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600" />
                            )}
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <X size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Google Sign In */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || loading}
                            className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {googleLoading ? (
                                <Loader2 size={20} className="animate-spin text-slate-500" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-slate-700 dark:text-slate-200">Continue with Google</span>
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                                    or continue with email
                                </span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Password
                                    </label>
                                    {activeTab === 'signin' && (
                                        <button
                                            type="button"
                                            className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                                />
                                {activeTab === 'signup' && (
                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Must be at least 6 characters
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || googleLoading}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                            {activeTab === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                            <button
                                onClick={() => handleTabChange(activeTab === 'signin' ? 'signup' : 'signin')}
                                className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                            >
                                {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Terms */}
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 px-4">
                    By continuing, you agree to our{' '}
                    <a href="/terms.html" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy.html" className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</a>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
