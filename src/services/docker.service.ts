/**
 * Docker API 래퍼
 */

import Dockerode from 'dockerode';
import { ContainerInfo, ContainerState, ErrorCode, BconError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { i18n } from '../utils/i18n.js';

export class DockerService {
  private docker: Dockerode;

  constructor() {
    this.docker = new Dockerode();
  }

  /**
   * Docker 연결 테스트
   */
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      logger.error('Docker ping 실패:', error);
      return false;
    }
  }

  /**
   * Docker 버전 조회
   */
  async getVersion(): Promise<string | null> {
    try {
      const info = await this.docker.version();
      return info.Version || null;
    } catch (error) {
      logger.error('Docker 버전 조회 실패:', error);
      return null;
    }
  }

  /**
   * 컨테이너 목록 조회
   */
  async listContainers(options: {
    all?: boolean;
    filters?: Record<string, string>;
  } = {}): Promise<ContainerInfo[]> {
    try {
      const dockerFilters: Record<string, string[]> = {};

      // 필터 변환
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          dockerFilters[key] = [value];
        });
      }

      const containers = await this.docker.listContainers({
        all: options.all || false,
        filters: dockerFilters,
      });

      return containers.map((container) => this.mapContainerInfo(container));
    } catch (error) {
      logger.error('컨테이너 목록 조회 실패:', error);
      throw this.createError(ErrorCode.DOCKER_CONNECTION_FAILED, error);
    }
  }

  /**
   * 특정 컨테이너 정보 조회
   */
  async getContainer(containerId: string): Promise<ContainerInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();

      return {
        id: info.Id.substring(0, 12),
        name: info.Name.replace(/^\//, ''),
        image: info.Config.Image,
        state: this.mapState(info.State.Status),
        status: info.State.Status,
        created: info.Created,
        ports: this.mapPorts(info.NetworkSettings.Ports),
        labels: info.Config.Labels || {},
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        throw this.createError(ErrorCode.CONTAINER_NOT_FOUND, error, { containerId });
      }
      logger.error('컨테이너 정보 조회 실패:', error);
      throw this.createError(ErrorCode.DOCKER_CONNECTION_FAILED, error);
    }
  }

  /**
   * Dockerode ContainerInfo를 우리 타입으로 변환
   */
  private mapContainerInfo(container: Dockerode.ContainerInfo): ContainerInfo {
    return {
      id: container.Id.substring(0, 12),
      name: container.Names[0]?.replace(/^\//, '') || '',
      image: container.Image,
      state: this.mapState(container.State),
      status: container.Status,
      created: new Date(container.Created * 1000).toISOString(),
      ports: this.mapPorts(container.Ports),
      labels: container.Labels || {},
    };
  }

  /**
   * 상태 매핑
   */
  private mapState(state: string): ContainerState {
    const stateMap: Record<string, ContainerState> = {
      running: ContainerState.RUNNING,
      exited: ContainerState.EXITED,
      paused: ContainerState.PAUSED,
      restarting: ContainerState.RESTARTING,
      dead: ContainerState.DEAD,
      created: ContainerState.CREATED,
      removing: ContainerState.REMOVING,
    };

    return stateMap[state.toLowerCase()] || ContainerState.EXITED;
  }

  /**
   * 포트 매핑
   */
  private mapPorts(ports: unknown): Record<string, string | null> {
    const result: Record<string, string | null> = {};

    if (Array.isArray(ports)) {
      // listContainers에서 반환하는 포트 형식
      ports.forEach((port: { PrivatePort: number; PublicPort?: number; Type: string }) => {
        const key = `${port.PrivatePort}/${port.Type}`;
        result[key] = port.PublicPort ? String(port.PublicPort) : null;
      });
    } else if (ports && typeof ports === 'object') {
      // inspect에서 반환하는 포트 형식
      Object.entries(ports).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          result[key] = value[0].HostPort || null;
        } else {
          result[key] = null;
        }
      });
    }

    return result;
  }

  /**
   * BconError 생성
   */
  private createError(
    code: ErrorCode,
    originalError: unknown,
    details?: Record<string, unknown>
  ): BconError {
    const message = i18n.t(`errors.${code}`, details as Record<string, string>);

    return {
      code,
      message,
      details: {
        ...details,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
      },
    };
  }
}
