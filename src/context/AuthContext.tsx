import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import { getAuthRedirectUrl } from '../utils/authUrls';

export type AuthScreenType = 'app' | 'confirm-email' | 'reset-password';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  configError: string | null;
  authError: string | null;
  authScreen: AuthScreenType;
  setAuthScreen: (screen: AuthScreenType) => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: AuthError | Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | Error | null }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | Error | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreenType>('app');

  useEffect(() => {
    // Check URL to determine initial screen
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search;
      const hash = window.location.hash;

      if (pathname.includes('/redefinir-senha') || search.includes('mode=redefinir-senha') || hash.includes('type=recovery')) {
        setAuthScreen('reset-password');
      } else if (
        pathname.includes('/confirmar-email') ||
        search.includes('mode=confirmar-email') ||
        hash.includes('type=signup') ||
        search.includes('type=signup') ||
        search.includes('token_hash=')
      ) {
        setAuthScreen('confirm-email');
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const handleInitialAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const tokenHash = urlParams.get('token_hash');
          const type = urlParams.get('type') as any;
          const hash = window.location.hash;

          // Check if hash has type=recovery
          if (hash.includes('type=recovery')) {
            setAuthScreen('reset-password');
          } else if (hash.includes('type=signup')) {
            setAuthScreen('confirm-email');
          }

          // 1. Process PKCE Code exchange
          if (code) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data?.session) {
                setSession(data.session);
                setUser(data.session.user);
                if (type === 'recovery' || hash.includes('type=recovery')) {
                  setAuthScreen('reset-password');
                } else if (type === 'signup' || window.location.pathname.includes('/confirmar-email')) {
                  setAuthScreen('confirm-email');
                }
              }
            } catch (err) {
              console.warn('Code exchange note:', err);
            }
          }

          // 2. Process OTP / Token hash verify
          if (tokenHash && type) {
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type || 'signup',
              });
              if (!error && data?.session) {
                setSession(data.session);
                setUser(data.session.user);
                if (type === 'recovery') {
                  setAuthScreen('reset-password');
                } else {
                  setAuthScreen('confirm-email');
                }
              }
            } catch (err) {
              console.warn('Token hash verify note:', err);
            }
          }
        }

        // 3. Fetch active session
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching Supabase session:', error);
        }
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
      } catch (err) {
        console.error('Failed to get Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    handleInitialAuth();

    // 4. Listen for auth changes (PASSWORD_RECOVERY, SIGNED_IN, SIGNED_OUT, USER_UPDATED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          setAuthScreen('reset-password');
        }

        // Sync profile record on authentication events
        if (currentSession?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
          try {
            await supabase.from('profiles').upsert({
              id: currentSession.user.id,
              name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'Usuário',
              email: currentSession.user.email,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          } catch (profileErr) {
            console.warn('Profile sync on auth change note:', profileErr);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes('Invalid login credentials')) {
          msg = 'E-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          msg = 'E-mail ainda não confirmado. Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          msg = 'Erro de conexão com o Supabase. Verifique sua conexão ou se a URL está correta.';
        }
        setAuthError(msg);
        return { error };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { error: null };
    } catch (err: any) {
      const msg = err.message?.includes('Failed to fetch')
        ? 'Falha ao conectar com o servidor do Supabase.'
        : (err.message || 'Erro ao realizar login.');
      setAuthError(msg);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    const redirectUrl = getAuthRedirectUrl('/confirmar-email');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes('User already registered')) {
          msg = 'Este e-mail já possui cadastro. Faça login.';
        } else if (error.message.includes('Password should be at least')) {
          msg = 'A senha deve conter pelo menos 6 caracteres.';
        }
        setAuthError(msg);
        return { error };
      }

      // Upsert initial profile
      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (profileErr) {
          console.warn('Profile fallback upsert note:', profileErr);
        }
      }

      return { error: null, user: data?.user };
    } catch (err: any) {
      const msg = err.message || 'Erro ao realizar cadastro.';
      setAuthError(msg);
      return { error: err };
    }
  };

  const resendConfirmation = async (email: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    const redirectUrl = getAuthRedirectUrl('/confirmar-email');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao reenviar e-mail de confirmação.');
      return { error: err };
    }
  };

  const signOut = async () => {
    setAuthError(null);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    const redirectUrl = getAuthRedirectUrl('/redefinir-senha');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) {
        setAuthError(error.message);
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao solicitar redefinição de senha.');
      return { error: err };
    }
  };

  const updatePassword = async (password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao atualizar a senha.');
      return { error: err };
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        configError: supabaseConfigError,
        authError,
        authScreen,
        setAuthScreen,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        resendConfirmation,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
