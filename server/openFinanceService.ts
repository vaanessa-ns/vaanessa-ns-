import dotenv from 'dotenv';

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
  const rawId = process.env.PLUGGY_CLIENT_ID || '';
  const rawSecret = process.env.PLUGGY_CLIENT_SECRET || '';
  const clientId = rawId.replace(/^["']|["']$/g, '').trim();
  const clientSecret = rawSecret.replace(/^["']|["']$/g, '').trim();
  return { clientId, clientSecret };
}

/**
 * Autentica com a Pluggy usando PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET (apenas no servidor)
 * POST https://api.pluggy.ai/auth
 */
export async function getPluggyApiKey(): Promise<string | null> {
  const { clientId, clientSecret } = getSanitizedCredentials();

  if (!clientId || !clientSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedPluggyApiKey && cachedPluggyApiKey.expiresAt > now + 60000) {
    return cachedPluggyApiKey.key;
  }

  try {
    const res = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        clientSecret,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.warn(`Pluggy /auth failed with status ${res.status}:`, errorBody);
      return null;
    }

    const data = (await res.json()) as PluggyAuthResponse;
    if (data?.apiKey) {
      cachedPluggyApiKey = {
        key: data.apiKey,
        expiresAt: now + 100 * 60 * 1000, // ~100 minutes (Pluggy token duration is typically 2 hours)
      };
      return data.apiKey;
    }
  } catch (err) {
    console.error('Error authenticating with Pluggy:', err);
  }

  return null;
}

export function getSupportedInstitutions(): BankConnector[] {
  return SUPPORTED_INSTITUTIONS;
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
}): Promise<{
  accessToken: string;
  connectToken: string;
  provider: 'pluggy' | 'sandbox';
  sandbox: boolean;
  error?: string;
}> {
  const apiKey = await getPluggyApiKey();

  if (!apiKey) {
    // Generate fallback session token if credentials are not yet set
    const sandboxToken = `sandbox_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      accessToken: sandboxToken,
      connectToken: sandboxToken,
      provider: 'sandbox',
      sandbox: true,
      error: 'PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configurados no servidor.',
    };
  }

  try {
    const redirectUri =
      options?.oauthRedirectUri ||
      process.env.PLUGGY_OAUTH_REDIRECT_URI ||
      'https://vaanessa-ns.vercel.app';

    const payload: any = {
      options: {
        clientUserId: options?.clientUserId || undefined,
        oauthRedirectUri: redirectUri,
        products: ['ACCOUNTS', 'TRANSACTIONS', 'CREDIT_CARDS', 'PAYMENT_DATA', 'INVESTMENTS'],
      },
    };

    if (options?.itemId) {
      payload.itemId = options.itemId;
    }

    const res = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as PluggyConnectTokenResponse;
      const token = data.accessToken;
      return {
        accessToken: token,
        connectToken: token,
        provider: 'pluggy',
        sandbox: false,
      };
    } else {
      const errorText = await res.text();
      console.warn(`Pluggy /connect_token failed (${res.status}):`, errorText);
      return {
        accessToken: '',
        connectToken: '',
        provider: 'pluggy',
        sandbox: false,
        error: `Erro ao gerar token na Pluggy (${res.status}): ${errorText}`,
      };
    }
  } catch (e: any) {
    console.error('Error fetching Pluggy connect token:', e);
    return {
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
      error: e.message || 'Falha de comunicação com api.pluggy.ai',
    };
  }
}

/**
 * Consulta dados reais da Pluggy pelo itemId (usando X-API-KEY do servidor)
 * Normaliza contas, transações, saldos e cartões no formato esperado pelo Vfinance
 */
export async function fetchPluggyItemData(itemId: string) {
  const apiKey = await getPluggyApiKey();
  if (!apiKey) return null;

  try {
    // 1. Fetch Item details
    const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const item = itemRes.ok ? await itemRes.json() : null;

    // 2. Fetch Accounts
    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const accountsData = accountsRes.ok ? await accountsRes.json() : { results: [] };
    const rawAccounts = accountsData.results || [];

    // 3. Fetch Bills (Invoices)
    const billsRes = await fetch(`https://api.pluggy.ai/bills?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const billsData = billsRes.ok ? await billsRes.json() : { results: [] };
    const rawBills = billsData.results || [];

    // 4. Fetch Transactions for each account
    const accountsWithTransactions = await Promise.all(
      rawAccounts.map(async (acc: any) => {
        try {
          const txRes = await fetch(
            `https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=100`,
            { headers: { 'X-API-KEY': apiKey } }
          );
          const txData = txRes.ok ? await txRes.json() : { results: [] };
          return {
            ...acc,
            rawTransactions: txData.results || [],
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

    // Map Normalized Accounts
    const normalizedAccounts = accountsWithTransactions
      .filter((acc: any) => acc.type !== 'CREDIT')
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

          return {
            id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            providerTransactionId: tx.id || `ptx_${Date.now()}`,
            description: tx.description || tx.descriptionRaw || 'Movimentação Bancária',
            amount: amountNum,
            transactionType: isCredit ? 'CREDIT' : 'DEBIT',
            category: typeof tx.category === 'string' ? tx.category : (tx.category?.name || 'Outros'),
            transactionDate: txDate,
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

    return {
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
    };
  } catch (err) {
    console.error('Error fetching Pluggy data:', err);
    return null;
  }
}

export async function deletePluggyItem(itemId: string): Promise<boolean> {
  const apiKey = await getPluggyApiKey();
  if (!apiKey) return true;

  try {
    const res = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey },
    });
    return res.ok;
  } catch (e) {
    console.error('Error deleting Pluggy item:', e);
    return false;
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
