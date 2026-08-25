import type { VercelRequest, VercelResponse } from '@vercel/node';
import syncHandler from '../pluggy/sync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return syncHandler(req, res);
}
