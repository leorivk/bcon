/**
 * 진단 타입 정의
 * specs/types.md 기반
 */

import { ContainerState } from './container.js';

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum SymptomType {
  HIGH_CPU = 'high_cpu',
  HIGH_MEMORY = 'high_memory',
  OOM_KILLED = 'oom_killed',
  RESTART_LOOP = 'restart_loop',
  EXIT_ERROR = 'exit_error',
  NETWORK_ERROR = 'network_error',
  DISK_PRESSURE = 'disk_pressure',
  SLOW_RESPONSE = 'slow_response',
  LOG_ERROR = 'log_error',
}

export interface Symptom {
  type: SymptomType;
  severity: Severity;
  description: string;
  evidence: Record<string, unknown>;
  detectedAt: string;
}

export interface LikelyCause {
  description: string;
  confidence: number;
  evidence: string[];
  relatedSymptoms: SymptomType[];
}

export enum SuggestionUrgency {
  IMMEDIATE = 'immediate',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
}

export interface Suggestion {
  urgency: SuggestionUrgency;
  action: string;
  rationale: string;
  command: string | null;
}

export interface DiagnosisReport {
  containerId: string;
  containerName: string;
  timestamp: string;

  // 현재 상태 요약
  state: ContainerState;
  uptime: string | null;

  // 분석 결과
  symptoms: Symptom[];
  likelyCauses: LikelyCause[];
  suggestions: Suggestion[];

  // 요약
  summary: string;
  detailedExplanation: string;
}
