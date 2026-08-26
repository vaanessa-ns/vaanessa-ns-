import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPluggyApiKey } from '../../server/openFinanceService';

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

  try {
    const authResult = await getPluggyApiKey();

    if (!authResult.apiKey) {
      return res.status(authResult.status || 401).json({
        success: false,
        authenticated: false,
        error: authResult.error || 'Credenciais Pluggy não configuradas ou inválidas.',
        step: 'auth',
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      message: 'Autenticação com Pluggy realizada com sucesso.',
    });
  } catch (error: any) {
    console.error('[API /api/pluggy/auth] Erro na autenticação:', error?.message || error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Erro interno ao autenticar com Pluggy',
      details: error?.message || 'Erro inesperado',
    });
  }
}
