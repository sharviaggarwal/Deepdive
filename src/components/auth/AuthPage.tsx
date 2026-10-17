import React, { useState } from 'react';
import { getSupabase, AuthUser } from '../../lib/supabase';
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Compass } from 'lucide-react';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const client = getSupabase();
    if (!client) {
      setErrorMsg('Supabase is not configured. Please check your .env configuration.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (data.user) {
          if (data.session) {
            onAuthenticated({
              id: data.user.id,
              email: data.user.email || email.trim(),
              created_at: data.user.created_at,
            });
          } else {
            setSuccessMsg('Account created! Please check your email to confirm your account, or sign in.');
            setIsSignUp(false);
          }
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (data.user) {
          onAuthenticated({
            id: data.user.id,
            email: data.user.email || email.trim(),
            created_at: data.user.created_at,
          });
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      let message = err.message || 'Authentication failed. Please verify your credentials.';
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      } else if (message.includes('User already registered')) {
        message = 'An account with this email already exists. Please log in.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    const client = getSupabase();
    if (!client) {
      setForgotStatus('Supabase client is not available.');
      return;
    }

    setForgotLoading(true);
    setForgotStatus(null);

    try {
      const { error } = await client.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      setForgotStatus('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      setForgotStatus(err.message || 'Failed to send reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-6 bg-[#FAF7F2] font-sans selection:bg-[#F6C8D2] selection:text-[#4A1525]">
      {/* Aesthetic Pinterest card container */}
      <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(74,21,37,0.06)] border border-[#4A1525]/10 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F6C8D2] via-[#C9C7F5] to-[#ECAAB8]" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FBE3E8] text-[#8E1735] mb-4 shadow-sm border border-[#8E1735]/15">
            <Compass className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#4A1525]">
            DeepDive
          </h1>
          <p className="text-sm text-[#4A1525]/60 mt-1.5 font-medium">
            Understand any video or audio.
          </p>
        </div>

        {/* Tab switch between Log in and Sign up */}
        <div className="flex p-1 bg-[#FAF7F2] rounded-2xl mb-6 border border-[#4A1525]/5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
              !isSignUp
                ? 'bg-white text-[#4A1525] shadow-sm'
                : 'text-[#4A1525]/60 hover:text-[#4A1525]'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
              isSignUp
                ? 'bg-white text-[#4A1525] shadow-sm'
                : 'text-[#4A1525]/60 hover:text-[#4A1525]'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#F43F5E]/20 text-[#9F1239] text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E11D48]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#22C55E]/20 text-[#166534] text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#4A1525]/75 mb-1.5 pl-1">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4A1525]/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#4A1525]/15 rounded-2xl text-xs text-[#4A1525] placeholder-[#4A1525]/35 focus:outline-none focus:border-[#8E1735] focus:ring-2 focus:ring-[#8E1735]/10 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 pl-1 pr-1">
              <label className="text-xs font-semibold text-[#4A1525]/75">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-[#8E1735] hover:underline font-medium"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4A1525]/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#4A1525]/15 rounded-2xl text-xs text-[#4A1525] placeholder-[#4A1525]/35 focus:outline-none focus:border-[#8E1735] focus:ring-2 focus:ring-[#8E1735]/10 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-[#8E1735] hover:bg-[#6E1129] active:scale-[0.99] text-white text-xs font-semibold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create your account' : 'Continue to DeepDive'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-[#4A1525]/40">
          Grounded video & audio research with local Llama 3.1 8B.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#FFFDF9] rounded-3xl p-6 shadow-xl border border-[#4A1525]/10 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-bold text-[#4A1525] mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-[#4A1525]/60 mb-4">
              Enter your email and we'll send you instructions to reset your password.
            </p>

            {forgotStatus && (
              <div className="mb-4 p-3 rounded-2xl bg-[#F0FDF4] text-[#166534] text-xs">
                {forgotStatus}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#4A1525]/15 rounded-2xl text-xs text-[#4A1525] focus:outline-none focus:border-[#8E1735]"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-xs text-[#4A1525]/70 hover:bg-[#FAF7F2] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 text-xs bg-[#8E1735] text-white rounded-xl font-medium hover:bg-[#6E1129]"
                >
                  {forgotLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
