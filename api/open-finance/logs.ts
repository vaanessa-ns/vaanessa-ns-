import type { VercelRequest, VercelResponse } from '@vercel/node';
import pluggyLogsHandler from '../pluggy/logs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return pluggyLogsHandler(req, res);
}
