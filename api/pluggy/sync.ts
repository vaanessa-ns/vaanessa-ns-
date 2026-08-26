import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchPluggyItemData, generateSandboxBankPayload } from '../../server/openFinanceService';

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

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
      success: false,
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

    const { itemId, institutionId, institutionName } = body;
    console.log(`[API /api/pluggy/sync] Sincronizando dados bancários (itemId: ${itemId || 'não informado'})...`);

    if (itemId && !String(itemId).startsWith('sandbox_')) {
      const realResult = await fetchPluggyItemData(String(itemId));
      if (realResult.success && realResult.data) {
        console.log(`[API /api/pluggy/sync] Dados reais da Pluggy obtidos com sucesso para ${institutionName || 'instituição'}.`);
        return res.status(200).json({
          success: true,
          provider: 'pluggy',
          data: realResult.data,
        });
      } else {
        console.warn(`[API /api/pluggy/sync] Falha na consulta de dados reais (HTTP ${realResult.status || 400}):`, realResult.error);
        return res.status(realResult.status || 400).json({
          success: false,
          error: realResult.error || 'Não foi possível consultar os dados bancários na Pluggy.',
          details: realResult.error,
        });
      }
    }

    const sandboxPayload = generateSandboxBankPayload(institutionId || 201, institutionName);
    return res.status(200).json({
      success: true,
      provider: 'pluggy-sandbox',
      data: sandboxPayload,
    });
  } catch (error: any) {
    console.error('[API /api/pluggy/sync] Erro ao sincronizar dados bancários:', error?.message || error);
    return res.status(500).json({
      error: 'Falha ao sincronizar dados da instituição bancária',
      details: error?.message || 'Erro inesperado',
      success: false,
    });
  }
}
