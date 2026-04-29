// MPP (Micro-Payment Protocol) endpoint — dual-protocol support demo
// Shows Kite as universal payment layer supporting both x402 and MPP

import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface MPPConfig {
  agentId: string;
  walletAddress: string;
  port: number;
  executeHandler: (task: any) => Promise<any>;
}

export function createMPPServer(config: MPPConfig) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${config.port}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (url.pathname === '/mpp/execute' && req.method === 'POST') {
        const mppToken = req.headers['x-mpp-token'] as string;

        if (!mppToken) {
          res.writeHead(402);
          res.end(
            JSON.stringify({
              protocol: 'mpp',
              paymentRequired: true,
              recipient: config.walletAddress,
              network: 'kite',
              currency: 'USDC',
              agentId: config.agentId,
              mppEndpoint: `/mpp/pay`,
            })
          );
          return;
        }

        const body = await parseBody(req);
        const result = await config.executeHandler(body);
        res.writeHead(200);
        res.end(JSON.stringify({ result, protocol: 'mpp', agentId: config.agentId }));
        return;
      }

      if (url.pathname === '/mpp/info') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            protocol: 'mpp',
            agentId: config.agentId,
            supportedPayments: ['x402', 'mpp'],
            description: 'Dual-protocol agent — demonstrates Kite as universal payment layer',
          })
        );
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(config.port, () => {
          console.log(`[${config.agentId}] MPP server listening on port ${config.port}`);
          resolve();
        });
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}
