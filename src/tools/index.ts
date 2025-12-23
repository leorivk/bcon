/**
 * Tool 등록
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { healthCheckTool } from './health-check.js';
import { listContainersTool } from './list-containers.js';
import { getContainerLogsTool } from './get-container-logs.js';
import { getContainerStatsTool } from './get-container-stats.js';
import { diagnoseContainerTool } from './diagnose-container.js';
import { detectDriftTool } from './detect-drift.js';
import { logger } from '../utils/logger.js';

export function registerTools(server: Server): void {
  logger.info('Tool 등록 중...');

  // Phase 1 + 2: 모든 Tool 등록
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      healthCheckTool.definition,
      listContainersTool.definition,
      getContainerLogsTool.definition,
      getContainerStatsTool.definition,
      diagnoseContainerTool.definition,
      detectDriftTool.definition,
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

      case 'get_container_logs':
        return getContainerLogsTool.handler(args);

      case 'get_container_stats':
        return getContainerStatsTool.handler(args);

      case 'diagnose_container':
        return diagnoseContainerTool.handler(args);

      case 'detect_drift':
        return detectDriftTool.handler(args);

      default:
        throw new Error(`알 수 없는 tool: ${name}`);
    }
  });

  logger.info('Tool 등록 완료');
}
