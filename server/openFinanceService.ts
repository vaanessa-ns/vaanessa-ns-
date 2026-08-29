import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

export interface PluggyAuthResponse {
  apiKey: string;
}

export interface PluggyConnectTokenResponse {
  accessToken: string;
}

export interface BankConnector {
  id: string | number;
  name: string;
  primaryColor: string;
  type: string;
  country: string;
  hasMFA?: boolean;
  institutionUrl?: string;
  imageUrl?: string;
}

export const SUPPORTED_INSTITUTIONS: BankConnector[] = [
  {
    id: 260,
    name: 'Nubank',
    primaryColor: '#820AD1',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://nubank.com.br',
  },
  {
    id: 341,
    name: 'Itaú Unibanco',
    primaryColor: '#EC7000',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.itau.com.br',
  },
  {
    id: 237,
    name: 'Banco Bradesco',
    primaryColor: '#CC092F',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://banco.bradesco',
  },
  {
    id: 33,
    name: 'Banco Santander',
    primaryColor: '#EA1D25',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.santander.com.br',
  },
  {
    id: 1,
    name: 'Banco do Brasil',
    primaryColor: '#F8D117',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.bb.com.br',
  },
  {
    id: 104,
    name: 'Caixa Econômica Federal',
    primaryColor: '#005CA9',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.caixa.gov.br',
  },
  {
    id: 77,
    name: 'Banco Inter',
    primaryColor: '#FF7A00',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://inter.co',
  },
  {
    id: 336,
    name: 'C6 Bank',
    primaryColor: '#242424',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.c6bank.com.br',
  },
  {
    id: 208,
    name: 'BTG Pactual',
    primaryColor: '#001E62',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.btgpactual.com',
  },
  {
    id: 756,
    name: 'Sicoob',
    primaryColor: '#003641',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.sicoob.com.br',
  },
  {
    id: 748,
    name: 'Sicredi',
    primaryColor: '#005D37',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.sicredi.com.br',
  },
  {
    id: 102,
    name: 'XP Investimentos',
    primaryColor: '#000000',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.xpi.com.br',
  },
  {
    id: 201,
    name: 'Pluggy Sandbox Test Bank',
    primaryColor: '#10B981',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://pluggy.ai',
  },
];

let cachedPluggyApiKey: { key: string; expiresAt: number } | null = null;

export function getSanitizedCredentials() {
  const rawId =
    process.env.PLUGGY_CLIENT_ID ||
    process.env.PLUGGY_CLIENTID ||
    process.env.pluggy_client_id ||
    process.env.VITE_PLUGGY_CLIENT_ID ||
    '';
  const rawSecret =
    process.env.PLUGGY_CLIENT_SECRET ||
    process.env.PLUGGY_CLIENTSECRET ||
    process.env.pluggy_client_secret ||
    process.env.VITE_PLUGGY_CLIENT_SECRET ||
    '';
  const clientId = rawId.replace(/^["']|["']$/g, '').trim();
  const clientSecret = rawSecret.replace(/^["']|["']$/g, '').trim();
  return { clientId, clientSecret };
}

export function getSanitizedRedirectUri(override?: string) {
  const envUri = (
    process.env.PLUGGY_OAUTH_REDIRECT_URI ||
    process.env.PLUGGY_REDIRECT_URI ||
    ''
  ).replace(/^["']|["']$/g, '').trim();
  if (envUri) return envUri;
  if (override) return override.replace(/^["']|["']$/g, '').trim();
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  }
  return 'https://vanessa-ns.vercel.app';
}

export function getDefaultWebhookUrl(): string {
  const envWh = (process.env.PLUGGY_WEBHOOK_URL || '').replace(/^["']|["']$/g, '').trim();
  if (envWh) return envWh;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}/api/pluggy/webhook`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}/api/pluggy/webhook`;
  }
  return 'https://vanessa-ns.vercel.app/api/pluggy/webhook';
}

/**
 * Autentica com a Pluggy usando PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET (apenas no servidor)
 * POST https://api.pluggy.ai/auth
 */
export async function getPluggyApiKey(): Promise<{ apiKey: string | null; error?: string; status?: number }> {
  const { clientId, clientSecret } = getSanitizedCredentials();

  if (!clientId || !clientSecret) {
    console.warn('[Pluggy Backend Auth] PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configurados no ambiente do servidor.');
    return {
      apiKey: null,
      error: 'Variáveis de ambiente PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configuradas no servidor.',
      status: 401,
    };
  }

  const now = Date.now();
  if (cachedPluggyApiKey && cachedPluggyApiKey.expiresAt > now + 60000) {
    return { apiKey: cachedPluggyApiKey.key };
  }

  console.log(`[Pluggy Backend Auth] [Etapa 1/2] Iniciando autenticação em https://api.pluggy.ai/auth (ID configurado: ${Boolean(clientId)}, Secret configurado: ${Boolean(clientSecret)})...`);

  try {
    const res = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
      }),
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson?.message || errorJson?.codeDescription || JSON.stringify(errorJson);
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText) errorMsg = errorText;
      }
      console.warn(`[Pluggy Backend Auth] [Etapa 1/2] Falha na autenticação (HTTP ${res.status}): ${errorMsg}`);
      return {
        apiKey: null,
        error: `Falha na autenticação com a Pluggy (HTTP ${res.status}): ${errorMsg}`,
        status: res.status,
      };
    }

    const data = (await res.json()) as PluggyAuthResponse;
    if (data?.apiKey) {
      console.log('[Pluggy Backend Auth] [Etapa 1/2] Autenticação bem-sucedida. API Key obtida com sucesso.');
      cachedPluggyApiKey = {
        key: data.apiKey,
        expiresAt: now + 100 * 60 * 1000, // ~100 minutos (duração do token da Pluggy é de ~2 horas)
      };
      return { apiKey: data.apiKey };
    } else {
      console.warn('[Pluggy Backend Auth] [Etapa 1/2] Resposta da Pluggy não continha o campo apiKey.');
      return {
        apiKey: null,
        error: 'Resposta da Pluggy não retornou a chave de API.',
        status: 500,
      };
    }
  } catch (err: any) {
    console.error('[Pluggy Backend Auth] [Etapa 1/2] Erro de rede/comunicação ao conectar com api.pluggy.ai/auth:', err?.message || err);
    return {
      apiKey: null,
      error: `Erro ao conectar com api.pluggy.ai/auth: ${err?.message || 'Falha de rede'}`,
      status: 500,
    };
  }
}

export function getSupportedInstitutions(): BankConnector[] {
  return SUPPORTED_INSTITUTIONS;
}

export interface PluggyConnectTokenResult {
  success: boolean;
  accessToken: string;
  connectToken: string;
  provider: 'pluggy' | 'sandbox';
  sandbox: boolean;
  error?: string;
  step?: 'auth' | 'connect_token' | 'config' | 'network';
  status?: number;
}

/**
 * Gera um novo Connect Token para inicializar o Pluggy Connect Widget no frontend
 * POST https://api.pluggy.ai/connect_token
 */
export async function createPluggyConnectToken(options?: {
  itemId?: string;
  clientUserId?: string;
  oauthRedirectUri?: string;
  connectorId?: number;
}): Promise<PluggyConnectTokenResult> {
  const authResult = await getPluggyApiKey();

  if (!authResult.apiKey) {
    console.log('[Pluggy Backend ConnectToken] Sem API Key válida. Retornando erro estruturado em formato JSON.');
    return {
      success: false,
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
      error: authResult.error || 'Não foi possível autenticar no serviço da Pluggy.',
      step: 'auth',
      status: authResult.status || 401,
    };
  }

  const apiKey = authResult.apiKey;

  try {
    console.log('[Pluggy Backend ConnectToken] [Etapa 2/2] Gerando Connect Token em https://api.pluggy.ai/connect_token com header X-API-KEY...');

    const redirectUri = getSanitizedRedirectUri(options?.oauthRedirectUri);

    const payload: any = {};

    const optionsObj: any = {
      oauthRedirectUri: redirectUri,
    };

    if (options?.clientUserId) {
      optionsObj.clientUserId = String(options.clientUserId);
    }

    payload.options = optionsObj;

    if (options?.itemId) {
      payload.itemId = String(options.itemId);
    }

    const res = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as PluggyConnectTokenResponse;
      const token = data?.accessToken || '';
      console.log(`[Pluggy Backend ConnectToken] [Etapa 2/2] Connect Token gerado com sucesso (tamanho: ${token.length} chars).`);
      return {
        success: true,
        accessToken: token,
        connectToken: token,
        provider: 'pluggy',
        sandbox: false,
        status: 200,
      };
    } else {
      let errorDetail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errorDetail = errJson?.message || errJson?.codeDescription || JSON.stringify(errJson);
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) errorDetail = errText;
      }
      console.warn(`[Pluggy Backend ConnectToken] [Etapa 2/2] Erro na Pluggy (${res.status}):`, errorDetail);
      return {
        success: false,
        accessToken: '',
        connectToken: '',
        provider: 'pluggy',
        sandbox: false,
        error: `Erro ao gerar Connect Token na Pluggy (HTTP ${res.status}): ${errorDetail}`,
        step: 'connect_token',
        status: res.status,
      };
    }
  } catch (e: any) {
    console.error('[Pluggy Backend ConnectToken] [Etapa 2/2] Exceção durante requisição de Connect Token:', e?.message || e);
    return {
      success: false,
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
      error: `Falha de comunicação com api.pluggy.ai: ${e?.message || 'Erro de conexão'}`,
      step: 'network',
      status: 500,
    };
  }
}

/**
 * Consulta dados reais da Pluggy pelo itemId (usando X-API-KEY do servidor)
 * Normaliza contas, transações, saldos, cartões e PIX no formato esperado pelo VFinance
 */
export async function fetchPluggyItemData(itemId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}> {
  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: authResult.error || 'Credenciais Pluggy não configuradas no servidor.',
      status: 401,
    };
  }

  try {
    console.log(`[Pluggy Backend Sync] Consultando dados reais do Item ${itemId} na Pluggy...`);

    // 1. Fetch Item details
    const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    if (!itemRes.ok) {
      let errDetail = `HTTP ${itemRes.status}`;
      try {
        const errJson = await itemRes.json();
        errDetail = errJson?.message || errJson?.codeDescription || JSON.stringify(errJson);
      } catch {}
      console.warn(`[Pluggy Backend Sync] Falha ao consultar Item ${itemId} (${itemRes.status}):`, errDetail);
      return {
        success: false,
        error: `Falha ao obter dados do item na Pluggy: ${errDetail}`,
        status: itemRes.status,
      };
    }

    const item = await itemRes.json();

    // 2. Fetch Accounts (with retry if the connector is still syncing initial data)
    let rawAccounts: any[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      });

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        rawAccounts = accountsData?.results || [];
        if (rawAccounts.length > 0 || item?.status === 'UPDATED' || attempts >= maxAttempts) {
          break;
        }
      }

      // Wait 1.5 seconds before retrying if initial accounts are still processing
      if (attempts < maxAttempts) {
        console.log(`[Pluggy Backend Sync] Aguardando processamento das contas (tentativa ${attempts}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // 3. Fetch Bills (Invoices / Cartão de crédito)
    const billsRes = await fetch(`https://api.pluggy.ai/bills?itemId=${itemId}`, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });
    const billsData = billsRes.ok ? await billsRes.json() : { results: [] };
    const rawBills = billsData?.results || [];

    // 4. Fetch Transactions for each account
    const accountsWithTransactions = await Promise.all(
      rawAccounts.map(async (acc: any) => {
        try {
          const txRes = await fetch(
            `https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=100`,
            {
              headers: {
                'Accept': 'application/json',
                'X-API-KEY': apiKey,
              },
            }
          );
          const txData = txRes.ok ? await txRes.json() : { results: [] };
          return {
            ...acc,
            rawTransactions: txData?.results || [],
          };
        } catch {
          return { ...acc, rawTransactions: [] };
        }
      })
    );

    // Normalize institution metadata
    const institutionName = item?.connector?.name || 'Instituição Bancária';
    const institutionId = String(item?.connector?.id || '0');
    const institutionLogo = item?.connector?.imageUrl || null;

    // Map Normalized Bank Accounts (Checking, Savings, Investment)
    const normalizedAccounts = accountsWithTransactions
      .filter((acc: any) => acc.type !== 'CREDIT' && acc.subtype !== 'CREDIT_CARD')
      .map((acc: any) => {
        const mappedType =
          acc.type === 'SAVINGS' || acc.subtype === 'SAVINGS_ACCOUNT'
            ? 'SAVINGS'
            : acc.type === 'INVESTMENT'
            ? 'INVESTMENT'
            : 'CHECKING';

        const rawBalance = typeof acc.balance === 'number' ? acc.balance : parseFloat(acc.balance || '0');

        const transactions = (acc.rawTransactions || []).map((tx: any) => {
          const amountNum = Math.abs(typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0'));
          const isCredit = tx.type === 'CREDIT' || (typeof tx.amount === 'number' && tx.amount > 0 && tx.type !== 'DEBIT');
          const txDate = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];
          const desc = tx.description || tx.descriptionRaw || 'Movimentação Bancária';
          const isPix =
            tx.paymentData?.paymentMethod?.toUpperCase() === 'PIX' ||
            desc.toLowerCase().includes('pix') ||
            desc.toLowerCase().includes('transf. pix');

          return {
            id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            providerTransactionId: tx.id || `ptx_${Date.now()}`,
            description: desc,
            amount: amountNum,
            transactionType: isCredit ? 'CREDIT' : 'DEBIT',
            category: typeof tx.category === 'string' ? tx.category : (tx.category?.name || 'Outros'),
            transactionDate: txDate,
            paymentMethod: isPix ? 'PIX' : (isCredit ? 'TRANSFER' : 'DEBIT_CARD'),
            status: tx.status === 'PENDING' ? 'PENDING' : 'POSTED',
          };
        });

        return {
          providerAccountId: String(acc.id),
          institutionName,
          accountName: acc.name || acc.marketingName || (mappedType === 'SAVINGS' ? `Poupança ${institutionName}` : `Conta Corrente ${institutionName}`),
          accountType: mappedType,
          accountNumberMasked: acc.number ? `••• ${acc.number.slice(-4)}` : `••• ${String(acc.id).slice(-4)}`,
          balance: rawBalance,
          currency: acc.currencyCode || 'BRL',
          transactions,
        };
      });

    // Map Normalized Credit Cards & Bills
    const creditAccounts = accountsWithTransactions.filter(
      (acc: any) => acc.type === 'CREDIT' || acc.creditData || acc.subtype === 'CREDIT_CARD'
    );

    const normalizedCards = creditAccounts.map((acc: any) => {
      const creditLimit = acc.creditData?.creditLimit || 5000.0;
      const availableLimit = acc.creditData?.availableCreditLimit || (creditLimit - Math.abs(acc.balance || 0));
      const currentBalance = Math.abs(typeof acc.balance === 'number' ? acc.balance : parseFloat(acc.balance || '0'));

      const bills = rawBills.map((b: any) => ({
        providerBillId: String(b.id),
        dueDate: b.dueDate ? b.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
        totalAmount: typeof b.totalAmount === 'number' ? b.totalAmount : (b.balance || currentBalance),
        paidAmount: typeof b.paidAmount === 'number' ? b.paidAmount : 0,
        status: b.status === 'PAID' ? 'PAID' : 'OPEN',
      }));

      // If no bills endpoint records, create default invoice from current balance
      if (bills.length === 0 && currentBalance > 0) {
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 15);
        bills.push({
          providerBillId: `bill_gen_${acc.id}`,
          dueDate: nextDueDate.toISOString().split('T')[0],
          totalAmount: currentBalance,
          paidAmount: 0,
          status: 'OPEN',
        });
      }

      return {
        providerCardId: String(acc.id),
        institutionName,
        cardName: acc.name || `Cartão ${institutionName}`,
        lastFourDigits: acc.number ? acc.number.slice(-4) : String(acc.id).slice(-4),
        creditLimit,
        availableLimit,
        bills,
      };
    });

    console.log(`[Pluggy Backend Sync] Item ${itemId} processado: ${normalizedAccounts.length} contas, ${normalizedCards.length} cartões.`);

    return {
      success: true,
      data: {
        connection: {
          providerItemId: String(itemId),
          provider: 'pluggy',
          institutionId,
          institutionName,
          institutionLogo,
          status: item?.status || 'UPDATED',
          consentStatus: 'ACTIVE',
          lastSyncAt: new Date().toISOString(),
        },
        accounts: normalizedAccounts,
        cards: normalizedCards,
      },
    };
  } catch (err: any) {
    console.error('[Pluggy Backend Sync] Erro ao sincronizar dados da Pluggy:', err?.message || err);
    return {
      success: false,
      error: `Erro ao consultar dados da Pluggy: ${err?.message || 'Falha de comunicação'}`,
      status: 500,
    };
  }
}

// -------------------------------------------------------------
// SUPABASE BACKEND SYNC HELPER
// -------------------------------------------------------------
export function getServerSupabaseClient(): SupabaseClient | null {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!rawUrl || !rawKey) {
    return null;
  }

  let normalizedUrl = rawUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsed = new URL(normalizedUrl);
    return createClient(parsed.origin, rawKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('[Server Supabase] Falha ao criar cliente Supabase no backend:', err);
    return null;
  }
}

/**
 * Sincroniza dados normalizados da Pluggy diretamente nas tabelas do Supabase
 * do usuário proprietário do itemId (bank_connections, bank_accounts, accounts, bank_transactions, transactions, credit_cards)
 */
export async function syncPluggyDataToSupabase(payload: any): Promise<{
  success: boolean;
  userId?: string;
  connectionId?: string;
  error?: string;
  status?: string;
}> {
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    console.log('[Supabase Server Sync] Supabase não configurado ou indisponível no servidor.');
    return { success: false, error: 'Supabase client unavailable' };
  }

  const itemId = payload?.connection?.providerItemId;
  if (!itemId) {
    return { success: false, error: 'No providerItemId found in payload' };
  }

  try {
    // 1. Encontrar o vínculo existente pelo provider_item_id
    const { data: existingConn, error: connErr } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('provider_item_id', String(itemId))
      .maybeSingle();

    if (connErr) {
      console.warn('[Supabase Server Sync] Erro ao consultar bank_connections:', connErr.message);
    }

    if (!existingConn) {
      console.log(`[Supabase Server Sync] Conexão com itemId ${itemId} ainda não possui vínculo de usuário registrado no Supabase.`);
      return { success: true, status: 'NO_USER_MAPPED_YET' };
    }

    const userId = existingConn.user_id;
    const connectionId = existingConn.id;
    const nowIso = new Date().toISOString();

    // 2. Atualizar status e timestamp em bank_connections
    await supabase
      .from('bank_connections')
      .update({
        status: payload.connection.status || 'UPDATED',
        consent_status: payload.connection.consentStatus || 'ACTIVE',
        last_sync_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', connectionId);

    // 3. Atualizar/Inserir contas bancárias
    if (payload.accounts && Array.isArray(payload.accounts)) {
      for (const acc of payload.accounts) {
        const mappedType =
          acc.accountType === 'SAVINGS'
            ? 'savings'
            : acc.accountType === 'INVESTMENT'
            ? 'investment'
            : 'checking';

        const { data: existingBankAcc } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('provider_account_id', String(acc.providerAccountId))
          .maybeSingle();

        const accId = existingBankAcc?.id || `acc_p_${String(acc.providerAccountId).slice(-8)}_${Date.now()}`;

        // Upsert em bank_accounts
        await supabase.from('bank_accounts').upsert({
          id: accId,
          user_id: userId,
          bank_connection_id: connectionId,
          provider_account_id: String(acc.providerAccountId),
          institution_name: acc.institutionName,
          account_name: acc.accountName,
          account_type: acc.accountType,
          account_number_masked: acc.accountNumberMasked,
          balance: Number(acc.balance || 0),
          currency: acc.currency || 'BRL',
          updated_at: nowIso,
        });

        // Upsert em accounts (visão geral do dashboard)
        await supabase.from('accounts').upsert({
          id: accId,
          user_id: userId,
          name: acc.accountName,
          bank: acc.institutionName,
          type: mappedType,
          balance: Number(acc.balance || 0),
          updated_at: nowIso,
        });

        // 4. Inserir/Atualizar transações da conta
        if (acc.transactions && Array.isArray(acc.transactions)) {
          for (const tx of acc.transactions) {
            const txType = tx.transactionType === 'CREDIT' ? 'income' : 'expense';
            const provTxId = String(tx.providerTransactionId || tx.id);

            const { data: existingTx } = await supabase
              .from('bank_transactions')
              .select('id')
              .eq('user_id', userId)
              .eq('provider_transaction_id', provTxId)
              .maybeSingle();

            const txId = existingTx?.id || `tx_p_${provTxId.slice(-10)}_${Date.now()}`;

            await supabase.from('bank_transactions').upsert({
              id: txId,
              user_id: userId,
              bank_account_id: accId,
              provider_transaction_id: provTxId,
              description: tx.description,
              amount: Number(tx.amount || 0),
              transaction_type: tx.transactionType,
              category: tx.category,
              transaction_date: tx.transactionDate,
              status: tx.status || 'POSTED',
              updated_at: nowIso,
            });

            await supabase.from('transactions').upsert({
              id: txId,
              user_id: userId,
              type: txType,
              description: tx.description,
              amount: Number(tx.amount || 0),
              category: tx.category,
              date: tx.transactionDate,
              payment_method: tx.paymentMethod === 'PIX' ? 'pix' : 'transfer',
              account_id: accId,
              recurrence: 'none',
              is_paid: true,
              updated_at: nowIso,
            });
          }
        }
      }
    }

    // 5. Atualizar/Inserir cartões de crédito
    if (payload.cards && Array.isArray(payload.cards)) {
      for (const card of payload.cards) {
        const { data: existingCard } = await supabase
          .from('credit_cards')
          .select('id')
          .eq('user_id', userId)
          .eq('name', card.cardName)
          .maybeSingle();

        const cardId = existingCard?.id || `card_p_${Date.now()}`;

        await supabase.from('credit_cards').upsert({
          id: cardId,
          user_id: userId,
          name: card.cardName,
          bank: card.institutionName,
          total_limit: Number(card.creditLimit || 0),
          closing_day: 20,
          due_day: 28,
          color: card.institutionName?.toLowerCase().includes('nubank') ? '#820AD1' : '#10B981',
          last_digits: card.lastFourDigits,
          brand: 'mastercard',
          updated_at: nowIso,
        });
      }
    }

    console.log(`[Supabase Server Sync] Dados do Item ${itemId} sincronizados com sucesso no Supabase para o usuário ${userId}.`);
    return { success: true, userId, connectionId };
  } catch (err: any) {
    console.error('[Supabase Server Sync] Erro durante sincronização no Supabase:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

// -------------------------------------------------------------
// PLUGGY WEBHOOKS MANAGEMENT & EVENT PROCESSING
// -------------------------------------------------------------

export interface WebhookLogEntry {
  id: string;
  event: string;
  itemId?: string;
  timestamp: string;
  status: 'PROCESSED' | 'SKIPPED_DUPLICATE' | 'ERROR' | 'NO_ITEM';
  message?: string;
}

// Idempotência em memória (armazena últimos IDs processados por até 30 minutos)
const processedEventIds = new Map<string, number>();
const webhookEventLogs: WebhookLogEntry[] = [];

function cleanOldProcessedEvents() {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  for (const [id, time] of processedEventIds.entries()) {
    if (time < thirtyMinutesAgo) {
      processedEventIds.delete(id);
    }
  }
  if (webhookEventLogs.length > 100) {
    webhookEventLogs.splice(0, webhookEventLogs.length - 100);
  }
}

export function getRecentWebhookLogs(): WebhookLogEntry[] {
  return [...webhookEventLogs].reverse();
}

/**
 * Registra o Webhook oficial na API da Pluggy
 * POST https://api.pluggy.ai/webhooks
 * Body: { event: "all", url: "https://vanessa-ns.vercel.app/api/pluggy/webhook" }
 */
export async function registerPluggyWebhook(
  webhookUrl?: string,
  event: string = 'all'
): Promise<{
  success: boolean;
  webhook?: any;
  error?: string;
  status?: number;
}> {
  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: authResult.error || 'Credenciais Pluggy não configuradas.',
      status: 401,
    };
  }

  const targetUrl = webhookUrl || getDefaultWebhookUrl();

  try {
    console.log(`[Pluggy Webhook Manager] Registrando Webhook na Pluggy: ${targetUrl} (Evento: ${event})...`);

    const res = await fetch('https://api.pluggy.ai/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        url: targetUrl,
        event: event,
      }),
    });

    if (!res.ok) {
      let errDetail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errDetail = errJson?.message || errJson?.codeDescription || JSON.stringify(errJson);
      } catch {}
      console.warn(`[Pluggy Webhook Manager] Falha ao registrar webhook (${res.status}):`, errDetail);
      return {
        success: false,
        error: `Falha ao registrar webhook na Pluggy: ${errDetail}`,
        status: res.status,
      };
    }

    const data = await res.json();
    console.log(`[Pluggy Webhook Manager] Webhook registrado com sucesso na Pluggy! ID: ${data?.id || 'OK'}`);
    return {
      success: true,
      webhook: data,
    };
  } catch (err: any) {
    console.error('[Pluggy Webhook Manager] Erro ao registrar webhook:', err?.message || err);
    return {
      success: false,
      error: `Erro ao conectar com api.pluggy.ai/webhooks: ${err?.message || 'Falha de comunicação'}`,
      status: 500,
    };
  }
}

/**
 * Consulta lista de webhooks cadastrados na Pluggy
 * GET https://api.pluggy.ai/webhooks
 */
export async function listPluggyWebhooks(): Promise<{
  success: boolean;
  webhooks?: any[];
  error?: string;
  status?: number;
}> {
  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;
  if (!apiKey) {
    return {
      success: false,
      error: authResult.error || 'Credenciais Pluggy não configuradas.',
      status: 401,
    };
  }

  try {
    const res = await fetch('https://api.pluggy.ai/webhooks', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    if (!res.ok) {
      let errDetail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errDetail = errJson?.message || errJson?.codeDescription || JSON.stringify(errJson);
      } catch {}
      return {
        success: false,
        error: `Falha ao consultar webhooks: ${errDetail}`,
        status: res.status,
      };
    }

    const data = await res.json();
    const results = data?.results || (Array.isArray(data) ? data : []);
    return {
      success: true,
      webhooks: results,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha ao consultar webhooks na Pluggy',
      status: 500,
    };
  }
}

/**
 * Deleta um webhook na Pluggy
 * DELETE https://api.pluggy.ai/webhooks/:id
 */
export async function deletePluggyWebhook(webhookId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Credenciais Pluggy não configuradas.' };
  }

  try {
    const res = await fetch(`https://api.pluggy.ai/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Deleta ou revoga um Item na Pluggy
 * DELETE https://api.pluggy.ai/items/:id
 */
export async function deletePluggyItem(itemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!itemId || itemId.startsWith('sandbox_')) {
    return { success: true };
  }

  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Credenciais Pluggy não configuradas.' };
  }

  try {
    const res = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Processador oficial de eventos de Webhook recebidos da Pluggy
 * Trata com isolamento total de erros:
 * - connector/status_updated
 * - item/created, item/updated, item/error, item/deleted, item/waiting_user_input, item/login_error
 * - transactions/created, transactions/updated, transactions/deleted
 * - all
 */
export async function processPluggyWebhookEvent(rawPayload: any): Promise<{
  success: boolean;
  eventId?: string;
  event?: string;
  itemId?: string;
  message: string;
  duplicate?: boolean;
}> {
  try {
    cleanOldProcessedEvents();
  } catch {}

  let eventPayload: any = {};
  if (typeof rawPayload === 'string') {
    try {
      eventPayload = JSON.parse(rawPayload);
    } catch {
      eventPayload = {};
    }
  } else if (rawPayload && typeof rawPayload === 'object') {
    eventPayload = rawPayload;
  }

  const eventId = String(
    eventPayload.id ||
    eventPayload.eventId ||
    `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const eventType = String(eventPayload.event || eventPayload.type || 'unknown').trim();

  // Safely extract itemId (do NOT confuse connectorId for connector events)
  let itemId = '';
  if (eventPayload.itemId) {
    itemId = String(eventPayload.itemId);
  } else if (eventPayload.data?.itemId) {
    itemId = String(eventPayload.data.itemId);
  } else if (!eventType.startsWith('connector/') && eventPayload.data?.id && typeof eventPayload.data.id === 'string') {
    itemId = String(eventPayload.data.id);
  }

  // 1. Verificação de Idempotência
  if (processedEventIds.has(eventId)) {
    console.log(`[Pluggy Webhook Handler] Evento ${eventId} (${eventType}) já foi processado anteriormente. Ignorando duplicata.`);
    const log: WebhookLogEntry = {
      id: eventId,
      event: eventType,
      itemId: itemId || undefined,
      timestamp: new Date().toISOString(),
      status: 'SKIPPED_DUPLICATE',
      message: 'Evento duplicado ignorado por idempotência.',
    };
    webhookEventLogs.push(log);
    return {
      success: true,
      eventId,
      event: eventType,
      itemId: itemId || undefined,
      message: 'Evento duplicado ignorado.',
      duplicate: true,
    };
  }

  try {
    processedEventIds.set(eventId, Date.now());
  } catch {}

  console.log(`[Pluggy Webhook Handler] Processando evento: ${eventType} | itemId: ${itemId || 'N/A'} | eventId: ${eventId}`);

  try {
    // 2. Tratar eventos específicos da Pluggy
    switch (eventType) {
      case 'connector/status_updated': {
        const connectorId = eventPayload.data?.id || eventPayload.connectorId;
        const connectorStatus = eventPayload.data?.status || 'UPDATED';
        console.log(`[Pluggy Webhook Handler] Status do Conector ${connectorId} atualizado: ${connectorStatus}`);

        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: `Conector ${connectorId || 'N/A'} status atualizado: ${connectorStatus}`,
        };
        webhookEventLogs.push(log);
        break;
      }

      case 'item/created':
      case 'item/updated':
      case 'transactions/created':
      case 'transactions/updated': {
        if (!itemId) {
          const log: WebhookLogEntry = {
            id: eventId,
            event: eventType,
            timestamp: new Date().toISOString(),
            status: 'NO_ITEM',
            message: 'Evento recebido sem itemId válido.',
          };
          webhookEventLogs.push(log);
          return { success: true, eventId, event: eventType, message: 'Evento recebido sem itemId.' };
        }

        // Buscar dados atualizados na Pluggy
        try {
          const realResult = await fetchPluggyItemData(itemId);
          if (realResult.success && realResult.data) {
            // Sincronizar com Supabase se houver usuário vinculado
            await syncPluggyDataToSupabase(realResult.data);
          }
        } catch (fetchErr: any) {
          console.warn(`[Pluggy Webhook Handler] Aviso ao sincronizar item ${itemId}:`, fetchErr?.message);
        }

        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: `Item ${itemId} sincronizado com sucesso (${eventType}).`,
        };
        webhookEventLogs.push(log);
        break;
      }

      case 'item/waiting_user_input': {
        console.log(`[Pluggy Webhook Handler] Item ${itemId} aguardando entrada do usuário (MFA/OTP).`);
        try {
          const supabase = getServerSupabaseClient();
          if (supabase && itemId) {
            await supabase
              .from('bank_connections')
              .update({
                status: 'WAITING_USER_INPUT',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_item_id', itemId);
          }
        } catch (dbErr) {
          console.warn('[Pluggy Webhook Handler] Erro ao atualizar status WAITING_USER_INPUT:', dbErr);
        }
        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: `Item ${itemId} aguardando validação/MFA do usuário.`,
        };
        webhookEventLogs.push(log);
        break;
      }

      case 'item/login_error':
      case 'item/error': {
        console.warn(`[Pluggy Webhook Handler] Notificação de erro no Item ${itemId}:`, eventPayload.error || eventPayload.data);
        try {
          const supabase = getServerSupabaseClient();
          if (supabase && itemId) {
            await supabase
              .from('bank_connections')
              .update({
                status: 'LOGIN_ERROR',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_item_id', itemId);
          }
        } catch (dbErr) {
          console.warn('[Pluggy Webhook Handler] Erro ao atualizar status LOGIN_ERROR:', dbErr);
        }
        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId,
          timestamp: new Date().toISOString(),
          status: 'ERROR',
          message: `Erro reportado no Item: ${JSON.stringify(eventPayload.error || eventPayload.data || {})}`,
        };
        webhookEventLogs.push(log);
        break;
      }

      case 'item/deleted': {
        console.log(`[Pluggy Webhook Handler] Notificação de exclusão do Item ${itemId}`);
        try {
          const supabase = getServerSupabaseClient();
          if (supabase && itemId) {
            await supabase
              .from('bank_connections')
              .update({
                status: 'DISCONNECTED',
                consent_status: 'REVOKED',
                updated_at: new Date().toISOString(),
              })
              .eq('provider_item_id', itemId);
          }
        } catch (dbErr) {
          console.warn('[Pluggy Webhook Handler] Erro ao atualizar status DISCONNECTED:', dbErr);
        }
        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: `Item ${itemId} desconectado.`,
        };
        webhookEventLogs.push(log);
        break;
      }

      case 'transactions/deleted': {
        console.log(`[Pluggy Webhook Handler] Transações deletadas no Item ${itemId}`);
        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: 'Notificação de transações deletadas recebida.',
        };
        webhookEventLogs.push(log);
        break;
      }

      default: {
        console.log(`[Pluggy Webhook Handler] Evento recebido: ${eventType}`);
        const log: WebhookLogEntry = {
          id: eventId,
          event: eventType,
          itemId: itemId || undefined,
          timestamp: new Date().toISOString(),
          status: 'PROCESSED',
          message: `Evento ${eventType} registrado e processado.`,
        };
        webhookEventLogs.push(log);
        break;
      }
    }

    return {
      success: true,
      eventId,
      event: eventType,
      itemId: itemId || undefined,
      message: `Evento ${eventType} processado com sucesso.`,
    };
  } catch (err: any) {
    console.error(`[Pluggy Webhook Handler] Erro capturado ao processar evento ${eventType}:`, err?.message || err);
    const log: WebhookLogEntry = {
      id: eventId,
      event: eventType,
      itemId: itemId || undefined,
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: `Erro: ${err?.message || 'Falha desconhecida'}`,
    };
    webhookEventLogs.push(log);
    return {
      success: true, // Return success=true to prevent webhook HTTP 500 error
      eventId,
      event: eventType,
      itemId: itemId || undefined,
      message: `Evento ${eventType} registrado com observação: ${err?.message}`,
    };
  }
}

export async function getPluggyDiagnostics() {
  const { clientId, clientSecret } = getSanitizedCredentials();
  const isConfigured = Boolean(clientId && clientSecret);
  const maskedId = clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null;
  const maskedSecret = clientSecret ? `${clientSecret.slice(0, 4)}...${clientSecret.slice(-4)}` : null;

  let authStatus: 'SUCCESS' | 'UNAUTHORIZED' | 'ERROR' | 'NOT_CONFIGURED' = 'NOT_CONFIGURED';
  let authMessage = '';
  let authStatusCode = 0;
  let connectTokenGenerated = false;
  let connectTokenPreview = '';

  if (isConfigured) {
    try {
      const res = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      authStatusCode = res.status;
      const data = (await res.json()) as any;

      if (res.ok && data?.apiKey) {
        authStatus = 'SUCCESS';
        authMessage = 'Autenticação Pluggy OK (API Key gerada com sucesso)';

        // Test connect_token generation
        try {
          const tokRes = await fetch('https://api.pluggy.ai/connect_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': data.apiKey,
            },
            body: JSON.stringify({
              options: {
                oauthRedirectUri: 'https://vaanessa-ns.vercel.app',
                products: ['ACCOUNTS', 'TRANSACTIONS', 'CREDIT_CARDS'],
              },
            }),
          });
          if (tokRes.ok) {
            const tokData = (await tokRes.json()) as any;
            if (tokData?.accessToken) {
              connectTokenGenerated = true;
              connectTokenPreview = `${tokData.accessToken.slice(0, 12)}...`;
            }
          }
        } catch (tokErr) {
          console.warn('Connect token check error:', tokErr);
        }
      } else {
        authStatus = authStatusCode === 401 ? 'UNAUTHORIZED' : 'ERROR';
        authMessage = data?.message || data?.codeDescription || `Erro HTTP ${res.status}`;
      }
    } catch (e: any) {
      authStatus = 'ERROR';
      authMessage = e.message || 'Falha ao conectar com api.pluggy.ai';
    }
  }

  let registeredWebhooks: any[] = [];
  if (authStatus === 'SUCCESS') {
    try {
      const whResult = await listPluggyWebhooks();
      if (whResult.success && whResult.webhooks) {
        registeredWebhooks = whResult.webhooks;
      }
    } catch {}
  }

  const recentLogs = getRecentWebhookLogs();

  return {
    isConfigured,
    maskedId,
    maskedSecret,
    authStatus,
    authStatusCode,
    authMessage,
    connectTokenGenerated,
    connectTokenPreview,
    sandboxReady: true,
    mode: authStatus === 'SUCCESS' ? 'pluggy-live' : 'simulation-sandbox',
    supportedConnectorsCount: SUPPORTED_INSTITUTIONS.length,
    webhookEndpoint: 'https://vaanessa-ns.vercel.app/api/pluggy/webhook',
    registeredWebhooksCount: registeredWebhooks.length,
    registeredWebhooks,
    recentWebhookEventsCount: recentLogs.length,
    recentWebhookEvents: recentLogs.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}

// Generate Realistic Sandbox Bank Payload for Open Finance simulation
export function generateSandboxBankPayload(institutionId: string | number, customName?: string) {
  const institution =
    SUPPORTED_INSTITUTIONS.find((i) => String(i.id) === String(institutionId)) ||
    SUPPORTED_INSTITUTIONS[0];

  const instName = customName || institution.name;
  const itemId = `sandbox_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const checkingAccId = `acc_chk_${Date.now()}_1`;
  const savingsAccId = `acc_svg_${Date.now()}_2`;
  const cardId = `card_${Date.now()}_3`;

  // Realistic balances
  const checkingBal = Math.floor(Math.random() * 3500) + 1200 + Math.random() * 0.99;
  const savingsBal = Math.floor(Math.random() * 8000) + 2500;
  const cardLimit = 7500.0;
  const availableLimit = 4820.0;
  const currentInvoiceAmount = cardLimit - availableLimit;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const transactions = [
    {
      id: `tx_s_${Date.now()}_1`,
      providerTransactionId: `ptx_${Date.now()}_1`,
      description: 'Transferência Recebida PIX - Cliente',
      amount: 450.0,
      transactionType: 'CREDIT',
      category: 'Salário / Renda',
      transactionDate: todayStr,
      status: 'POSTED',
    },
    {
      id: `tx_s_${Date.now()}_2`,
      providerTransactionId: `ptx_${Date.now()}_2`,
      description: 'Supermercado Pão de Açúcar',
      amount: 184.5,
      transactionType: 'DEBIT',
      category: 'Alimentação',
      transactionDate: getPastDateStr(1),
      status: 'POSTED',
    },
    {
      id: `tx_s_${Date.now()}_3`,
      providerTransactionId: `ptx_${Date.now()}_3`,
      description: 'Posto Shell Combustível',
      amount: 150.0,
      transactionType: 'DEBIT',
      category: 'Transporte',
      transactionDate: getPastDateStr(2),
      status: 'POSTED',
    },
    {
      id: `tx_s_${Date.now()}_4`,
      providerTransactionId: `ptx_${Date.now()}_4`,
      description: 'Farmácia Drogasil',
      amount: 62.9,
      transactionType: 'DEBIT',
      category: 'Saúde',
      transactionDate: getPastDateStr(4),
      status: 'POSTED',
    },
    {
      id: `tx_s_${Date.now()}_5`,
      providerTransactionId: `ptx_${Date.now()}_5`,
      description: 'Restaurante Sabor & Arte',
      amount: 89.0,
      transactionType: 'DEBIT',
      category: 'Alimentação',
      transactionDate: getPastDateStr(5),
      status: 'POSTED',
    },
    {
      id: `tx_s_${Date.now()}_6`,
      providerTransactionId: `ptx_${Date.now()}_6`,
      description: 'Assinatura Streaming Netflix',
      amount: 55.9,
      transactionType: 'DEBIT',
      category: 'Assinaturas',
      transactionDate: getPastDateStr(7),
      status: 'POSTED',
    },
  ];

  return {
    connection: {
      providerItemId: itemId,
      provider: 'pluggy',
      institutionId: String(institution.id),
      institutionName: instName,
      status: 'UPDATED',
      consentStatus: 'ACTIVE',
      lastSyncAt: new Date().toISOString(),
    },
    accounts: [
      {
        providerAccountId: checkingAccId,
        institutionName: instName,
        accountName: `Conta Corrente ${instName}`,
        accountType: 'CHECKING',
        accountNumberMasked: `••• ${Math.floor(Math.random() * 8999 + 1000)}-${Math.floor(Math.random() * 9)}`,
        balance: parseFloat(checkingBal.toFixed(2)),
        currency: 'BRL',
        transactions,
      },
      {
        providerAccountId: savingsAccId,
        institutionName: instName,
        accountName: `Reserva / Poupança ${instName}`,
        accountType: 'SAVINGS',
        accountNumberMasked: `••• ${Math.floor(Math.random() * 8999 + 1000)}-${Math.floor(Math.random() * 9)}`,
        balance: parseFloat(savingsBal.toFixed(2)),
        currency: 'BRL',
        transactions: [],
      },
    ],
    cards: [
      {
        providerCardId: cardId,
        institutionName: instName,
        cardName: `Cartão ${instName} Mastercard Black`,
        lastFourDigits: String(Math.floor(Math.random() * 8999 + 1000)),
        creditLimit: cardLimit,
        availableLimit: availableLimit,
        bills: [
          {
            providerBillId: `bill_${Date.now()}_1`,
            dueDate: getPastDateStr(-10),
            totalAmount: currentInvoiceAmount,
            paidAmount: 0.0,
            status: 'OPEN',
          },
        ],
      },
    ],
  };
}
