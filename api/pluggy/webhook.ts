import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  processPluggyWebhookEvent,
  getRecentWebhookLogs,
} from '../_lib/pluggyClient';

/**
 * Safely parse incoming request body from various Vercel / serverless formats:
 * - already-parsed JSON object
 * - Buffer
 * - raw string
 * - readable stream
 */
async function parseBody(req: VercelRequest): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') {
      if (Buffer.isBuffer(req.body)) {
        try {
          return JSON.parse(req.body.toString('utf-8'));
        } catch {
          return {};
        }
      }
      return req.body;
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  // If body is empty or stream was not buffered by Vercel
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length > 0) {
      const rawText = Buffer.concat(chunks).toString('utf-8');
      if (rawText) {
        return JSON.parse(rawText);
      }
    }
  } catch (streamErr) {
    console.warn('[Webhook Parser] Erro ao ler stream do corpo:', streamErr);
  }

  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always enforce JSON and CORS headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Determine current domain
  const host = req.headers?.host || 'vanessa-ns.vercel.app';
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const currentEndpoint = `${protocol}://${host}/api/pluggy/webhook`;

  // GET: Health Check & Webhook Status / Logs for diagnostics and Pluggy verification
  if (req.method === 'GET') {
    try {
      const recentLogs = getRecentWebhookLogs();
      return res.status(200).json({
        status: 'active',
        endpoint: currentEndpoint,
        message: 'Endpoint de Webhook da Pluggy operacional e pronto para receber eventos em produção.',
        supportedEvents: [
          'connector/status_updated',
          'item/created',
          'item/updated',
          'item/error',
          'item/deleted',
          'item/waiting_user_input',
          'item/login_error',
          'transactions/created',
          'transactions/updated',
          'transactions/deleted',
          'all',
        ],
        recentEventsCount: recentLogs.length,
        recentEvents: recentLogs.slice(0, 20),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(200).json({
        status: 'active',
        endpoint: currentEndpoint,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST: Receive Pluggy webhook events
  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);

      // Validate and sanitize basic event properties
      const eventType = String(body?.event || body?.type || 'unknown').trim();
      const eventId = String(body?.id || body?.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      
      // Accurately extract itemId (do NOT confuse with connectorId for connector events)
      let itemId: string | null = null;
      if (body?.itemId) {
        itemId = String(body.itemId);
      } else if (body?.data?.itemId) {
        itemId = String(body.data.itemId);
      } else if (!eventType.startsWith('connector/') && body?.data?.id && typeof body.data.id === 'string') {
        itemId = String(body.data.id);
      }

      console.log(`[API Webhook /api/pluggy/webhook] Recebido evento: ${eventType} | itemId: ${itemId || 'N/A'} | eventId: ${eventId}`);

      // Process event safely with full error isolation so no uncaught rejection crashes the serverless runtime
      let processResult: any = { success: true };
      try {
        processResult = await processPluggyWebhookEvent(body);
      } catch (procErr: any) {
        console.error('[API Webhook] Erro capturado ao processar webhook:', procErr?.message || procErr);
        processResult = {
          success: true, // Acknowledge to avoid 500 retry storms from Pluggy
          error: procErr?.message || 'Erro interno tratado',
        };
      }

      // Fast, guaranteed 200 HTTP response to Pluggy
      return res.status(200).json({
        received: true,
        eventId,
        event: eventType,
        itemId: itemId || undefined,
        status: 'acknowledged',
        result: processResult,
        timestamp: new Date().toISOString(),
      });
    } catch (criticalErr: any) {
      console.error('[API Webhook] Erro crítico no handler de webhook:', criticalErr?.message || criticalErr);
      // Guarantee 200 response with error details so Pluggy does not encounter HTTP 500
      return res.status(200).json({
        received: true,
        status: 'error_handled',
        error: criticalErr?.message || 'Falha ao processar payload do webhook',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use POST to receive webhook events or GET for status.',
  });
}
