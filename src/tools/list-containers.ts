/**
 * list_containers tool 구현
 */

import { DockerService } from '../services/docker.service.js';
import { logger } from '../utils/logger.js';

interface ListContainersArgs {
  all?: boolean;
  filters?: Record<string, string>;
}

export const listContainersTool = {
  definition: {
    name: 'list_containers',
    description: '실행 중인 컨테이너 목록을 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {
        all: {
          type: 'boolean',
          description: 'true면 중지된 컨테이너도 포함합니다 (기본값: false)',
        },
        filters: {
          type: 'object',
          description: '필터 조건 (예: {"label": "app=web", "name": "nginx"})',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      required: [],
    },
  },

  handler: async (args: unknown) => {
    logger.debug('list_containers 실행', args);

    const { all = false, filters } = (args as ListContainersArgs) || {};

    try {
      const dockerService = new DockerService();
      const containers = await dockerService.listContainers({ all, filters });

      logger.info(`컨테이너 ${containers.length}개 조회 완료`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(containers, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('list_containers 실패:', error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};
