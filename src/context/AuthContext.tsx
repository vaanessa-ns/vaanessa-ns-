import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  configError: string | null;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | Error | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const handleInitialAuth = async () => {
      try {
        // 1. Process URL parameters if returning from an email confirmation link
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const tokenHash = urlParams.get('token_hash');
          const type = urlParams.get('type') as any;

          // If Supabase redirected with a PKCE code
          if (code) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data?.session) {
                setSession(data.session);
                setUser(data.session.user);
              }
            } catch (err) {
              console.warn('Code exchange note:', err);
            }
          }

          // If Supabase redirected with token_hash and type
          if (tokenHash && type) {
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type || 'signup',
              });
              if (!error && data?.session) {
                setSession(data.session);
                setUser(data.session.user);
              }
            } catch (err) {
              console.warn('Token hash verify note:', err);
            }
          }

          // Clean up hash/search if tokens were processed
          if (
            window.location.hash.includes('access_token') ||
            window.location.search.includes('code=') ||
            window.location.search.includes('token_hash=')
          ) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }

        // 2. Fetch current session
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

    // 3. Listen for auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Whenever a user is confirmed/signed in, ensure public.profiles record is updated
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
          msg = 'E-mail ainda não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          msg = 'Erro de conexão com o Supabase ("Failed to fetch"). Verifique se a URL do projeto está no formato https://<id>.supabase.co';
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
        ? 'Falha ao conectar com o servidor do Supabase. Verifique a URL configurada.'
        : (err.message || 'Erro ao realizar login.');
      setAuthError(msg);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured || !supabase) {
      const msg = supabaseConfigError || 'Supabase não configurado corretamente no projeto.';
      setAuthError(msg);
      return { error: new Error(msg) };
    }

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

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
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          msg = 'Erro de rede ("Failed to fetch") ao acessar o Supabase. Verifique se a variável VITE_SUPABASE_URL é a Project URL válida (https://<ref>.supabase.co).';
        }
        setAuthError(msg);
        return { error };
      }

      // If user signed up and session is immediately active, also upsert profile as safety fallback
      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (profileErr) {
          console.warn('Profile fallback upsert note (handled by trigger):', profileErr);
        }
      }

      return { error: null };
    } catch (err: any) {
      const msg = err.message?.includes('Failed to fetch')
        ? 'Falha de conexão com o Supabase ("Failed to fetch"). Verifique a URL do seu projeto Supabase.'
        : (err.message || 'Erro ao realizar cadastro.');
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

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

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

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

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
        signIn,
        signUp,
        signOut,
        resetPassword,
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

