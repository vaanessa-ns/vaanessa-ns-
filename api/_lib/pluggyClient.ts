/**
 * Pluggy Client Helper for Vercel Serverless Functions and Node Express Server
 * 100% self-contained, zero external dependencies, robust exception safety
 */

export interface ApiExecutionLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  statusCode: number;
  isError: boolean;
  step: 'auth' | 'connect_token' | 'config' | 'network' | 'sync' | 'webhook' | 'serverless_exec';
  error?: string;
  details?: string;
  pinpointReason?: string;
  recommendedFix?: string;
  durationMs?: number;
  request?: {
    connectorId?: number;
    clientUserId?: string;
    itemId?: string;
    oauthRedirectUri?: string;
    hasCredentials?: boolean;
    [key: string]: any;
  };
  responsePreview?: string;
  environmentSummary?: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    maskedClientId: string;
    redirectUri: string;
    nodeEnv: string;
  };
}

export interface ConnectTokenDiagnosticReport {
  timestamp: string;
  totalLogsCount: number;
  connectTokenErrorsCount: number;
  last10ConnectTokenErrors: ApiExecutionLog[];
  statusCodesSummary: Record<number, number>;
  primaryFailureCause: string;
  recommendedAction: string;
  systemEnvironment: {
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    maskedClientId: string;
    oauthRedirectUri: string;
    webhookUrl: string;
    nodeEnv: string;
  };
}

export interface PluggyCredentials {
  clientId: string;
  clientSecret: string;
}

// In-memory ring buffer (up to 100 entries)
const MAX_LOGS = 100;
const globalLogsStore: ApiExecutionLog[] = [];

export function derivePinpointReason(
  statusCode: number,
  errorMsg: string = '',
  step: string = '',
  env?: { hasClientId: boolean; hasClientSecret: boolean }
): { pinpointReason: string; recommendedFix: string } {
  if (env && (!env.hasClientId || !env.hasClientSecret)) {
    return {
      pinpointReason: 'Credenciais ausentes no ambiente do servidor (PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não definidos).',
      recommendedFix: 'Acesse o painel da Vercel (Project Settings > Environment Variables) e cadastre PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET para o ambiente Production.',
    };
  }

  if (statusCode === 401 || errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('invalid api key') || errorMsg.toLowerCase().includes('client keys are invalid')) {
    return {
      pinpointReason: 'Autenticação recusada pela Pluggy (HTTP 401 Unauthorized - client keys are invalid). As credenciais cadastradas estão incorretas, expiradas ou pertencem a outro ambiente (Sandbox vs Produção).',
      recommendedFix: 'Verifique no Dashboard da Pluggy (https://dashboard.pluggy.ai) o Client ID e Client Secret exatos da aplicação de Produção e atualize na Vercel.',
    };
  }

  if (statusCode === 403 || errorMsg.includes('403') || errorMsg.toLowerCase().includes('forbidden')) {
    return {
      pinpointReason: 'Acesso negado pela Pluggy (HTTP 403 Forbidden). Sua conta Pluggy pode estar com limites atingidos, bloqueada ou o plano não permite esta operação.',
      recommendedFix: 'Verifique o status do seu plano e permissões no Dashboard da Pluggy.',
    };
  }

  if (statusCode === 400 || errorMsg.includes('400') || errorMsg.toLowerCase().includes('bad request')) {
    return {
      pinpointReason: 'Parâmetros inválidos enviados para /connect_token (HTTP 400 Bad Request). Possível URL de redirect OAuth não permitida ou payload inconsistente.',
      recommendedFix: 'Certifique-se de que a URL do seu domínio (ex: https://vanessa-ns.vercel.app ou https://vaanessa-ns.vercel.app) está cadastrada na lista de Redirect URIs permitidas no Dashboard da Pluggy.',
    };
  }

  if (statusCode === 404 || errorMsg.includes('404')) {
    return {
      pinpointReason: 'Endpoint ou recurso não encontrado na Pluggy (HTTP 404 Not Found).',
      recommendedFix: 'Confirme a URL do serviço da Pluggy (https://api.pluggy.ai) ou o ID do recurso solicitado.',
    };
  }

  if (statusCode >= 500 && statusCode < 600) {
    if (errorMsg.includes('FUNCTION_INVOCATION_FAILED') || errorMsg.includes('server error')) {
      return {
        pinpointReason: 'Falha na execução da função Serverless na Vercel (FUNCTION_INVOCATION_FAILED).',
        recommendedFix: 'Verifique se o build serverless está atualizado sem dependências locais inacessíveis e com Node.js 18+ ou 20+.',
      };
    }
    return {
      pinpointReason: `Instabilidade ou erro interno nos servidores da Pluggy (HTTP ${statusCode}).`,
      recommendedFix: 'Aguarde alguns instantes e tente novamente. Consulte o status da API da Pluggy.',
    };
  }

  if (step === 'network' || errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('enotfound') || errorMsg.toLowerCase().includes('timeout')) {
    return {
      pinpointReason: 'Falha de comunicação de rede ao tentar contatar https://api.pluggy.ai.',
      recommendedFix: 'Verifique a conectividade de saída e resolução DNS da infraestrutura.',
    };
  }

  return {
    pinpointReason: `Erro durante a etapa ${step || 'desconhecida'}: ${errorMsg || 'Falha não especificada'} (Status ${statusCode || 'N/A'}).`,
    recommendedFix: 'Analise o log detalhado para inspecionar a mensagem completa retornada.',
  };
}

export function recordApiLog(params: {
  endpoint: string;
  method?: string;
  statusCode: number;
  step: 'auth' | 'connect_token' | 'config' | 'network' | 'sync' | 'webhook' | 'serverless_exec';
  error?: string;
  details?: string;
  durationMs?: number;
  request?: Record<string, any>;
  responsePreview?: string;
  envSummary?: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    maskedClientId: string;
    redirectUri: string;
    nodeEnv: string;
  };
}): ApiExecutionLog {
  const isError = params.statusCode >= 400 || Boolean(params.error);
  const { pinpointReason, recommendedFix } = derivePinpointReason(
    params.statusCode,
    params.error || params.details || '',
    params.step,
    params.envSummary
  );

  const logEntry: ApiExecutionLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    endpoint: params.endpoint,
    method: (params.method || 'POST').toUpperCase(),
    statusCode: params.statusCode,
    isError,
    step: params.step,
    error: params.error,
    details: params.details,
    pinpointReason,
    recommendedFix,
    durationMs: params.durationMs,
    request: params.request,
    responsePreview: params.responsePreview ? params.responsePreview.slice(0, 500) : undefined,
    environmentSummary: params.envSummary,
  };

  globalLogsStore.unshift(logEntry);
  if (globalLogsStore.length > MAX_LOGS) {
    globalLogsStore.length = MAX_LOGS;
  }

  return logEntry;
}

export function getApiLogs(options?: {
  endpoint?: string;
  errorsOnly?: boolean;
  limit?: number;
}): ApiExecutionLog[] {
  let filtered = [...globalLogsStore];

  if (options?.endpoint) {
    const ep = options.endpoint.toLowerCase();
    filtered = filtered.filter((l) => l.endpoint.toLowerCase().includes(ep));
  }

  if (options?.errorsOnly) {
    filtered = filtered.filter((l) => l.isError);
  }

  const limit = typeof options?.limit === 'number' && options.limit > 0 ? options.limit : 50;
  return filtered.slice(0, limit);
}

export function getConnectTokenErrorLogs(limit: number = 10): ApiExecutionLog[] {
  const targetEndpoints = [
    '/api/pluggy/connect-token',
    '/api/open-finance/connect-token',
    'https://api.pluggy.ai/connect_token',
    'https://api.pluggy.ai/auth',
  ];

  const connectTokenErrors = globalLogsStore.filter((log) => {
    if (!log.isError && log.statusCode < 400) return false;

    const matchesEndpoint = targetEndpoints.some((ep) =>
      log.endpoint.toLowerCase().includes(ep.toLowerCase())
    );
    const matchesStep = log.step === 'connect_token' || log.step === 'auth' || log.step === 'config';

    return matchesEndpoint || matchesStep;
  });

  return connectTokenErrors.slice(0, limit);
}

export function getConnectTokenDiagnosticReport(): ConnectTokenDiagnosticReport {
  const last10Errors = getConnectTokenErrorLogs(10);

  const statusCodesSummary: Record<number, number> = {};
  for (const err of last10Errors) {
    const code = err.statusCode || 0;
    statusCodesSummary[code] = (statusCodesSummary[code] || 0) + 1;
  }

  let primaryFailureCause = 'Nenhum erro recente de connect-token registrado.';
  let recommendedAction = 'O sistema está operando normalmente ou nenhuma requisição falhou recentemente.';

  if (last10Errors.length > 0) {
    const mostRecent = last10Errors[0];
    primaryFailureCause = mostRecent.pinpointReason || mostRecent.error || `Falha com HTTP ${mostRecent.statusCode}`;
    recommendedAction = mostRecent.recommendedFix || 'Consulte os detalhes do log para verificar a resposta da Pluggy.';
  }

  const { clientId, clientSecret } = getSanitizedCredentials();

  return {
    timestamp: new Date().toISOString(),
    totalLogsCount: globalLogsStore.length,
    connectTokenErrorsCount: last10Errors.length,
    last10ConnectTokenErrors: last10Errors,
    statusCodesSummary,
    primaryFailureCause,
    recommendedAction,
    systemEnvironment: {
      clientIdConfigured: Boolean(clientId),
      clientSecretConfigured: Boolean(clientSecret),
      maskedClientId: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : 'Não configurado',
      oauthRedirectUri: getSanitizedRedirectUri(),
      webhookUrl: getDefaultWebhookUrl(),
      nodeEnv: process.env.NODE_ENV || 'production',
    },
  };
}

export function getSanitizedCredentials(): PluggyCredentials {
  const rawId =
    process.env.PLUGGY_CLIENT_ID ||
    process.env.PLUGGY_CLIENTID ||
    process.env.pluggy_client_id ||
    process.env.VITE_PLUGGY_CLIENT_ID ||
    process.env.REACT_APP_PLUGGY_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PLUGGY_CLIENT_ID ||
    '';

  const rawSecret =
    process.env.PLUGGY_CLIENT_SECRET ||
    process.env.PLUGGY_CLIENTSECRET ||
    process.env.pluggy_client_secret ||
    process.env.VITE_PLUGGY_CLIENT_SECRET ||
    process.env.REACT_APP_PLUGGY_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_PLUGGY_CLIENT_SECRET ||
    '';

  const clientId = rawId.replace(/^["'`]|["'`]$/g, '').trim();
  const clientSecret = rawSecret.replace(/^["'`]|["'`]$/g, '').trim();

  return { clientId, clientSecret };
}

export function getSanitizedRedirectUri(override?: string): string {
  const envUri = (
    process.env.PLUGGY_OAUTH_REDIRECT_URI ||
    process.env.PLUGGY_REDIRECT_URI ||
    ''
  ).replace(/^["'`]|["'`]$/g, '').trim();

  if (envUri && envUri.startsWith('http')) return envUri;
  if (override && typeof override === 'string' && override.startsWith('http') && !override.includes('localhost:5173')) {
    return override.replace(/^["'`]|["'`]$/g, '').trim();
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  }
  return 'https://vaanessa-ns.vercel.app';
}

export function getDefaultWebhookUrl(): string {
  const envWh = (process.env.PLUGGY_WEBHOOK_URL || '').replace(/^["'`]|["'`]$/g, '').trim();
  if (envWh && envWh.startsWith('http')) return envWh;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}/api/pluggy/webhook`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}/api/pluggy/webhook`;
  }
  return 'https://vaanessa-ns.vercel.app/api/pluggy/webhook';
}

let cachedPluggyApiKey: { key: string; expiresAt: number } | null = null;

/**
 * Autentica com a API da Pluggy e obtém o X-API-KEY
 */
export async function getPluggyApiKey(): Promise<{ apiKey: string | null; error?: string; status?: number; rawResponse?: any }> {
  const startTime = Date.now();
  const { clientId, clientSecret } = getSanitizedCredentials();
  const envSummary = {
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    maskedClientId: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : 'Não configurado',
    redirectUri: getSanitizedRedirectUri(),
    nodeEnv: process.env.NODE_ENV || 'production',
  };

  if (!clientId || !clientSecret) {
    const errorMsg = 'Variáveis de ambiente PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configuradas no servidor da Vercel. Por favor, cadastre suas credenciais de produção no painel da Vercel (Project Settings > Environment Variables).';
    recordApiLog({
      endpoint: 'https://api.pluggy.ai/auth',
      method: 'POST',
      statusCode: 401,
      step: 'config',
      error: errorMsg,
      durationMs: Date.now() - startTime,
      envSummary,
    });
    return {
      apiKey: null,
      error: errorMsg,
      status: 401,
    };
  }

  const now = Date.now();
  if (cachedPluggyApiKey && cachedPluggyApiKey.expiresAt > now + 60000) {
    return { apiKey: cachedPluggyApiKey.key };
  }

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

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      let rawDetails = '';
      let errorJson: any = null;
      try {
        errorJson = await res.json();
        rawDetails = JSON.stringify(errorJson);
        if (typeof errorJson?.message === 'string') {
          errorMsg = errorJson.message;
        } else if (typeof errorJson?.error === 'string') {
          errorMsg = errorJson.error;
        } else if (typeof errorJson?.error?.message === 'string') {
          errorMsg = errorJson.error.message;
        } else if (typeof errorJson?.codeDescription === 'string') {
          errorMsg = errorJson.codeDescription;
        } else if (typeof errorJson?.details === 'string') {
          errorMsg = errorJson.details;
        } else {
          errorMsg = rawDetails;
        }
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText) {
          errorMsg = errorText;
          rawDetails = errorText;
        }
      }

      const fullError = `Falha na autenticação com a Pluggy (HTTP ${res.status}): ${errorMsg}`;
      recordApiLog({
        endpoint: 'https://api.pluggy.ai/auth',
        method: 'POST',
        statusCode: res.status,
        step: 'auth',
        error: fullError,
        details: rawDetails,
        durationMs,
        responsePreview: rawDetails || errorMsg,
        envSummary,
      });

      return {
        apiKey: null,
        error: fullError,
        status: res.status,
        rawResponse: errorJson || rawDetails,
      };
    }

    const data = await res.json();
    if (data?.apiKey) {
      cachedPluggyApiKey = {
        key: data.apiKey,
        expiresAt: now + 100 * 60 * 1000,
      };

      recordApiLog({
        endpoint: 'https://api.pluggy.ai/auth',
        method: 'POST',
        statusCode: 200,
        step: 'auth',
        durationMs,
        responsePreview: 'API Key obtida com sucesso',
        envSummary,
      });

      return { apiKey: data.apiKey };
    } else {
      const errorMsg = 'Resposta da Pluggy não retornou a chave de API (apiKey).';
      recordApiLog({
        endpoint: 'https://api.pluggy.ai/auth',
        method: 'POST',
        statusCode: 500,
        step: 'auth',
        error: errorMsg,
        durationMs,
        envSummary,
      });
      return {
        apiKey: null,
        error: errorMsg,
        status: 500,
      };
    }
  } catch (err: any) {
    const errorMsg = `Erro ao conectar com api.pluggy.ai/auth: ${err?.message || 'Falha de conexão de rede'}`;
    recordApiLog({
      endpoint: 'https://api.pluggy.ai/auth',
      method: 'POST',
      statusCode: 500,
      step: 'network',
      error: errorMsg,
      durationMs: Date.now() - startTime,
      envSummary,
    });
    return {
      apiKey: null,
      error: errorMsg,
      status: 500,
    };
  }
}

/**
 * Cria o Connect Token para o Pluggy Connect Widget
 */
export async function createPluggyConnectToken(options?: {
  itemId?: string;
  clientUserId?: string;
  oauthRedirectUri?: string;
  connectorId?: number;
}): Promise<{
  success: boolean;
  accessToken: string;
  connectToken: string;
  provider: 'pluggy';
  sandbox: boolean;
  error?: string;
  step?: 'auth' | 'connect_token' | 'config' | 'network';
  status?: number;
  rawResponse?: any;
}> {
  const startTime = Date.now();
  const { clientId, clientSecret } = getSanitizedCredentials();
  const envSummary = {
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    maskedClientId: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : 'Não configurado',
    redirectUri: getSanitizedRedirectUri(options?.oauthRedirectUri),
    nodeEnv: process.env.NODE_ENV || 'production',
  };

  const reqPayloadRecord = {
    connectorId: options?.connectorId,
    clientUserId: options?.clientUserId,
    itemId: options?.itemId,
    oauthRedirectUri: envSummary.redirectUri,
    hasCredentials: envSummary.hasClientId && envSummary.hasClientSecret,
  };

  const authResult = await getPluggyApiKey();
  const apiKey = authResult.apiKey;

  if (!apiKey) {
    const errorMsg = authResult.error || 'Credenciais Pluggy não configuradas ou inválidas.';
    recordApiLog({
      endpoint: '/api/pluggy/connect-token',
      method: 'POST',
      statusCode: authResult.status || 401,
      step: 'auth',
      error: errorMsg,
      durationMs: Date.now() - startTime,
      request: reqPayloadRecord,
      envSummary,
    });

    return {
      success: false,
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
      error: errorMsg,
      step: 'auth',
      status: authResult.status || 401,
      rawResponse: authResult.rawResponse,
    };
  }

  const redirectUri = envSummary.redirectUri;
  const webhookUrl = getDefaultWebhookUrl();

  try {
    const payload: any = {};
    const optionsObj: any = {
      oauthRedirectUri: redirectUri,
      webhookUrl: webhookUrl,
    };

    if (options?.clientUserId && typeof options.clientUserId === 'string' && options.clientUserId.trim() && options.clientUserId !== 'undefined') {
      optionsObj.clientUserId = String(options.clientUserId).trim();
    }

    if (options?.connectorId && !isNaN(Number(options.connectorId)) && Number(options.connectorId) > 0) {
      optionsObj.connectorId = Number(options.connectorId);
    }

    payload.options = optionsObj;

    if (options?.itemId && typeof options.itemId === 'string' && options.itemId.trim()) {
      payload.itemId = String(options.itemId).trim();
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

    const durationMs = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json();
      const token = data?.accessToken || '';

      recordApiLog({
        endpoint: '/api/pluggy/connect-token',
        method: 'POST',
        statusCode: 200,
        step: 'connect_token',
        durationMs,
        request: reqPayloadRecord,
        responsePreview: token ? `JWT Token gerado (${token.slice(0, 16)}...)` : 'OK',
        envSummary,
      });

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
      let rawJson = '';
      let errJson: any = null;
      try {
        errJson = await res.json();
        rawJson = JSON.stringify(errJson);
        if (typeof errJson?.message === 'string') {
          errorDetail = errJson.message;
        } else if (typeof errJson?.error === 'string') {
          errorDetail = errJson.error;
        } else if (typeof errJson?.error?.message === 'string') {
          errorDetail = errJson.error.message;
        } else if (typeof errJson?.codeDescription === 'string') {
          errorDetail = errJson.codeDescription;
        } else if (typeof errJson?.details === 'string') {
          errorDetail = errJson.details;
        } else {
          errorDetail = rawJson;
        }
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) {
          errorDetail = errText;
          rawJson = errText;
        }
      }

      const fullError = `Erro ao gerar Connect Token na Pluggy (HTTP ${res.status}): ${errorDetail}`;
      recordApiLog({
        endpoint: '/api/pluggy/connect-token',
        method: 'POST',
        statusCode: res.status,
        step: 'connect_token',
        error: fullError,
        details: rawJson,
        durationMs,
        request: reqPayloadRecord,
        responsePreview: rawJson || errorDetail,
        envSummary,
      });

      return {
        success: false,
        accessToken: '',
        connectToken: '',
        provider: 'pluggy',
        sandbox: false,
        error: fullError,
        step: 'connect_token',
        status: res.status,
        rawResponse: errJson || rawJson,
      };
    }
  } catch (e: any) {
    const errorMsg = `Falha de comunicação com api.pluggy.ai: ${e?.message || 'Erro de conexão'}`;
    recordApiLog({
      endpoint: '/api/pluggy/connect-token',
      method: 'POST',
      statusCode: 500,
      step: 'network',
      error: errorMsg,
      durationMs: Date.now() - startTime,
      request: reqPayloadRecord,
      envSummary,
    });

    return {
      success: false,
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
      error: errorMsg,
      step: 'network',
      status: 500,
    };
  }
}

/**
 * Retorna status de diagnóstico da integração Pluggy
 */
export async function getPluggyDiagnostics() {
  const { clientId, clientSecret } = getSanitizedCredentials();
  const isConfigured = Boolean(clientId && clientSecret);

  const maskedId = clientId
    ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}`
    : 'Não configurado';
  const maskedSecret = clientSecret
    ? `${clientSecret.slice(0, 4)}...${clientSecret.slice(-4)}`
    : 'Não configurado';

  let authStatus = 'PENDING';
  let authStatusCode = 0;
  let authMessage = '';
  let connectTokenGenerated = false;
  let connectTokenPreview = '';

  if (isConfigured) {
    try {
      const res = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      authStatusCode = res.status;
      if (res.ok) {
        const data = await res.json();
        authStatus = 'SUCCESS';
        authMessage = 'Autenticação Pluggy OK (API Key gerada com sucesso)';

        if (data?.apiKey) {
          try {
            const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': data.apiKey,
              },
              body: JSON.stringify({
                options: {
                  clientUserId: 'diagnostic-check',
                },
              }),
            });
            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData?.accessToken) {
                connectTokenGenerated = true;
                connectTokenPreview = `${tokenData.accessToken.slice(0, 12)}...`;
              }
            }
          } catch {}
        }
      } else {
        const data = await res.json().catch(() => ({}));
        authStatus = authStatusCode === 401 ? 'UNAUTHORIZED' : 'ERROR';
        authMessage = data?.message || data?.codeDescription || `Erro HTTP ${res.status}`;
      }
    } catch (e: any) {
      authStatus = 'ERROR';
      authMessage = e.message || 'Falha ao conectar com api.pluggy.ai';
    }
  }

  const connectTokenErrors = getConnectTokenErrorLogs(10);
  const connectTokenDiagnosticReport = getConnectTokenDiagnosticReport();

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
    mode: authStatus === 'SUCCESS' ? 'pluggy-live' : 'unconfigured',
    supportedConnectorsCount: 13,
    webhookEndpoint: getDefaultWebhookUrl(),
    connectTokenErrorsCount: connectTokenErrors.length,
    connectTokenErrors,
    connectTokenDiagnosticReport,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Consulta dados reais da Pluggy pelo itemId
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
      return {
        success: false,
        error: `Falha ao obter dados do item na Pluggy: ${errDetail}`,
        status: itemRes.status,
      };
    }

    const item = await itemRes.json();

    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    });
    const accountsData = accountsRes.ok ? await accountsRes.json() : { results: [] };
    const rawAccounts = accountsData?.results || [];

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

    const institutionName = item?.connector?.name || 'Instituição Bancária';
    const institutionId = String(item?.connector?.id || '0');
    const institutionLogo = item?.connector?.imageUrl || null;

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
        cards: [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao consultar dados da Pluggy: ${err?.message || 'Falha de comunicação'}`,
      status: 500,
    };
  }
}

export function generateSandboxBankPayload(institutionId: string | number, customName?: string) {
  const instName = customName || 'Banco Conectado';
  const itemId = `sandbox_item_${Date.now()}`;
  return {
    connection: {
      providerItemId: itemId,
      provider: 'pluggy',
      institutionId: String(institutionId),
      institutionName: instName,
      status: 'UPDATED',
      consentStatus: 'ACTIVE',
      lastSyncAt: new Date().toISOString(),
    },
    accounts: [
      {
        providerAccountId: `acc_chk_${Date.now()}`,
        institutionName: instName,
        accountName: `Conta Corrente ${instName}`,
        accountType: 'CHECKING',
        accountNumberMasked: '••• 4321',
        balance: 2450.75,
        currency: 'BRL',
        transactions: [],
      },
    ],
    cards: [],
  };
}

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
      return {
        success: false,
        error: `Falha ao registrar webhook na Pluggy: ${errDetail}`,
        status: res.status,
      };
    }

    const data = await res.json();
    return {
      success: true,
      webhook: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao conectar com api.pluggy.ai/webhooks: ${err?.message || 'Falha de comunicação'}`,
      status: 500,
    };
  }
}

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

export async function deletePluggyWebhook(webhookId: string): Promise<{
  success: boolean;
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
    const res = await fetch(`https://api.pluggy.ai/webhooks/${webhookId}`, {
      method: 'DELETE',
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
        error: `Falha ao deletar webhook na Pluggy: ${errDetail}`,
        status: res.status,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha ao deletar webhook',
      status: 500,
    };
  }
}

export interface WebhookLogEntry {
  id: string;
  event: string;
  itemId?: string;
  timestamp: string;
  status: 'PROCESSED' | 'SKIPPED_DUPLICATE' | 'ERROR' | 'NO_ITEM';
  message?: string;
}

const processedEventIds = new Map<string, number>();
const webhookEventLogs: WebhookLogEntry[] = [];

export function getRecentWebhookLogs(): WebhookLogEntry[] {
  return [...webhookEventLogs].reverse();
}

export async function processPluggyWebhookEvent(rawPayload: any): Promise<{
  success: boolean;
  eventId?: string;
  event?: string;
  itemId?: string;
  message: string;
  duplicate?: boolean;
}> {
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

  let itemId = '';
  if (eventPayload.itemId) {
    itemId = String(eventPayload.itemId);
  } else if (eventPayload.data?.itemId) {
    itemId = String(eventPayload.data.itemId);
  } else if (!eventType.startsWith('connector/') && eventPayload.data?.id && typeof eventPayload.data.id === 'string') {
    itemId = String(eventPayload.data.id);
  }

  if (processedEventIds.has(eventId)) {
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

  const log: WebhookLogEntry = {
    id: eventId,
    event: eventType,
    itemId: itemId || undefined,
    timestamp: new Date().toISOString(),
    status: 'PROCESSED',
    message: `Evento ${eventType} recebido para itemId ${itemId || 'N/A'}.`,
  };
  webhookEventLogs.push(log);

  return {
    success: true,
    eventId,
    event: eventType,
    itemId: itemId || undefined,
    message: `Evento ${eventType} processado com sucesso.`,
  };
}

