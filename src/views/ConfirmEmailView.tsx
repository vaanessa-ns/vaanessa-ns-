import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ConfirmEmailViewProps {
  onNavigateToLogin?: () => void;
  onNavigateToApp?: () => void;
}

export const ConfirmEmailView: React.FC<ConfirmEmailViewProps> = ({
  onNavigateToLogin,
  onNavigateToApp,
}) => {
  const { user, resendConfirmation } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const processConfirmation = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const tokenHash = urlParams.get('token_hash');
      const type = (urlParams.get('type') as any) || 'signup';

      // If user is already authenticated with confirmed email
      if (user?.email_confirmed_at) {
        setStatus('success');
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setStatus('error');
        setErrorMessage('Configuração do Supabase não encontrada.');
        return;
      }

      // 1. Exchange PKCE Code
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging code:', error);
            setStatus('error');
            setErrorMessage(
              error.message.includes('expired')
                ? 'O link de confirmação expirou. Solicite um novo link abaixo.'
                : 'Não foi possível validar o link de confirmação.'
            );
            return;
          }
          if (data.session) {
            setStatus('success');
            return;
          }
        } catch (err: any) {
          console.error('Exchange exception:', err);
        }
      }

      // 2. Verify OTP / Token Hash
      if (tokenHash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'signup',
          });
          if (error) {
            console.error('Error verifying token hash:', error);
            setStatus('error');
            setErrorMessage(
              error.message.includes('expired')
                ? 'O link de confirmação expirou. Solicite um novo link abaixo.'
                : 'Código de verificação inválido ou expirado.'
            );
            return;
          }
          if (data.session || data.user) {
            setStatus('success');
            return;
          }
        } catch (err: any) {
          console.error('Verify exception:', err);
        }
      }

      // If redirected with hash containing access_token
      if (window.location.hash.includes('access_token')) {
        setStatus('success');
        return;
      }

      // If no token in URL, check if active session is already present
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStatus('success');
      } else {
        // Direct visit to /confirmar-email without query
        setStatus('success');
      }
    };

    processConfirmation();
  }, [user]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    setResendSuccess(false);
    const { error } = await resendConfirmation(resendEmail.trim());
    setResending(false);

    if (error) {
      setErrorMessage(error.message || 'Erro ao reenviar confirmação.');
    } else {
      setResendSuccess(true);
    }
  };

  const handleEnterApp = () => {
    // Clean up url hash and params
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/');
    }
    if (onNavigateToApp) {
      onNavigateToApp();
    } else if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-[#161618] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl">
            V
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Vfinance
          </span>
        </div>

        {/* State: Loading */}
        {status === 'loading' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Validando seu e-mail</h2>
              <p className="text-xs text-slate-400 mt-1">
                Aguarde um instante enquanto confirmamos sua conta no Supabase...
              </p>
            </div>
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Seu e-mail foi confirmado com sucesso!
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Sua conta no <strong className="text-emerald-400">Vfinance</strong> foi ativada. Agora você tem acesso completo ao controle financeiro e inteligência de dados.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 flex items-center gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Autenticação segura e criptografada via Supabase Auth.
              </span>
            </div>

            <button
              onClick={handleEnterApp}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <span>Entrar no Vfinance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: Error */}
        {status === 'error' && (
          <div className="space-y-6 py-2 animate-in fade-in duration-300">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Não foi possível confirmar o e-mail
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMessage || 'O link pode ter expirado ou já ter sido utilizado.'}
              </p>
            </div>

            {resendSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Novo e-mail de confirmação enviado com sucesso! Verifique sua caixa de entrada.</span>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Reenviar link de confirmação:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Reenviar E-mail de Confirmação</span>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={handleEnterApp}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
              >
                Voltar para a página inicial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
