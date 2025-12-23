/**
 * MCP Server 초기화
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from './tools/index.js';
import { logger } from './utils/logger.js';

export function createServer(): Server {
  const server = new Server(
    {
      name: 'bcon',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool 등록
  registerTools(server);

  // 에러 핸들러
  server.onerror = (error) => {
    logger.error('MCP Server 에러:', error);
  };

  logger.info('MCP Server 초기화 완료');

  return server;
}
