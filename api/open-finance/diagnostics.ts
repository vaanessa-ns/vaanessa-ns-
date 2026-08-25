import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPluggyDiagnostics } from '../../server/openFinanceService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const diag = await getPluggyDiagnostics();
    return res.status(200).json(diag);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to run diagnostics', details: error.message });
  }
}
