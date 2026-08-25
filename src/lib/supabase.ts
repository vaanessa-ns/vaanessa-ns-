import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Standard Vite environment variable reading
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const rawUrl: string = typeof envUrl === 'string' ? envUrl.trim() : '';
const rawKey: string = typeof envKey === 'string' ? envKey.trim() : '';

export interface SupabaseConfigStatus {
  client: SupabaseClient | null;
  isConfigured: boolean;
  errorReason: string | null;
}

function getValidSupabaseClient(): SupabaseConfigStatus {
  if (!rawUrl || !rawKey) {
    return {
      client: null,
      isConfigured: false,
      errorReason: 'Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não informadas nas variáveis de ambiente.'
    };
  }

  // Format URL if user omitted https://
  let normalizedUrl = rawUrl;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsed = new URL(normalizedUrl);
    // Project base origin (e.g. https://xxxx.supabase.co), stripping any trailing subpaths or /rest/v1
    const baseProjectUrl = parsed.origin;

    const client = createClient(baseProjectUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return { client, isConfigured: true, errorReason: null };
  } catch (error: any) {
    console.warn('Erro ao inicializar cliente Supabase:', error);
    return {
      client: null,
      isConfigured: false,
      errorReason: `URL do Supabase inválida: ${error?.message || 'Formato incorreto'}`
    };
  }
}

const configStatus = getValidSupabaseClient();

export const supabase = configStatus.client;
export const isSupabaseConfigured = configStatus.isConfigured;
export const supabaseConfigError = configStatus.errorReason;


