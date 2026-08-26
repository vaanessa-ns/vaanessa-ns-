import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  processPluggyWebhookEvent,
  getRecentWebhookLogs,
  registerPluggyWebhook,
  listPluggyWebhooks
} from '../../server/openFinanceService';

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

  // GET: Health Check & Webhook Status / Logs for diagnostics and Pluggy certification verification
  if (req.method === 'GET') {
    try {
      const recentLogs = getRecentWebhookLogs();
      return res.status(200).json({
        status: 'active',
        endpoint: 'https://vaanessa-ns.vercel.app/api/pluggy/webhook',
        message: 'Endpoint de Webhook da Pluggy operacional e pronto para receber eventos.',
        supportedEvents: [
          'item/created',
          'item/updated',
          'item/error',
          'item/deleted',
          'transactions/created',
          'transactions/updated',
          'transactions/deleted',
          'all',
        ],
        recentEventsCount: recentLogs.length,
        recentEvents: recentLogs.slice(0, 15),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(200).json({
        status: 'active',
        endpoint: 'https://vaanessa-ns.vercel.app/api/pluggy/webhook',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // POST: Receive Pluggy webhook events
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const eventType = body.event || body.type || 'unknown';
    const eventId = body.id || body.eventId || `evt_${Date.now()}`;
    const itemId = body.itemId || body.data?.itemId || body.data?.id;

    console.log(`[API Webhook /api/pluggy/webhook] Recebido evento Pluggy: ${eventType} | itemId: ${itemId || 'N/A'} | eventId: ${eventId}`);

    // Process event asynchronously in the background so HTTP response is returned immediately (< 200ms)
    // to satisfy Pluggy's fast response requirement (preventing retry storms)
    const processPromise = processPluggyWebhookEvent(body).catch((err) => {
      console.error('[API Webhook] Erro no background worker de webhook:', err);
    });

    // We can await a very short grace period (or return immediately)
    // Returning 200 OK fast
    try {
      // Allow up to 1.5s for fast operations (Supabase update / idempotency check)
      await Promise.race([
        processPromise,
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {}

    return res.status(200).json({
      received: true,
      eventId,
      event: eventType,
      itemId,
      status: 'acknowledged',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use POST to receive webhook events or GET for status.',
  });
}
