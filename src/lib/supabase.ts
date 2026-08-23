import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const rawUrl: string = (metaEnv.VITE_SUPABASE_URL || '').trim();
const rawKey: string = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

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
      errorReason: 'Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não informadas nos Secrets.'
    };
  }

  // Check if user accidentally pasted an API key into VITE_SUPABASE_URL
  if (rawUrl.startsWith('sb_publishable_') || rawUrl.startsWith('sb_secret_') || rawUrl.startsWith('eyJ')) {
    return {
      client: null,
      isConfigured: false,
      errorReason: 'A variável VITE_SUPABASE_URL recebeu uma chave de API em vez da URL do projeto. A URL deve ser no formato https://<project-ref>.supabase.co (encontrada no Supabase em Project Settings > API > Project URL).'
    };
  }

  // Format URL if user omitted https:// or included leading prefixes/numbers
  let cleanUrl = rawUrl.replace(/^[0-9.\s]+/, '').trim();
  let normalizedUrl = cleanUrl;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (!parsed.protocol.startsWith('http')) {
      return {
        client: null,
        isConfigured: false,
        errorReason: 'A URL do Supabase fornecida possui um protocolo inválido.'
      };
    }

    // Always use the base origin (e.g. https://ddertklllcenypcvyhjd.supabase.co)
    // stripping any /rest/v1 or trailing subpaths
    const baseProjectUrl = parsed.origin;

    // Ignore placeholder templates
    if (
      parsed.hostname.includes('your-project') ||
      parsed.hostname.includes('placeholder') ||
      parsed.hostname.includes('SEU_PROJETO') ||
      rawKey.includes('placeholder') ||
      rawKey === 'your-anon-key'
    ) {
      return {
        client: null,
        isConfigured: false,
        errorReason: 'As credenciais do Supabase ainda contêm textos de exemplo/placeholder.'
      };
    }

    // Check if hostname looks valid for Supabase
    if (!parsed.hostname.includes('.')) {
      return {
        client: null,
        isConfigured: false,
        errorReason: `A URL do Supabase "${rawUrl}" não é um domínio válido. O formato correto é https://<id-do-projeto>.supabase.co`
      };
    }

    const client = createClient(baseProjectUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return { client, isConfigured: true, errorReason: null };
  } catch (error: any) {
    console.warn('Supabase initialization bypassed due to invalid configuration URL:', error);
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

