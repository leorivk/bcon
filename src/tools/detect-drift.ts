/**
 * detect_drift tool 구현
 */

import { DriftDetector } from '../services/drift-detector.js';
import { logger } from '../utils/logger.js';

interface DetectDriftArgs {
  composeFile: string;
  projectName?: string;
}

export const detectDriftTool = {
  definition: {
    name: 'detect_drift',
    description: 'Docker Compose 파일과 실제 Docker 상태 간의 차이를 탐지합니다',
    inputSchema: {
      type: 'object',
      properties: {
        composeFile: {
          type: 'string',
          description: 'Docker Compose 파일 경로',
        },
        projectName: {
          type: 'string',
          description: '프로젝트 이름 (없으면 파일에서 추론)',
        },
      },
      required: ['composeFile'],
    },
  },

  handler: async (args: unknown) => {
    logger.debug('detect_drift 실행', args);

    const { composeFile, projectName } = (args as DetectDriftArgs) || {};

    if (!composeFile) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: { message: 'composeFile은 필수입니다' } }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const detector = new DriftDetector();
      const report = await detector.detectDrift(composeFile, projectName);

      logger.info(`Drift 탐지 완료: ${report.status}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('detect_drift 실패:', error);

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
