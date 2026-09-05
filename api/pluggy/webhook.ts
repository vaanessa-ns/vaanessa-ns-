import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  processPluggyWebhookEvent,
  getRecentWebhookLogs,
  registerPluggyWebhook,
  listPluggyWebhooks,
  deletePluggyWebhook,
  getDefaultWebhookUrl,
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

  const defaultUrl = getDefaultWebhookUrl();
  const reqUrl = req.url || '';
  const action = (req.query?.action as string) || '';

  // 1. DELETE: Delete webhook registration
  if (req.method === 'DELETE') {
    try {
      const body = await parseBody(req);
      const webhookId = (req.query.id as string) || body?.id;

      if (!webhookId) {
        return res.status(400).json({ success: false, error: 'Informe o ID do webhook a ser deletado.' });
      }

      const result = await deletePluggyWebhook(webhookId);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  }

  // 2. GET: List webhooks OR Webhook Health/Status
  if (req.method === 'GET') {
    // If querying webhooks management
    if (action === 'list' || reqUrl.includes('webhooks') || req.query?.manage === 'true') {
      try {
        const result = await listPluggyWebhooks();
        if (!result.success) {
          return res.status(result.status || 500).json(result);
        }
        return res.status(200).json({
          success: true,
          webhooks: result.webhooks || [],
          targetWebhookUrl: defaultUrl,
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: err?.message || 'Falha ao consultar webhooks',
        });
      }
    }

    // Default GET: Health Check & Webhook Status / Logs for diagnostics and Pluggy verification
    const host = req.headers?.host || 'vanessa-ns.vercel.app';
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    const currentEndpoint = `${protocol}://${host}/api/pluggy/webhook`;

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

  // 3. POST: Register webhook in Pluggy OR Receive Pluggy webhook event
  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);

      // Check if this is a webhook registration request (from ConnectBankModal or admin)
      if (body?.url || action === 'register' || (reqUrl.includes('webhooks') && !body?.event?.includes('/'))) {
        const url = body?.url || defaultUrl;
        const event = body?.event || 'all';

        const result = await registerPluggyWebhook(url, event);
        if (!result.success) {
          return res.status(result.status || 500).json(result);
        }

        return res.status(201).json({
          success: true,
          message: 'Webhook registrado com sucesso na Pluggy!',
          webhook: result.webhook,
        });
      }

      // Otherwise, this is an incoming webhook event notification from Pluggy
      const eventType = String(body?.event || body?.type || 'unknown').trim();
      const eventId = String(body?.id || body?.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      
      let itemId: string | null = null;
      if (body?.itemId) {
        itemId = String(body.itemId);
      } else if (body?.data?.itemId) {
        itemId = String(body.data.itemId);
      } else if (!eventType.startsWith('connector/') && body?.data?.id && typeof body.data.id === 'string') {
        itemId = String(body.data.id);
      }

      console.log(`[API Webhook /api/pluggy/webhook] Recebido evento: ${eventType} | itemId: ${itemId || 'N/A'} | eventId: ${eventId}`);

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
    error: 'Method not allowed.',
  });
}
