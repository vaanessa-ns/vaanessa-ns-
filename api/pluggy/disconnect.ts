import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deletePluggyItem } from '../_lib/pluggyClient';

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

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST or DELETE.',
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

    const itemId = (req.query.itemId as string) || body.itemId;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemId é obrigatório para desconectar.',
      });
    }

    const result = await deletePluggyItem(String(itemId));

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? 'Conexão bancária desconectada com sucesso.'
        : result.error || 'Falha ao desconectar na Pluggy.',
    });
  } catch (error: any) {
    console.error('[API /api/pluggy/disconnect] Erro ao desconectar:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao desconectar instituição bancária.',
      details: error?.message || 'Erro interno',
    });
  }
}
