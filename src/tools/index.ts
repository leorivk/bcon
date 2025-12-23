/**
 * Tool 등록
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { healthCheckTool } from './health-check.js';
import { listContainersTool } from './list-containers.js';
import { logger } from '../utils/logger.js';

export function registerTools(server: Server): void {
  logger.info('Tool 등록 중...');

  // Phase 1: 기본 Tool 등록
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      healthCheckTool.definition,
      listContainersTool.definition,
      // 추후 다른 tool들이 여기에 추가됩니다
    ],
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    logger.debug(`Tool 호출: ${name}`, args);

    switch (name) {
      case 'health_check':
        return healthCheckTool.handler(args);

      case 'list_containers':
        return listContainersTool.handler(args);

      default:
        throw new Error(`알 수 없는 tool: ${name}`);
    }
  });

  logger.info('Tool 등록 완료');
}
