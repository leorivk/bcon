/**
 * Drift Detection Service
 * Docker Compose 파일과 실제 컨테이너 상태 비교
 */

import fs from 'fs';
import yaml from 'js-yaml';
import {
  DriftReport,
  DriftStatus,
  ServiceDrift,
  DriftType,
  ContainerInfo,
  ErrorCode,
  BconError,
} from '../types/index.js';
import { DockerService } from './docker.service.js';
import { i18n } from '../utils/i18n.js';
import { logger } from '../utils/logger.js';

interface ComposeService {
  image?: string;
  container_name?: string;
  deploy?: {
    replicas?: number;
  };
  environment?: string[] | Record<string, string>;
  ports?: string[];
  labels?: Record<string, string>;
}

interface ComposeFile {
  services: Record<string, ComposeService>;
  name?: string;
}

export class DriftDetector {
  private dockerService: DockerService;

  constructor() {
    this.dockerService = new DockerService();
  }

  async detectDrift(composeFile: string, projectName?: string): Promise<DriftReport> {
    // 1. Compose 파일 파싱
    const desired = this.parseComposeFile(composeFile);
    const effectiveProjectName = projectName || desired.name || 'default';

    // 2. 실제 컨테이너 조회
    const actual = await this.dockerService.listContainers({ all: true });

    // 3. 매칭 및 Drift 탐지
    const { differences, untracked } = this.compareSt ates(
      desired.services,
      actual,
      effectiveProjectName
    );

    // 4. 상태 판단
    const status: DriftStatus = differences.length > 0 ? DriftStatus.DRIFTED : DriftStatus.SYNCED;

    // 5. 요약 생성
    const summary = this.generateSummary(differences);

    return {
      timestamp: new Date().toISOString(),
      composeFile,
      status,
      differences,
      untracked,
      summary,
    };
  }

  private parseComposeFile(filePath: string): ComposeFile {
    try {
      if (!fs.existsSync(filePath)) {
        const error: BconError = {
          code: ErrorCode.COMPOSE_FILE_NOT_FOUND,
          message: i18n.t('errors.compose_file_not_found', { filePath }),
        };
        throw error;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(content) as ComposeFile;

      return parsed;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      const bconError: BconError = {
        code: ErrorCode.COMPOSE_PARSE_ERROR,
        message: i18n.t('errors.compose_parse_error', {
          error: error instanceof Error ? error.message : String(error),
        }),
      };
      throw bconError;
    }
  }

  private compareStates(
    services: Record<string, ComposeService>,
    containers: ContainerInfo[],
    projectName: string
  ): { differences: ServiceDrift[]; untracked: ContainerInfo[] } {
    const differences: ServiceDrift[] = [];
    const matchedContainerIds = new Set<string>();

    // 각 서비스별 체크
    for (const [serviceName, service] of Object.entries(services)) {
      // MVP 제외: build, profiles, extends
      if (!service.image) {
        logger.warn(`서비스 ${serviceName}에 image가 없습니다 (MVP 미지원)`);
        continue;
      }

      // 매칭되는 컨테이너 찾기
      const matched = containers.filter((c) =>
        this.matchContainer(c, serviceName, projectName, service)
      );

      matched.forEach((c) => matchedContainerIds.add(c.id));

      // NOT_RUNNING 체크
      const expectedReplicas = service.deploy?.replicas || 1;
      const runningCount = matched.filter((c) => c.state === 'running').length;

      if (matched.length === 0) {
        differences.push({
          serviceName,
          driftType: DriftType.NOT_RUNNING,
          expected: { replicas: expectedReplicas, status: 'running' },
          actual: { replicas: 0, status: 'stopped' },
          message: i18n.t('drift.not_running', { serviceName }),
        });
      } else if (runningCount < expectedReplicas) {
        differences.push({
          serviceName,
          driftType: DriftType.REPLICA_MISMATCH,
          expected: { replicas: expectedReplicas },
          actual: { replicas: runningCount },
          message: i18n.t('drift.replica_mismatch', {
            serviceName,
            expected: expectedReplicas,
            actual: runningCount,
          }),
        });
      }

      // IMAGE_MISMATCH 체크 (첫 번째 컨테이너만)
      if (matched.length > 0 && service.image) {
        const container = matched[0];
        if (!this.imageMatches(container.image, service.image)) {
          differences.push({
            serviceName,
            driftType: DriftType.IMAGE_MISMATCH,
            expected: { image: service.image },
            actual: { image: container.image },
            message: i18n.t('drift.image_mismatch', { serviceName }),
          });
        }
      }
    }

    // 추적되지 않은 컨테이너 (EXTRA_CONTAINER)
    const untracked = containers.filter((c) => !matchedContainerIds.has(c.id));

    untracked.forEach((c) => {
      differences.push({
        serviceName: c.name,
        driftType: DriftType.EXTRA_CONTAINER,
        expected: {},
        actual: { name: c.name },
        message: i18n.t('drift.extra_container', { containerName: c.name }),
      });
    });

    return { differences, untracked };
  }

  private matchContainer(
    container: ContainerInfo,
    serviceName: string,
    projectName: string,
    service: ComposeService
  ): boolean {
    // 1. com.docker.compose.service 라벨 매칭
    if (container.labels['com.docker.compose.service'] === serviceName) {
      return true;
    }

    // 2. container_name 매칭
    if (service.container_name && container.name === service.container_name) {
      return true;
    }

    // 3. 프로젝트명-서비스명 패턴 매칭
    const expectedPattern = `${projectName}-${serviceName}`;
    if (container.name.startsWith(expectedPattern)) {
      return true;
    }

    return false;
  }

  private imageMatches(actualImage: string, expectedImage: string): boolean {
    // 태그 비교 (latest는 생략 가능)
    const normalize = (img: string) => {
      if (!img.includes(':')) {
        return `${img}:latest`;
      }
      return img;
    };

    return normalize(actualImage) === normalize(expectedImage);
  }

  private generateSummary(differences: ServiceDrift[]): string {
    if (differences.length === 0) {
      return '모든 서비스가 Compose 파일과 일치합니다';
    }

    const counts: Record<string, number> = {};
    differences.forEach((d) => {
      counts[d.driftType] = (counts[d.driftType] || 0) + 1;
    });

    const parts: string[] = [];
    Object.entries(counts).forEach(([type, count]) => {
      parts.push(`${type}: ${count}개`);
    });

    return `Drift 감지: ${parts.join(', ')}`;
  }
}
