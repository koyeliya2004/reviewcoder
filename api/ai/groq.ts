import type { ProxyRequest, ProxyResponse } from '../../aiProxy';
import { handleGroqProxy } from '../../aiProxy';

export default async function handler(req: ProxyRequest, res: ProxyResponse) {
  return handleGroqProxy(req, res);
}
