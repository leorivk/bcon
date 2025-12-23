#!/usr/bin/env node

/**
 * bcon MCP Server 엔트리포인트
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    logger.info('bcon MCP Server 시작 중...');

    const server = createServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    logger.info('bcon MCP Server가 시작되었습니다');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('bcon MCP Server 종료 중...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('MCP Server 시작 실패:', error);
    process.exit(1);
  }
}

main();
