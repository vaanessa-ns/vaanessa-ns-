import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchPluggyItemData, generateSandboxBankPayload } from '../../server/openFinanceService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { itemId, institutionId, institutionName } = req.body || {};

    if (itemId && !String(itemId).startsWith('sandbox_')) {
      const realData = await fetchPluggyItemData(String(itemId));
      if (realData) {
        return res.status(200).json({
          success: true,
          provider: 'pluggy',
          data: realData,
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
    console.error('Error in /api/pluggy/sync:', error);
    return res.status(500).json({
      error: 'Failed to synchronize bank data',
      details: error.message,
    });
  }
}
