/**
 * health_check tool 구현
 */

import Dockerode from 'dockerode';
import { HealthCheck, HealthStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const healthCheckTool = {
  definition: {
    name: 'health_check',
    description: 'bcon 자체와 Docker 데몬의 상태를 확인합니다',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  } as ToolDefinition,

  handler: async (_args: unknown) => {
    logger.debug('health_check 실행');

    const result: HealthCheck = {
      status: 'healthy',
      dockerConnected: false,
      dockerVersion: null,
      timestamp: new Date().toISOString(),
    };

    try {
      // Docker 연결 시도
      const docker = new Dockerode();
      const info = await docker.version();

      result.dockerConnected = true;
      result.dockerVersion = info.Version || null;
      result.status = 'healthy';
      result.message = `Docker ${info.Version}에 성공적으로 연결되었습니다`;

      logger.info(`Docker 연결 성공: ${info.Version}`);
    } catch (error) {
      result.dockerConnected = false;
      result.status = 'unhealthy';
      result.message =
        'Docker 데몬에 연결할 수 없습니다. Docker가 실행 중인지 확인하세요.';

      logger.error('Docker 연결 실패:', error);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
