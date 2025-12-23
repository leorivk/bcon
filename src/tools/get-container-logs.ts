/**
 * get_container_logs tool 구현
 */

import { DockerService } from '../services/docker.service.js';
import { ContainerLogs } from '../types/index.js';
import { parseDockerLogStream, maskLogEntries } from '../utils/log-parser.js';
import { DEFAULT_LOG_TAIL, MAX_LOG_TAIL } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

interface GetContainerLogsArgs {
  containerId: string;
  tail?: number;
  since?: string;
  until?: string;
  timestamps?: boolean;
}

export const getContainerLogsTool = {
  definition: {
    name: 'get_container_logs',
    description: '컨테이너의 로그를 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: '컨테이너 ID 또는 이름',
        },
        tail: {
          type: 'number',
          description: `마지막 N줄 (기본값: ${DEFAULT_LOG_TAIL}, 최대: ${MAX_LOG_TAIL})`,
        },
        since: {
          type: 'string',
          description: '이 시간 이후 로그만 조회 (ISO 8601 datetime)',
        },
        until: {
          type: 'string',
          description: '이 시간 이전 로그만 조회 (ISO 8601 datetime)',
        },
        timestamps: {
          type: 'boolean',
          description: '타임스탬프 포함 여부 (기본값: true)',
        },
      },
      required: ['containerId'],
    },
  },

  handler: async (args: unknown) => {
    logger.debug('get_container_logs 실행', args);

    const {
      containerId,
      tail = DEFAULT_LOG_TAIL,
      since,
      until,
      timestamps = true,
    } = (args as GetContainerLogsArgs) || {};

    if (!containerId) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: { message: 'containerId는 필수입니다' } }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // tail 제한
    const limitedTail = Math.min(tail, MAX_LOG_TAIL);

    try {
      const dockerService = new DockerService();
      const { containerId: id, containerName, logs } = await dockerService.getContainerLogs({
        containerId,
        tail: limitedTail,
        since,
        until,
        timestamps,
      });

      // 로그 파싱
      const entries = parseDockerLogStream(logs, timestamps);

      // 민감 정보 마스킹
      const maskedEntries = maskLogEntries(entries);

      const result: ContainerLogs = {
        containerId: id,
        containerName,
        entries: maskedEntries,
        tail: limitedTail,
        since: since || null,
      };

      logger.info(`컨테이너 ${containerName} 로그 ${entries.length}줄 조회 완료`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('get_container_logs 실패:', error);

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
