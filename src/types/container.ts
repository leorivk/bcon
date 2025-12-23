/**
 * 컨테이너 타입 정의
 * specs/types.md 기반
 */

export enum ContainerState {
  RUNNING = 'running',
  EXITED = 'exited',
  PAUSED = 'paused',
  RESTARTING = 'restarting',
  DEAD = 'dead',
  CREATED = 'created',
  REMOVING = 'removing',
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  created: string;
  ports: Record<string, string | null>;
  labels: Record<string, string>;
}

export interface ContainerStats {
  containerId: string;
  containerName: string;
  timestamp: string;

  // CPU
  cpuPercent: number;
  cpuCount: number;

  // Memory
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;

  // Network
  networkRxBytes: number;
  networkTxBytes: number;

  // Disk
  blockReadBytes: number;
  blockWriteBytes: number;
}

export interface LogEntry {
  timestamp: string | null;
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface ContainerLogs {
  containerId: string;
  containerName: string;
  entries: LogEntry[];
  tail: number;
  since: string | null;
}
