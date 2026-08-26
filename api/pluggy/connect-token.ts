import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPluggyConnectToken } from '../../server/openFinanceService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always enforce JSON Content-Type and CORS headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      accessToken: '',
      connectToken: '',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { itemId, clientUserId, oauthRedirectUri, connectorId } = body;
    console.log(`[API /api/pluggy/connect-token] Recebida solicitação de Connect Token (connectorId: ${connectorId || 'todos'}, userId: ${clientUserId ? 'fornecido' : 'anônimo'}).`);

    const tokenResult = await createPluggyConnectToken({
      itemId,
      clientUserId,
      oauthRedirectUri: oauthRedirectUri || 'https://vaanessa-ns.vercel.app',
      connectorId: connectorId ? Number(connectorId) : undefined,
    });

    if (!tokenResult.success || (!tokenResult.accessToken && !tokenResult.connectToken)) {
      const statusCode = tokenResult.status && tokenResult.status >= 400 && tokenResult.status < 600 ? tokenResult.status : 400;
      console.warn(`[API /api/pluggy/connect-token] Falha ao obter Connect Token (HTTP ${statusCode}):`, tokenResult.error);
      return res.status(statusCode).json({
        success: false,
        error: tokenResult.error || 'Não foi possível obter o Connect Token da Pluggy.',
        step: tokenResult.step || 'connect_token',
        accessToken: '',
        connectToken: '',
        provider: tokenResult.provider || 'pluggy',
        sandbox: tokenResult.sandbox || false,
      });
    }

    console.log('[API /api/pluggy/connect-token] Retornando Connect Token JSON com sucesso.');
    return res.status(200).json({
      success: true,
      connectToken: tokenResult.connectToken,
      accessToken: tokenResult.accessToken,
      provider: tokenResult.provider,
      sandbox: tokenResult.sandbox,
    });
  } catch (error: any) {
    console.error('[API /api/pluggy/connect-token] Erro inesperado no handler:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Falha interna ao inicializar sessão do Pluggy Connect.',
      details: error?.message || 'Erro inesperado no servidor',
      accessToken: '',
      connectToken: '',
      provider: 'pluggy',
      sandbox: false,
    });
  }
}
