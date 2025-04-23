import server from './app.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Graceful shutdown
const shutdown = async (err: any) => {
  console.log('Shutting down server...', err);
  // await server.close();
  // process.exit(err ? 1 : 0);
};

const main = async () => {
  if (server) {
    const transport = new StdioServerTransport();
    transport._onerror = (err: any) => {
      console.error('Transport error:', err);
      //
    };
    await server.connect(transport);
    console.log('Weather MCP Server running on stdio');
  }
};

main().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
