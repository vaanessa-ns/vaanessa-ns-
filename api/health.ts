import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    appName: 'Vfinance',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openFinanceConfigured: Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
    timestamp: new Date().toISOString(),
  });
}
