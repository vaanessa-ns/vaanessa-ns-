import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ResetPasswordViewProps {
  onNavigateToLogin?: () => void;
  onNavigateToApp?: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onNavigateToLogin,
  onNavigateToApp,
}) => {
  const { updatePassword, resetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery email state if session is missing or expired
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setHasValidSession(Boolean(session));
      } catch (err) {
        console.error('Error checking recovery session:', err);
        setHasValidSession(false);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        let msg = error.message;
        if (error.message.includes('Auth session missing') || error.message.includes('jwt')) {
          msg = 'Sua sessão de recuperação expirou ou é inválida. Solicite um novo link de recuperação.';
          setHasValidSession(false);
        } else if (error.message.includes('same_password')) {
          msg = 'A nova senha não pode ser igual à senha anterior.';
        }
        setErrorMessage(msg);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setSendingRecovery(true);
    setErrorMessage(null);
    const { error } = await resetPassword(recoveryEmail.trim());
    setSendingRecovery(false);

    if (error) {
      setErrorMessage(error.message || 'Erro ao enviar e-mail de recuperação.');
    } else {
      setRecoverySent(true);
    }
  };

  const handleBackToLogin = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/');
    }
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else if (onNavigateToApp) {
      onNavigateToApp();
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

        {/* State 1: Password Successfully Changed */}
        {isSuccess ? (
          <div className="text-center py-4 space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Senha alterada com sucesso!
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Sua nova senha foi salva com segurança no Supabase. Você já pode fazer login no Vfinance.
              </p>
            </div>

            <button
              onClick={handleBackToLogin}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <span>Voltar para o login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : hasValidSession === false ? (
          /* State 2: Session Missing / Expired Link */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Link de recuperação expirado
              </h1>
              <p className="text-xs text-slate-400">
                Por motivos de segurança, os links de recuperação possuem tempo limite. Informe seu e-mail para receber um novo link.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {recoverySent ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Novo link enviado! Verifique sua caixa de entrada.</span>
              </div>
            ) : (
              <form onSubmit={handleRequestNewLink} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Seu e-mail cadastrado:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingRecovery}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingRecovery ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Enviar novo link de recuperação</span>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                onClick={handleBackToLogin}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Reset Password Form */
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Crie uma nova senha
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Escolha uma nova senha forte para acessar sua conta Vfinance.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={newPassword.length >= 6 ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Pelo menos 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={
                      newPassword && confirmPassword && newPassword === confirmPassword
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }
                  >
                    ✓ As duas senhas coincidem
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Salvar nova senha</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={handleBackToLogin}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Cancelar e voltar ao login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
