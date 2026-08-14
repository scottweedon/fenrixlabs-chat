import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createArtifactFilesystemServer } from './artifact-filesystem-server.mjs';

const rootArg = process.argv[2];
if (!rootArg) {
  console.error('Usage: node artifact-filesystem-mcp.mjs <root-dir>');
  process.exit(1);
}

const { server, ensureRoot } = createArtifactFilesystemServer(rootArg);
await ensureRoot();
const transport = new StdioServerTransport();
await server.connect(transport);
