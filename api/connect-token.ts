import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectTokenHandler from './pluggy/connect-token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return connectTokenHandler(req, res);
}
