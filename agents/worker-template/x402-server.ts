// x402 HTTP endpoint template for worker agents
// Returns 402 Payment Required with payment details, executes on valid payment

import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface X402Config {
  agentId: string;
  walletAddress: string;
  facilitatorUrl: string;
  port: number;
  executeHandler: (task: any) => Promise<any>;
  quoteHandler: (rfq: any) => Promise<any>;
}

export function createX402Server(config: X402Config) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${config.port}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (url.pathname === '/quote' && req.method === 'POST') {
        const body = await parseBody(req);
        const quote = await config.quoteHandler(body);
        res.writeHead(200);
        res.end(JSON.stringify(quote));
        return;
      }

      if (url.pathname === '/execute' && req.method === 'POST') {
        const paymentHeader = req.headers['x-payment'] as string;

        if (!paymentHeader) {
          // Return 402 Payment Required
          res.writeHead(402);
          res.end(
            JSON.stringify({
              paymentRequired: true,
              recipient: config.walletAddress,
              network: 'kite',
              currency: 'USDC',
              facilitator: config.facilitatorUrl,
              agentId: config.agentId,
            })
          );
          return;
        }

        // Verify payment (simplified — in production, verify via facilitator)
        const body = await parseBody(req);
        const result = await config.executeHandler(body);
        res.writeHead(200);
        res.end(JSON.stringify({ result, agentId: config.agentId }));
        return;
      }

      if (url.pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', agentId: config.agentId }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(config.port, () => {
          console.log(`[${config.agentId}] x402 server listening on port ${config.port}`);
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
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
