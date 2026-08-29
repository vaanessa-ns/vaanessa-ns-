import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPluggyDiagnostics } from '../_lib/pluggyClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    const diag = await getPluggyDiagnostics();
    return res.status(200).json(diag);
  } catch (error: any) {
    console.error('[API /api/pluggy/diagnostics] Erro nos diagnósticos:', error?.message || error);
    return res.status(500).json({
      error: 'Falha ao executar diagnóstico da Pluggy',
      details: error?.message || 'Erro inesperado',
    });
  }
}
