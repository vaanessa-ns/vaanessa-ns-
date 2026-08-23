import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Database,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { signIn, signUp, resetPassword, resendConfirmation, authError, clearError, isConfigured, configError } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      alert('Informe seu e-mail para reenviar a confirmação.');
      return;
    }
    setResending(true);
    clearError();
    const { error } = await resendConfirmation(email);
    setResending(false);
    if (!error) {
      setSuccessMessage('Um novo link de confirmação foi enviado para seu e-mail!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    if (!email.trim()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (!error) {
          onClose();
        }
      } else if (mode === 'signup') {
        if (!name.trim()) {
          alert('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          alert('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (!error) {
          setSuccessMessage(
            'Conta criada com sucesso! Verifique seu e-mail e clique no link de confirmação para ativar sua conta.'
          );
          setMode('signin');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (!error) {
          setSuccessMessage('Enviamos um link de recuperação para seu e-mail.');
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121316] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {mode === 'signin' && 'Acessar Vfinance'}
            {mode === 'signup' && 'Criar Conta no Vfinance'}
            {mode === 'reset' && 'Recuperar Senha'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'signin' && 'Conecte-se com sua conta segura no Supabase'}
            {mode === 'signup' && 'Seus dados financeiros salvos e protegidos na nuvem'}
            {mode === 'reset' && 'Informe seu e-mail para receber as instruções'}
          </p>
        </div>

        {/* Supabase status warning if not configured */}
        {(!isConfigured || configError) && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <div className="flex items-start gap-2.5">
              <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">Ajuste de Configuração do Supabase</p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  {configError || 'Defina as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel de Secrets.'}
                </p>
                <div className="mt-2 text-[11px] text-slate-400 bg-black/30 p-2 rounded-lg space-y-1">
                  <div><strong>VITE_SUPABASE_URL:</strong> Deve ser <code className="text-emerald-400">https://seu-projeto.supabase.co</code></div>
                  <div><strong>VITE_SUPABASE_ANON_KEY:</strong> Chave anon/public (ex: <code className="text-emerald-400">sb_publishable_...</code> ou <code className="text-emerald-400">eyJ...</code>)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {authError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{authError}</p>
                {authError.toLowerCase().includes('confirmad') && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline block cursor-pointer transition"
                  >
                    {resending ? 'Reenviando e-mail...' : 'Clique aqui para reenviar o e-mail de confirmação'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Seu Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Vanessa Meira"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setSuccessMessage(null);
                      setMode('reset');
                    }}
                    className="text-[11px] text-emerald-500 hover:text-emerald-400 transition"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'signin' && 'Entrar na Conta'}
                {mode === 'signup' && 'Criar Minha Conta'}
                {mode === 'reset' && 'Enviar Instruções'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switchers */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          {mode === 'signin' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Não tem uma conta ainda?{' '}
              <button
                onClick={() => {
                  clearError();
                  setSuccessMessage(null);
                  setMode('signup');
                }}
                className="font-bold text-emerald-500 hover:text-emerald-400 transition"
              >
                Cadastre-se gratuitamente
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Já possui uma conta?{' '}
              <button
                onClick={() => {
                  clearError();
                  setSuccessMessage(null);
                  setMode('signin');
                }}
                className="font-bold text-emerald-500 hover:text-emerald-400 transition"
              >
                Faça login
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lembrou sua senha?{' '}
              <button
                onClick={() => {
                  clearError();
                  setSuccessMessage(null);
                  setMode('signin');
                }}
                className="font-bold text-emerald-500 hover:text-emerald-400 transition"
              >
                Voltar ao login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
