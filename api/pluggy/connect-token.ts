import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPluggyConnectToken } from '../../server/openFinanceService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS if needed
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
    const { itemId, clientUserId, oauthRedirectUri, connectorId } = req.body || {};
    const tokenResult = await createPluggyConnectToken({
      itemId,
      clientUserId,
      oauthRedirectUri: oauthRedirectUri || 'https://vaanessa-ns.vercel.app',
      connectorId: connectorId ? Number(connectorId) : undefined,
    });

    if (tokenResult.error && !tokenResult.accessToken) {
      return res.status(400).json({
        error: tokenResult.error,
        accessToken: '',
        connectToken: '',
        provider: tokenResult.provider,
        sandbox: tokenResult.sandbox,
      });
    }

    return res.status(200).json({
      accessToken: tokenResult.accessToken,
      connectToken: tokenResult.connectToken,
      provider: tokenResult.provider,
      sandbox: tokenResult.sandbox,
    });
  } catch (error: any) {
    console.error('Error in /api/pluggy/connect-token:', error);
    return res.status(500).json({
      error: 'Failed to create Pluggy connect token',
      details: error.message,
    });
  }
}
