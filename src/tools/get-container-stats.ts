/**
 * get_container_stats tool 구현
 */

import { DockerService } from '../services/docker.service.js';
import { ContainerStats } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface GetContainerStatsArgs {
  containerId: string;
}

/**
 * Docker API stats를 우리 타입으로 변환
 */
function mapStats(rawStats: any, containerId: string, containerName: string): ContainerStats {
  // CPU 계산
  const cpuDelta =
    (rawStats.cpu_stats?.cpu_usage?.total_usage || 0) -
    (rawStats.precpu_stats?.cpu_usage?.total_usage || 0);
  const systemDelta =
    (rawStats.cpu_stats?.system_cpu_usage || 0) - (rawStats.precpu_stats?.system_cpu_usage || 0);
  const cpuCount = rawStats.cpu_stats?.online_cpus || 1;

  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

  // Memory 계산
  const memoryUsage = rawStats.memory_stats?.usage || 0;
  const memoryLimit = rawStats.memory_stats?.limit || 0;
  const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

  // Network 계산
  let networkRx = 0;
  let networkTx = 0;
  if (rawStats.networks) {
    Object.values(rawStats.networks).forEach((net: any) => {
      networkRx += net.rx_bytes || 0;
      networkTx += net.tx_bytes || 0;
    });
  }

  // Disk 계산
  let blockRead = 0;
  let blockWrite = 0;
  if (rawStats.blkio_stats?.io_service_bytes_recursive) {
    rawStats.blkio_stats.io_service_bytes_recursive.forEach((io: any) => {
      if (io.op === 'read' || io.op === 'Read') {
        blockRead += io.value || 0;
      } else if (io.op === 'write' || io.op === 'Write') {
        blockWrite += io.value || 0;
      }
    });
  }

  return {
    containerId,
    containerName,
    timestamp: new Date().toISOString(),

    cpuPercent: Math.round(cpuPercent * 100) / 100,
    cpuCount,

    memoryUsageBytes: memoryUsage,
    memoryLimitBytes: memoryLimit,
    memoryPercent: Math.round(memoryPercent * 100) / 100,

    networkRxBytes: networkRx,
    networkTxBytes: networkTx,

    blockReadBytes: blockRead,
    blockWriteBytes: blockWrite,
  };
}

export const getContainerStatsTool = {
  definition: {
    name: 'get_container_stats',
    description: '컨테이너의 리소스 사용량을 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: '컨테이너 ID 또는 이름',
        },
      },
      required: ['containerId'],
    },
  },

  handler: async (args: unknown) => {
    logger.debug('get_container_stats 실행', args);

    const { containerId } = (args as GetContainerStatsArgs) || {};

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

    try {
      const dockerService = new DockerService();
      const { containerId: id, containerName, stats: rawStats } = await dockerService.getContainerStats(
        containerId
      );

      const stats = mapStats(rawStats, id, containerName);

      logger.info(`컨테이너 ${containerName} stats 조회 완료`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('get_container_stats 실패:', error);

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
