import type { ProxyRequest, ProxyResponse } from '../../aiProxy';
import { handleGeminiProxy } from '../../aiProxy';

export default async function handler(req: ProxyRequest, res: ProxyResponse) {
  return handleGeminiProxy(req, res);
}
