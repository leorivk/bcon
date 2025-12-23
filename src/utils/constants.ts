/**
 * 상수 정의
 */

// 로그 제한
export const MAX_LOG_TAIL = 1000;
export const DEFAULT_LOG_TAIL = 100;

// 분석 제한
export const MAX_CONTAINERS_IN_DIAGNOSE_ALL = 50;
export const ANALYSIS_TIMEOUT_SECONDS = 30;

// Compose 파일 제한
export const MAX_COMPOSE_FILE_SIZE_MB = 5;

// 임계값 (specs/behaviors.md)
export const THRESHOLDS = {
  CPU: {
    WARNING: 70,
    ERROR: 85,
    CRITICAL: 95,
  },
  MEMORY: {
    WARNING: 75,
    ERROR: 85,
    CRITICAL: 95,
  },
  RESTART_COUNT_1H: {
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 5,
  },
  ERROR_LOG_RATE_PER_MIN: {
    WARNING: 10,
    ERROR: 50,
    CRITICAL: 100,
  },
} as const;

// 민감 정보 패턴
export const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
  /token\s*[:=]\s*\S+/gi,
];

// Docker API 허용 작업
export const ALLOWED_DOCKER_OPERATIONS = [
  'listContainers',
  'getContainer',
  'inspectContainer',
  'logs',
  'stats',
  'listImages',
  'listNetworks',
  'listVolumes',
] as const;
