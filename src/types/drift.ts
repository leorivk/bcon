/**
 * Drift Detection 타입 정의
 * specs/types.md 기반
 */

import { ContainerInfo } from './container.js';

export enum DriftStatus {
  SYNCED = 'synced',
  DRIFTED = 'drifted',
  UNKNOWN = 'unknown',
}

export enum DriftType {
  NOT_RUNNING = 'not_running',
  EXTRA_CONTAINER = 'extra_container',
  REPLICA_MISMATCH = 'replica_mismatch',
  IMAGE_MISMATCH = 'image_mismatch',
  CONFIG_MISMATCH = 'config_mismatch',
  MISSING_SERVICE = 'missing_service',
}

export interface ServiceDrift {
  serviceName: string;
  driftType: DriftType;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  message: string;
}

export interface DriftReport {
  timestamp: string;
  composeFile: string;
  status: DriftStatus;
  differences: ServiceDrift[];
  untracked: ContainerInfo[];
  summary: string;
}
