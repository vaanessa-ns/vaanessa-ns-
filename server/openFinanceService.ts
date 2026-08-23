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

const SUPPORTED_INSTITUTIONS: BankConnector[] = [
  {
    id: '0',
    name: 'Nubank',
    primaryColor: '#820AD1',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://nubank.com.br',
  },
  {
    id: '1',
    name: 'Itaú Unibanco',
    primaryColor: '#EC7000',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.itau.com.br',
  },
  {
    id: '2',
    name: 'Bradesco',
    primaryColor: '#CC092F',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://banco.bradesco',
  },
  {
    id: '3',
    name: 'Santander',
    primaryColor: '#EA1D25',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.santander.com.br',
  },
  {
    id: '4',
    name: 'Banco do Brasil',
    primaryColor: '#F8D117',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.bb.com.br',
  },
  {
    id: '5',
    name: 'Caixa Econômica Federal',
    primaryColor: '#005CA9',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.caixa.gov.br',
  },
  {
    id: '6',
    name: 'Banco Inter',
    primaryColor: '#FF7A00',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://inter.co',
  },
  {
    id: '7',
    name: 'C6 Bank',
    primaryColor: '#242424',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.c6bank.com.br',
  },
  {
    id: '8',
    name: 'BTG Pactual',
    primaryColor: '#001E62',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.btgpactual.com',
  },
  {
    id: '9',
    name: 'Sicoob',
    primaryColor: '#003641',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.sicoob.com.br',
  },
  {
    id: '10',
    name: 'Sicredi',
    primaryColor: '#005D37',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://www.sicredi.com.br',
  },
  {
    id: '201',
    name: 'Pluggy Sandbox Test Bank',
    primaryColor: '#10B981',
    type: 'PERSONAL_BANK',
    country: 'BR',
    institutionUrl: 'https://pluggy.ai',
  },
];

let cachedPluggyApiKey: { key: string; expiresAt: number } | null = null;

function getSanitizedCredentials() {
  const rawId = process.env.PLUGGY_CLIENT_ID || '';
  const rawSecret = process.env.PLUGGY_CLIENT_SECRET || '';
  const clientId = rawId.replace(/^["']|["']$/g, '').trim();
  const clientSecret = rawSecret.replace(/^["']|["']$/g, '').trim();
  return { clientId, clientSecret };
}

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
      console.warn(`Pluggy auth failed with status ${res.status}:`, errorBody);
      return null;
    }

    const data = (await res.json()) as PluggyAuthResponse;
    if (data?.apiKey) {
      cachedPluggyApiKey = {
        key: data.apiKey,
        expiresAt: now + 2 * 60 * 60 * 1000, // 2 hours
      };
      return data.apiKey;
    }
  } catch (err) {
    console.error('Error authenticating with Pluggy:', err);
  }

  return null;
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

        // Try connect_token
        try {
          const tokRes = await fetch('https://api.pluggy.ai/connect_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': data.apiKey,
            },
            body: JSON.stringify({
              options: {
                sandbox: true,
                products: ['ACCOUNTS', 'TRANSACTIONS', 'CREDIT_CARDS', 'PAYMENT_DATA'],
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
    mode: authStatus === 'SUCCESS' ? 'pluggy-live-or-sandbox' : 'simulation-sandbox',
    supportedConnectorsCount: SUPPORTED_INSTITUTIONS.length,
    timestamp: new Date().toISOString(),
  };
}

export function getSupportedInstitutions(): BankConnector[] {
  return SUPPORTED_INSTITUTIONS;
}

export async function createPluggyConnectToken(options?: {
  itemId?: string;
  clientUserId?: string;
}): Promise<{ connectToken: string; provider: 'pluggy' | 'sandbox'; sandbox: boolean }> {
  const apiKey = await getPluggyApiKey();

  if (!apiKey) {
    // Generate secure sandbox connect session token
    const sandboxToken = `sandbox_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      connectToken: sandboxToken,
      provider: 'sandbox',
      sandbox: true,
    };
  }

  try {
    const res = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        itemId: options?.itemId,
        clientUserId: options?.clientUserId,
        options: {
          products: ['ACCOUNTS', 'TRANSACTIONS', 'CREDIT_CARDS', 'PAYMENT_DATA'],
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as PluggyConnectTokenResponse;
      return {
        connectToken: data.accessToken,
        provider: 'pluggy',
        sandbox: false,
      };
    } else {
      console.warn('Pluggy connect token creation failed, falling back to sandbox mode');
    }
  } catch (e) {
    console.error('Error fetching Pluggy connect token:', e);
  }

  const sandboxToken = `sandbox_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    connectToken: sandboxToken,
    provider: 'sandbox',
    sandbox: true,
  };
}

export async function fetchPluggyItemData(itemId: string) {
  const apiKey = await getPluggyApiKey();
  if (!apiKey) return null;

  try {
    const [itemRes, accountsRes, billsRes] = await Promise.all([
      fetch(`https://api.pluggy.ai/items/${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      }),
      fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      }),
      fetch(`https://api.pluggy.ai/bills?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      }),
    ]);

    const item = itemRes.ok ? await itemRes.json() : null;
    const accountsData = accountsRes.ok ? await accountsRes.json() : { results: [] };
    const billsData = billsRes.ok ? await billsRes.json() : { results: [] };

    // Fetch transactions for each account
    const accounts = accountsData.results || [];
    const accountsWithTx = await Promise.all(
      accounts.map(async (acc: any) => {
        try {
          const txRes = await fetch(
            `https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=50`,
            { headers: { 'X-API-KEY': apiKey } }
          );
          const txData = txRes.ok ? await txRes.json() : { results: [] };
          return {
            ...acc,
            transactions: txData.results || [],
          };
        } catch {
          return { ...acc, transactions: [] };
        }
      })
    );

    return {
      item,
      accounts: accountsWithTx,
      bills: billsData.results || [],
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

// Generate Realistic Sandbox Bank Payload for Open Finance simulation
export function generateSandboxBankPayload(institutionId: string, customName?: string) {
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
  const currentInvoiceAmount = cardLimit - availableLimit; // ~ 2680.00

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
            dueDate: getPastDateStr(-10), // 10 days in the future
            totalAmount: currentInvoiceAmount,
            paidAmount: 0.0,
            status: 'OPEN',
          },
        ],
      },
    ],
  };
}
