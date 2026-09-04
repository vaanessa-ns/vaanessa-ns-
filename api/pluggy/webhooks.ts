import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  registerPluggyWebhook,
  listPluggyWebhooks,
  deletePluggyWebhook,
  getDefaultWebhookUrl,
} from '../_lib/pluggyClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const defaultUrl = getDefaultWebhookUrl();

  // GET: List all webhooks registered in Pluggy
  if (req.method === 'GET') {
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

  // POST: Register new webhook in Pluggy
  if (req.method === 'POST') {
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

      const url = body.url || defaultUrl;
      const event = body.event || 'all';

      const result = await registerPluggyWebhook(url, event);
      if (!result.success) {
        return res.status(result.status || 500).json(result);
      }

      return res.status(201).json({
        success: true,
        message: 'Webhook registrado com sucesso na Pluggy!',
        webhook: result.webhook,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Falha ao registrar webhook',
      });
    }
  }

  // DELETE: Remove webhook
  if (req.method === 'DELETE') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
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

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
