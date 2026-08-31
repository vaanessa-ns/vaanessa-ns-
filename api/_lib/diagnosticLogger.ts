/**
 * Diagnostic Logging and Root Cause Analyzer for API Execution
 * Specialized in tracking, storing, and filtering errors for /api/pluggy/connect-token
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

// In-memory ring buffer (up to 100 entries)
const MAX_LOGS = 100;
const globalLogsStore: ApiExecutionLog[] = [];

/**
 * Derives a human-friendly pinpoint explanation based on the failure context
 */
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

  if (statusCode === 401 || errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('invalid api key')) {
    return {
      pinpointReason: 'Autenticação recusada pela Pluggy (HTTP 401 Unauthorized). O Client ID ou Client Secret cadastrados estão incorretos ou foram gerados para outro ambiente (Sandbox vs Produção).',
      recommendedFix: 'Verifique no Dashboard da Pluggy (https://dashboard.pluggy.ai) se as chaves pertencem ao ambiente correto e atualize as variáveis de ambiente na Vercel.',
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
      recommendedFix: 'Certifique-se de que a URL do seu domínio (ex: https://vaanessa-ns.vercel.app) está cadastrada na lista de Redirect URIs permitidas no Dashboard da Pluggy.',
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

/**
 * Records an execution log entry into memory
 */
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

  // Add to front of array
  globalLogsStore.unshift(logEntry);

  // Keep array within bounds
  if (globalLogsStore.length > MAX_LOGS) {
    globalLogsStore.length = MAX_LOGS;
  }

  return logEntry;
}

/**
 * Fetches all API execution logs with optional filtering
 */
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

/**
 * Specifically fetches the last 10 error logs for /api/pluggy/connect-token (and /api/open-finance/connect-token)
 */
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

/**
 * Generates an end-to-end diagnostic summary report for connect-token errors
 */
export function getConnectTokenDiagnosticReport(): ConnectTokenDiagnosticReport {
  const last10Errors = getConnectTokenErrorLogs(10);

  // Summarize status codes
  const statusCodesSummary: Record<number, number> = {};
  for (const err of last10Errors) {
    const code = err.statusCode || 0;
    statusCodesSummary[code] = (statusCodesSummary[code] || 0) + 1;
  }

  // Determine primary root cause
  let primaryFailureCause = 'Nenhum erro recente de connect-token registrado.';
  let recommendedAction = 'O sistema está operando normalmente ou nenhuma requisição falhou recentemente.';

  if (last10Errors.length > 0) {
    const mostRecent = last10Errors[0];
    primaryFailureCause = mostRecent.pinpointReason || mostRecent.error || `Falha com HTTP ${mostRecent.statusCode}`;
    recommendedAction = mostRecent.recommendedFix || 'Consulte os detalhes do log para verificar a resposta da Pluggy.';
  }

  const rawId = process.env.PLUGGY_CLIENT_ID || process.env.PLUGGY_CLIENTID || '';
  const rawSecret = process.env.PLUGGY_CLIENT_SECRET || process.env.PLUGGY_CLIENTSECRET || '';
  const cleanId = rawId.replace(/^["'`]|["'`]$/g, '').trim();
  const cleanSecret = rawSecret.replace(/^["'`]|["'`]$/g, '').trim();

  return {
    timestamp: new Date().toISOString(),
    totalLogsCount: globalLogsStore.length,
    connectTokenErrorsCount: last10Errors.length,
    last10ConnectTokenErrors: last10Errors,
    statusCodesSummary,
    primaryFailureCause,
    recommendedAction,
    systemEnvironment: {
      clientIdConfigured: Boolean(cleanId),
      clientSecretConfigured: Boolean(cleanSecret),
      maskedClientId: cleanId ? `${cleanId.slice(0, 4)}...${cleanId.slice(-4)}` : 'Não configurado',
      oauthRedirectUri: process.env.PLUGGY_OAUTH_REDIRECT_URI || 'https://vaanessa-ns.vercel.app',
      webhookUrl: process.env.PLUGGY_WEBHOOK_URL || 'https://vaanessa-ns.vercel.app/api/pluggy/webhook',
      nodeEnv: process.env.NODE_ENV || 'production',
    },
  };
}
