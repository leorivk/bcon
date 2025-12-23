/**
 * diagnose_container tool 구현 - 킬러 피처
 */

import { DockerService } from '../services/docker.service.js';
import { DiagnosisEngine } from '../services/diagnosis-engine.js';
import { DiagnosisReport, ContainerState } from '../types/index.js';
import { parseDockerLogStream } from '../utils/log-parser.js';
import { DEFAULT_LOG_TAIL } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

interface DiagnoseContainerArgs {
  containerId: string;
  includeLogs?: boolean;
  logTail?: number;
}

export const diagnoseContainerTool = {
  definition: {
    name: 'diagnose_container',
    description: '컨테이너 상태를 분석하고 문제를 진단합니다 (킬러 피처)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: '컨테이너 ID 또는 이름',
        },
        includeLogs: {
          type: 'boolean',
          description: '로그 분석 포함 여부 (기본값: true)',
        },
        logTail: {
          type: 'number',
          description: `분석할 로그 줄 수 (기본값: ${DEFAULT_LOG_TAIL * 2})`,
        },
      },
      required: ['containerId'],
    },
  },

  handler: async (args: unknown) => {
    logger.debug('diagnose_container 실행', args);

    const {
      containerId,
      includeLogs = true,
      logTail = DEFAULT_LOG_TAIL * 2,
    } = (args as DiagnoseContainerArgs) || {};

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
      const diagnosisEngine = new DiagnosisEngine();

      // 1. 컨테이너 기본 정보
      const containerInfo = await dockerService.getContainer(containerId);

      // 2. Stats 조회 (실행 중인 경우만)
      let stats = null;
      try {
        if (containerInfo.state === ContainerState.RUNNING) {
          const statsResult = await dockerService.getContainerStats(containerId);
          const rawStats = statsResult.stats as any;

          // Stats 계산
          const cpuDelta =
            (rawStats.cpu_stats?.cpu_usage?.total_usage || 0) -
            (rawStats.precpu_stats?.cpu_usage?.total_usage || 0);
          const systemDelta =
            (rawStats.cpu_stats?.system_cpu_usage || 0) -
            (rawStats.precpu_stats?.system_cpu_usage || 0);
          const cpuCount = rawStats.cpu_stats?.online_cpus || 1;
          const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

          const memoryUsage = rawStats.memory_stats?.usage || 0;
          const memoryLimit = rawStats.memory_stats?.limit || 0;
          const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

          stats = {
            containerId: statsResult.containerId,
            containerName: statsResult.containerName,
            timestamp: new Date().toISOString(),
            cpuPercent: Math.round(cpuPercent * 100) / 100,
            cpuCount,
            memoryUsageBytes: memoryUsage,
            memoryLimitBytes: memoryLimit,
            memoryPercent: Math.round(memoryPercent * 100) / 100,
            networkRxBytes: 0,
            networkTxBytes: 0,
            blockReadBytes: 0,
            blockWriteBytes: 0,
          };
        }
      } catch (error) {
        logger.warn('Stats 조회 실패 (중지된 컨테이너일 수 있음):', error);
      }

      // 3. 로그 조회
      let logEntries: any[] = [];
      if (includeLogs) {
        try {
          const { logs } = await dockerService.getContainerLogs({
            containerId,
            tail: logTail,
            timestamps: false,
          });
          logEntries = parseDockerLogStream(logs, false);
        } catch (error) {
          logger.warn('로그 조회 실패:', error);
        }
      }

      // 4. 재시작 횟수 계산 (TODO: 실제 구현 시 시간 기반 필터링 필요)
      const restartCount = 0; // MVP: 간단히 0으로 처리

      // 5. Exit code 추출
      const exitCode = null; // MVP: 간단히 null로 처리

      // 6. 진단 실행
      const diagnosis = diagnosisEngine.diagnose({
        stats,
        logs: logEntries,
        restartCount,
        exitCode,
      });

      // 7. 요약 생성
      const summary = diagnoseContainerTool.generateSummary(diagnosis);
      const detailedExplanation = diagnoseContainerTool.generateDetailedExplanation(diagnosis);

      // 8. 결과 조합
      const report: DiagnosisReport = {
        containerId: containerInfo.id,
        containerName: containerInfo.name,
        timestamp: new Date().toISOString(),
        state: containerInfo.state,
        uptime: null, // MVP: 간단히 null로 처리
        symptoms: diagnosis.symptoms,
        likelyCauses: diagnosis.likelyCauses,
        suggestions: diagnosis.suggestions,
        summary: summary || '분석 완료',
        detailedExplanation: detailedExplanation || '상세 정보 없음',
      };

      logger.info(`컨테이너 ${containerInfo.name} 진단 완료`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('diagnose_container 실패:', error);

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

  generateSummary(diagnosis: { symptoms: any[]; likelyCauses: any[] }): string {
    if (diagnosis.symptoms.length === 0) {
      return '컨테이너 상태가 정상입니다';
    }

    const topSymptom = diagnosis.symptoms[0];
    const topCause = diagnosis.likelyCauses.length > 0 ? diagnosis.likelyCauses[0] : null;

    if (topCause) {
      return `${topSymptom.description}. ${topCause.description}`;
    }

    return topSymptom.description;
  },

  generateDetailedExplanation(diagnosis: { symptoms: any[]; likelyCauses: any[]; suggestions: any[] }): string {
    const parts: string[] = [];

    if (diagnosis.symptoms.length > 0) {
      parts.push('## 증상');
      diagnosis.symptoms.forEach((s, i) => {
        parts.push(`${i + 1}. [${s.severity.toUpperCase()}] ${s.description}`);
      });
    }

    if (diagnosis.likelyCauses.length > 0) {
      parts.push('\n## 추정 원인');
      diagnosis.likelyCauses.forEach((c, i) => {
        parts.push(`${i + 1}. ${c.description} (신뢰도: ${(c.confidence * 100).toFixed(0)}%)`);
      });
    }

    if (diagnosis.suggestions.length > 0) {
      parts.push('\n## 권장 조치');
      diagnosis.suggestions.forEach((s, i) => {
        parts.push(`${i + 1}. [${s.urgency.toUpperCase()}] ${s.action}`);
      });
    }

    return parts.join('\n');
  },
};
