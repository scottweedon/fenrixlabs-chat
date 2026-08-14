import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createArtifactFilesystemServer } from './artifact-filesystem-server.mjs';

const rootArg = process.argv[2];
const portArg = process.argv[3];
const port = Number.parseInt(portArg ?? '3099', 10);

if (!rootArg) {
  console.error('Usage: node artifact-filesystem-mcp-http.mjs <root-dir> [port]');
  process.exit(1);
}

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port: ${portArg}`);
  process.exit(1);
}

const { ensureRoot } = createArtifactFilesystemServer(rootArg);
const transports = new Map();

function registerTransport(transport) {
  if (!transport.sessionId) {
    return;
  }

  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);
  transport.onclose = () => {
    transports.delete(sessionId);
  };
}

async function createTransport() {
  // Each session gets its own `McpServer` instance — the SDK only allows a
  // single transport binding per server, so reusing one across sessions
  // throws "Already connected to a transport" on the second connection.
  const { server } = createArtifactFilesystemServer(rootArg);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);
  return transport;
}

const httpServer = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (requestUrl.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }

    if (requestUrl.pathname !== '/mcp') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const sessionIdHeader = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

    if (req.method === 'GET') {
      const transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
            id: null,
          }),
        );
        return;
      }

      await transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'DELETE') {
      const transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Not Found: Session not found' },
            id: null,
          }),
        );
        return;
      }

      await transport.handleRequest(req, res);
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');
    const body = rawBody ? JSON.parse(rawBody) : undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      if (!isInitializeRequest(body)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: null,
          }),
        );
        return;
      }

      transport = await createTransport();
    }

    await transport.handleRequest(req, res, body);
    registerTransport(transport);
  } catch (error) {
    console.error('[artifact-filesystem-mcp-http] Request failed', error);

    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }),
      );
    } else {
      res.end();
    }
  }
});

await ensureRoot();

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`[artifact-filesystem-mcp-http] Listening on 0.0.0.0:${port}`);
});
