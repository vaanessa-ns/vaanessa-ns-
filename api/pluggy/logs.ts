import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getConnectTokenErrorLogs,
  getConnectTokenDiagnosticReport,
  getApiLogs,
  createPluggyConnectToken,
} from '../_lib/pluggyClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const { limit, endpoint, errorsOnly, action, format } = req.query || {};
  const limitNum = limit ? Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 50) : 10;

  try {
    // If requested to trigger a live test probe
    if (action === 'test' || req.method === 'POST') {
      const probeResult = await createPluggyConnectToken({
        clientUserId: 'diagnostic-probe-user',
      });
      console.log('[API /api/pluggy/logs] Live diagnostic test executed:', probeResult.success ? 'SUCCESS' : 'FAILED');
    }

    const connectTokenErrorLogs = getConnectTokenErrorLogs(limitNum);
    const diagnosticReport = getConnectTokenDiagnosticReport();
    const allFilteredLogs = getApiLogs({
      endpoint: typeof endpoint === 'string' ? endpoint : undefined,
      errorsOnly: errorsOnly === 'true' || errorsOnly === '1',
      limit: limitNum,
    });

    if (format === 'text') {
      let textOutput = `=== RELATÓRIO DE DIAGNÓSTICO PLUGGY CONNECT-TOKEN ===\n`;
      textOutput += `Data/Hora: ${diagnosticReport.timestamp}\n`;
      textOutput += `Status Geral: ${diagnosticReport.primaryFailureCause}\n`;
      textOutput += `Ação Recomendada: ${diagnosticReport.recommendedAction}\n`;
      textOutput += `Total de erros registrados: ${diagnosticReport.connectTokenErrorsCount}\n\n`;
      textOutput += `--- ÚLTIMOS ERROS DE EXECUÇÃO (/api/pluggy/connect-token) ---\n`;

      if (connectTokenErrorLogs.length === 0) {
        textOutput += `Nenhum erro registrado recentemente.\n`;
      } else {
        connectTokenErrorLogs.forEach((log, idx) => {
          textOutput += `[${idx + 1}] ${log.timestamp} | Status: HTTP ${log.statusCode} | Etapa: ${log.step}\n`;
          textOutput += `    Endpoint: ${log.endpoint}\n`;
          textOutput += `    Erro: ${log.error || 'N/A'}\n`;
          textOutput += `    Causa Identificada: ${log.pinpointReason || 'N/A'}\n`;
          textOutput += `    Correção: ${log.recommendedFix || 'N/A'}\n`;
          textOutput += `    Duração: ${log.durationMs || 0}ms\n\n`;
        });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(textOutput);
    }

    return res.status(200).json({
      success: true,
      filter: {
        targetEndpoint: '/api/pluggy/connect-token',
        limit: limitNum,
      },
      diagnosticSummary: {
        primaryCause: diagnosticReport.primaryFailureCause,
        recommendedAction: diagnosticReport.recommendedAction,
        statusCodesSummary: diagnosticReport.statusCodesSummary,
        totalErrorsCount: diagnosticReport.connectTokenErrorsCount,
      },
      last10ErrorLogs: connectTokenErrorLogs,
      environment: diagnosticReport.systemEnvironment,
      allRecentLogs: allFilteredLogs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/pluggy/logs] Erro ao recuperar logs de diagnóstico:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Falha ao recuperar logs de execução do servidor',
      details: error?.message || 'Erro inesperado',
    });
  }
}
