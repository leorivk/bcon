/**
 * Docker 로그 파싱 유틸리티
 * TRD 참조: Docker 로그 멀티플렉싱 처리
 */

import { LogEntry } from '../types/index.js';
import { SENSITIVE_PATTERNS } from './constants.js';

/**
 * Docker 로그 스트림 파싱
 *
 * Docker 로그 포맷:
 * - [0]: stream type (0=stdin, 1=stdout, 2=stderr)
 * - [1-3]: reserved
 * - [4-7]: payload size (big-endian uint32)
 * - [8+]: payload
 */
export function parseDockerLogStream(buffer: Buffer, timestamps: boolean): LogEntry[] {
  const entries: LogEntry[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    // 최소 헤더 크기 확인
    if (offset + 8 > buffer.length) {
      break;
    }

    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);

    // payload 크기 검증
    if (offset + 8 + size > buffer.length) {
      break;
    }

    const payload = buffer.slice(offset + 8, offset + 8 + size);
    const message = payload.toString('utf8');

    // 타임스탬프 추출 (timestamps=true인 경우)
    let timestamp: string | null = null;
    let cleanMessage = message;

    if (timestamps) {
      const match = message.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s/);
      if (match) {
        timestamp = match[1];
        cleanMessage = message.substring(match[0].length);
      }
    }

    entries.push({
      timestamp,
      stream: streamType === 1 ? 'stdout' : 'stderr',
      message: cleanMessage.trimEnd(),
    });

    offset += 8 + size;
  }

  return entries;
}

/**
 * 민감 정보 마스킹
 */
export function maskSensitiveInfo(text: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (masked, pattern) => masked.replace(pattern, '[MASKED]'),
    text
  );
}

/**
 * 로그 엔트리 목록에서 민감 정보 마스킹
 */
export function maskLogEntries(entries: LogEntry[]): LogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    message: maskSensitiveInfo(entry.message),
  }));
}
