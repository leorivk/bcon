/**
 * 룰 기반 진단 엔진
 * specs/behaviors.md의 임계값 기반
 */

import {
  Symptom,
  SymptomType,
  Severity,
  LikelyCause,
  Suggestion,
  SuggestionUrgency,
  ContainerStats,
  LogEntry,
} from '../types/index.js';
import { THRESHOLDS } from '../utils/constants.js';
import { i18n } from '../utils/i18n.js';

export interface DiagnosisInput {
  stats: ContainerStats | null;
  logs: LogEntry[];
  restartCount: number;
  exitCode: number | null;
}

export interface DiagnosisResult {
  symptoms: Symptom[];
  likelyCauses: LikelyCause[];
  suggestions: Suggestion[];
}

export class DiagnosisEngine {
  diagnose(input: DiagnosisInput): DiagnosisResult {
    const symptoms: Symptom[] = [];

    // 1. CPU 체크
    if (input.stats) {
      const cpuSymptom = this.checkCPU(input.stats);
      if (cpuSymptom) symptoms.push(cpuSymptom);

      // 2. Memory 체크
      const memorySymptom = this.checkMemory(input.stats);
      if (memorySymptom) symptoms.push(memorySymptom);
    }

    // 3. 재시작 루프 체크
    const restartSymptom = this.checkRestartLoop(input.restartCount);
    if (restartSymptom) symptoms.push(restartSymptom);

    // 4. Exit 에러 체크
    if (input.exitCode !== null && input.exitCode !== 0) {
      symptoms.push(this.createExitErrorSymptom(input.exitCode));
    }

    // 5. 로그 에러 체크
    const logSymptoms = this.checkLogs(input.logs);
    symptoms.push(...logSymptoms);

    // 6. 원인 추정
    const likelyCauses = this.analyzeCauses(symptoms);

    // 7. 권장 조치 생성
    const suggestions = this.generateSuggestions(symptoms, likelyCauses);

    return { symptoms, likelyCauses, suggestions };
  }

  private checkCPU(stats: ContainerStats): Symptom | null {
    const { cpuPercent } = stats;

    if (cpuPercent > THRESHOLDS.CPU.CRITICAL) {
      return {
        type: SymptomType.HIGH_CPU,
        severity: Severity.CRITICAL,
        description: i18n.t('diagnosis.high_cpu', { percent: cpuPercent.toFixed(1) }),
        evidence: { cpuPercent, threshold: THRESHOLDS.CPU.CRITICAL },
        detectedAt: new Date().toISOString(),
      };
    } else if (cpuPercent > THRESHOLDS.CPU.ERROR) {
      return {
        type: SymptomType.HIGH_CPU,
        severity: Severity.ERROR,
        description: i18n.t('diagnosis.high_cpu', { percent: cpuPercent.toFixed(1) }),
        evidence: { cpuPercent, threshold: THRESHOLDS.CPU.ERROR },
        detectedAt: new Date().toISOString(),
      };
    } else if (cpuPercent > THRESHOLDS.CPU.WARNING) {
      return {
        type: SymptomType.HIGH_CPU,
        severity: Severity.WARNING,
        description: i18n.t('diagnosis.high_cpu', { percent: cpuPercent.toFixed(1) }),
        evidence: { cpuPercent, threshold: THRESHOLDS.CPU.WARNING },
        detectedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  private checkMemory(stats: ContainerStats): Symptom | null {
    const { memoryPercent } = stats;

    if (memoryPercent > THRESHOLDS.MEMORY.CRITICAL) {
      return {
        type: SymptomType.HIGH_MEMORY,
        severity: Severity.CRITICAL,
        description: i18n.t('diagnosis.high_memory', { percent: memoryPercent.toFixed(1) }),
        evidence: { memoryPercent, threshold: THRESHOLDS.MEMORY.CRITICAL },
        detectedAt: new Date().toISOString(),
      };
    } else if (memoryPercent > THRESHOLDS.MEMORY.ERROR) {
      return {
        type: SymptomType.HIGH_MEMORY,
        severity: Severity.ERROR,
        description: i18n.t('diagnosis.high_memory', { percent: memoryPercent.toFixed(1) }),
        evidence: { memoryPercent, threshold: THRESHOLDS.MEMORY.ERROR },
        detectedAt: new Date().toISOString(),
      };
    } else if (memoryPercent > THRESHOLDS.MEMORY.WARNING) {
      return {
        type: SymptomType.HIGH_MEMORY,
        severity: Severity.WARNING,
        description: i18n.t('diagnosis.high_memory', { percent: memoryPercent.toFixed(1) }),
        evidence: { memoryPercent, threshold: THRESHOLDS.MEMORY.WARNING },
        detectedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  private checkRestartLoop(restartCount: number): Symptom | null {
    if (restartCount >= THRESHOLDS.RESTART_COUNT_1H.CRITICAL) {
      return {
        type: SymptomType.RESTART_LOOP,
        severity: Severity.CRITICAL,
        description: i18n.t('diagnosis.restart_loop', { count: restartCount }),
        evidence: { restartCount, threshold: THRESHOLDS.RESTART_COUNT_1H.CRITICAL },
        detectedAt: new Date().toISOString(),
      };
    } else if (restartCount >= THRESHOLDS.RESTART_COUNT_1H.ERROR) {
      return {
        type: SymptomType.RESTART_LOOP,
        severity: Severity.ERROR,
        description: i18n.t('diagnosis.restart_loop', { count: restartCount }),
        evidence: { restartCount, threshold: THRESHOLDS.RESTART_COUNT_1H.ERROR },
        detectedAt: new Date().toISOString(),
      };
    } else if (restartCount >= THRESHOLDS.RESTART_COUNT_1H.WARNING) {
      return {
        type: SymptomType.RESTART_LOOP,
        severity: Severity.WARNING,
        description: i18n.t('diagnosis.restart_loop', { count: restartCount }),
        evidence: { restartCount, threshold: THRESHOLDS.RESTART_COUNT_1H.WARNING },
        detectedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  private createExitErrorSymptom(exitCode: number): Symptom {
    return {
      type: SymptomType.EXIT_ERROR,
      severity: Severity.ERROR,
      description: i18n.t('diagnosis.exit_error', { exitCode }),
      evidence: { exitCode },
      detectedAt: new Date().toISOString(),
    };
  }

  private checkLogs(logs: LogEntry[]): Symptom[] {
    const symptoms: Symptom[] = [];

    // OOM 킬 체크
    const oomLogs = logs.filter((log) =>
      /oomkilled|out of memory/i.test(log.message)
    );
    if (oomLogs.length > 0) {
      symptoms.push({
        type: SymptomType.OOM_KILLED,
        severity: Severity.CRITICAL,
        description: i18n.t('diagnosis.oom_killed'),
        evidence: { occurrences: oomLogs.length },
        detectedAt: new Date().toISOString(),
      });
    }

    // 에러 패턴 체크
    const errorLogs = logs.filter((log) =>
      /error|exception|fatal|panic|fail/i.test(log.message)
    );

    if (errorLogs.length > 0) {
      symptoms.push({
        type: SymptomType.LOG_ERROR,
        severity: Severity.WARNING,
        description: i18n.t('diagnosis.log_error', { count: errorLogs.length }),
        evidence: { errorCount: errorLogs.length, sampleErrors: errorLogs.slice(0, 3) },
        detectedAt: new Date().toISOString(),
      });
    }

    return symptoms;
  }

  private analyzeCauses(symptoms: Symptom[]): LikelyCause[] {
    const causes: LikelyCause[] = [];

    // OOM 킬 + 높은 메모리 → 메모리 부족
    if (
      symptoms.some((s) => s.type === SymptomType.OOM_KILLED) &&
      symptoms.some((s) => s.type === SymptomType.HIGH_MEMORY)
    ) {
      causes.push({
        description: '메모리 제한 초과로 컨테이너가 강제 종료되었습니다',
        confidence: 0.95,
        evidence: ['OOM 킬 로그 감지', '높은 메모리 사용률'],
        relatedSymptoms: [SymptomType.OOM_KILLED, SymptomType.HIGH_MEMORY],
      });
    }

    // 재시작 루프 + Exit 에러 → 애플리케이션 크래시
    if (
      symptoms.some((s) => s.type === SymptomType.RESTART_LOOP) &&
      symptoms.some((s) => s.type === SymptomType.EXIT_ERROR)
    ) {
      causes.push({
        description: '애플리케이션이 반복적으로 크래시하고 있습니다',
        confidence: 0.9,
        evidence: ['비정상 종료 감지', '반복적인 재시작'],
        relatedSymptoms: [SymptomType.RESTART_LOOP, SymptomType.EXIT_ERROR],
      });
    }

    // 높은 CPU만 있는 경우
    if (symptoms.some((s) => s.type === SymptomType.HIGH_CPU) && causes.length === 0) {
      causes.push({
        description: 'CPU 집약적인 작업이 실행 중이거나 무한 루프가 발생했을 수 있습니다',
        confidence: 0.7,
        evidence: ['높은 CPU 사용률'],
        relatedSymptoms: [SymptomType.HIGH_CPU],
      });
    }

    return causes;
  }

  private generateSuggestions(symptoms: Symptom[], causes: LikelyCause[]): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // OOM 관련
    if (symptoms.some((s) => s.type === SymptomType.OOM_KILLED)) {
      suggestions.push({
        urgency: SuggestionUrgency.IMMEDIATE,
        action: i18n.t('suggestions.increase_memory'),
        rationale: '현재 메모리 제한을 초과하여 컨테이너가 종료되고 있습니다',
        command: null,
      });
    }

    // 재시작 루프 관련
    if (symptoms.some((s) => s.type === SymptomType.RESTART_LOOP)) {
      suggestions.push({
        urgency: SuggestionUrgency.IMMEDIATE,
        action: i18n.t('suggestions.check_logs'),
        rationale: '반복적인 재시작의 근본 원인을 파악해야 합니다',
        command: null,
      });
    }

    // 높은 리소스 사용
    if (symptoms.some((s) => s.type === SymptomType.HIGH_CPU || s.type === SymptomType.HIGH_MEMORY)) {
      suggestions.push({
        urgency: SuggestionUrgency.SHORT_TERM,
        action: i18n.t('suggestions.optimize_resource'),
        rationale: '리소스 사용을 최적화하면 성능이 개선될 수 있습니다',
        command: null,
      });
    }

    return suggestions;
  }
}
