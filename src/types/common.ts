/**
 * 공통 타입 정의
 * specs/types.md 기반
 */

export enum ErrorCode {
  DOCKER_CONNECTION_FAILED = 'docker_connection_failed',
  CONTAINER_NOT_FOUND = 'container_not_found',
  CONTAINER_NOT_RUNNING = 'container_not_running',
  COMPOSE_FILE_NOT_FOUND = 'compose_file_not_found',
  COMPOSE_PARSE_ERROR = 'compose_parse_error',
  PERMISSION_DENIED = 'permission_denied',
  INTERNAL_ERROR = 'internal_error',
}

export interface BconError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  status: HealthStatus;
  dockerConnected: boolean;
  dockerVersion: string | null;
  timestamp: string;
  message?: string;
}
