# bcon Technical Requirements Document (TRD)

**Version**: 1.0
**Date**: 2024-12
**Status**: Draft
**Target**: Level 1 MVP

---

## 1. Executive Summary

**bcon**은 AI Agent(Claude Code 등)가 Docker 컨테이너를 관찰하고 진단할 수 있도록 돕는 **MCP (Model Context Protocol) Server**입니다.

### 핵심 특징
- **MCP Server**: LLM을 호출하지 않음, Docker API 데이터만 수집/반환
- **Read-Only**: 컨테이너 상태 변경 불가 (Level 1 철학)
- **룰 기반 진단**: AI 추론 없이 임계값 기반 로직
- **배포**: `npx bcon`으로 설치 없이 실행

---

## 2. 기술 스택

### 2.1 Core Stack

| 영역 | 기술 | 버전 | 선정 근거 |
|-----|------|-----|----------|
| **언어** | TypeScript | 5.3+ | MCP SDK 공식 지원, 타입 안전성 |
| **런타임** | Node.js | 18+ | LTS, Claude Code 네이티브 환경 |
| **MCP SDK** | @modelcontextprotocol/sdk | latest | Anthropic 공식, 예제/문서 풍부 |
| **Docker SDK** | dockerode | 4.0+ | 주간 1.5M 다운로드, 타입 정의 내장 |
| **YAML Parser** | js-yaml | 4.1+ | Docker Compose 파일 파싱 |
| **CLI Framework** | commander | 12.0+ | npm 표준, 간단한 인터페이스 |

### 2.2 Development Tools

| 도구 | 버전 | 용도 |
|-----|------|------|
| **Build** | tsup | 8.0+ | 빠른 번들링, ESM/CJS 지원 |
| **Test** | vitest | 1.0+ | TypeScript 네이티브, 빠름 |
| **Lint** | eslint + @typescript-eslint | latest | 타입 안전성 강화 |
| **Format** | prettier | latest | 코드 스타일 일관성 |

### 2.3 배포

| 방식 | 명령어 | 타겟 사용자 |
|-----|--------|-----------|
| **npx** | `npx bcon` | Claude Code, Claude Desktop |
| **전역 설치** | `npm install -g bcon` | 자주 사용하는 사용자 |

---

## 3. 아키텍처

### 3.1 MCP Transport

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude Code)                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ MCP Protocol
┌─────────────────────────────────────────────────────────────┐
│                   Supported Transports                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   stdio      │  │   SSE        │  │    HTTP      │       │
│  │   (기본)      │  │  (미래)      │  │   (미래)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**MVP (Level 1)**: `stdio` only
- Claude Code, Claude Desktop 지원
- 프로세스 간 통신 (stdin/stdout)

**미래 확장**:
- `SSE` (Server-Sent Events): 웹 환경 지원
- `HTTP`: RESTful API 형태 (필요 시)

---

### 3.2 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude Code)                    │
│  "api-server 컨테이너 로그 보여줘"                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ MCP Protocol (stdio)
┌─────────────────────────────────────────────────────────────┐
│                      bcon MCP Server                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MCP Protocol Handler                     │   │
│  │  - Tool Registration                                  │   │
│  │  - Request/Response Validation                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Tool Router                         │   │
│  │  health_check → HealthCheckTool                       │   │
│  │  list_containers → ListContainersTool                 │   │
│  │  get_container_logs → GetContainerLogsTool            │   │
│  │  ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Tool Implementations                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Health  │  │   List   │  │  Logs    │            │   │
│  │  │  Check   │  │Containers│  │  Tool    │  ...       │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Core Services                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Docker  │  │  Drift   │  │Diagnosis │            │   │
│  │  │ Service  │  │ Detector │  │  Engine  │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Data Layer                          │   │
│  │  ┌──────────┐  ┌──────────┐                           │   │
│  │  │ dockerode│  │ fs/path  │  (Docker Compose 파일)   │   │
│  │  └──────────┘  └──────────┘                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Docker API   │  │  Log Files   │  │  Git Repo    │       │
│  │ (unix socket)│  │              │  │  (Compose)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 디렉토리 구조

```
bcon/
├── src/
│   ├── index.ts                 # MCP Server 엔트리포인트
│   ├── server.ts                # MCP Server 초기화
│   ├── tools/                   # MCP Tool 구현
│   │   ├── index.ts             # Tool 등록
│   │   ├── health-check.ts
│   │   ├── list-containers.ts
│   │   ├── get-container-logs.ts
│   │   ├── get-container-stats.ts
│   │   ├── diagnose-container.ts
│   │   └── detect-drift.ts
│   ├── services/                # Core 비즈니스 로직
│   │   ├── docker.service.ts    # Docker API 래퍼
│   │   ├── drift-detector.ts    # Drift 탐지 로직
│   │   └── diagnosis-engine.ts  # 룰 기반 진단 엔진
│   ├── types/                   # TypeScript 타입 정의
│   │   ├── index.ts
│   │   ├── container.ts         # specs/types.md 기반
│   │   ├── drift.ts
│   │   ├── diagnosis.ts
│   │   └── mcp.ts
│   ├── utils/                   # 유틸리티
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   ├── log-parser.ts        # Docker 로그 멀티플렉싱 처리
│   │   ├── i18n.ts              # 다국어 지원
│   │   └── constants.ts
│   └── locales/                 # 메시지 번역
│       ├── en.json              # 영어 (기본)
│       └── ko.json              # 한국어
├── tests/                       # 테스트
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│       └── docker-compose.test.yml
├── docs/                        # 문서
│   └── TRD.md
├── specs/                       # 스펙 문서 (기존)
├── package.json
├── tsconfig.json
├── tsup.config.ts               # 빌드 설정
└── README.md
```

---

## 4. MVP 기능 명세

### 4.1 우선순위 (구현 순서)

1. `health_check`
2. `list_containers`
3. `get_container_logs`
4. `get_container_stats`
5. `diagnose_container` (룰 기반)
6. `detect_drift`

### 4.2 Tool 인터페이스

#### 4.2.1 health_check

**목적**: bcon 자체와 Docker 데몬 상태 확인

**Input**: 없음

**Output**:
```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  dockerConnected: boolean,
  dockerVersion: string | null,
  timestamp: string,
  message?: string
}
```

**구현 로직**:
1. Docker 데몬 연결 시도
2. Docker 버전 조회
3. 상태 판단 반환

---

#### 4.2.2 list_containers

**목적**: 컨테이너 목록 조회

**Input**:
```typescript
{
  all?: boolean,           // true면 중지된 컨테이너도 포함
  filters?: {              // 필터 (선택사항)
    label?: string,
    name?: string
  }
}
```

**Output**:
```typescript
ContainerInfo[] // specs/types.md 기반
```

**구현 로직**:
1. dockerode `listContainers()` 호출
2. 필터 적용
3. `ContainerInfo` 타입으로 변환

---

#### 4.2.3 get_container_logs

**목적**: 컨테이너 로그 조회

**Input**:
```typescript
{
  containerId: string,
  tail?: number,           // 기본 100
  since?: string,          // ISO 8601 datetime
  until?: string,
  timestamps?: boolean     // 기본 true
}
```

**Output**:
```typescript
{
  containerId: string,
  containerName: string,
  entries: LogEntry[],
  tail: number
}
```

**구현 로직**:
1. 컨테이너 존재 확인
2. dockerode `logs()` 호출 (stream=true)
3. **로그 멀티플렉싱 처리** (중요):
   ```typescript
   // Docker 로그 포맷: 8바이트 헤더 + 페이로드
   // [0]: stream type (0=stdin, 1=stdout, 2=stderr)
   // [1-3]: reserved
   // [4-7]: payload size (big-endian uint32)
   // [8+]: payload

   function parseDockerLogStream(buffer: Buffer): LogEntry[] {
     const entries: LogEntry[] = [];
     let offset = 0;

     while (offset < buffer.length) {
       const streamType = buffer[offset];
       const size = buffer.readUInt32BE(offset + 4);
       const payload = buffer.slice(offset + 8, offset + 8 + size);

       entries.push({
         stream: streamType === 1 ? 'stdout' : 'stderr',
         message: payload.toString('utf8'),
         timestamp: extractTimestamp(payload), // if timestamps=true
       });

       offset += 8 + size;
     }

     return entries;
   }
   ```
4. 민감 정보 마스킹 (password, api_key, token 등)
5. tail 제한 적용

**예상 소요 시간**: 로그 파싱 구현에 추가 시간 필요 (0.5일)

---

#### 4.2.4 get_container_stats

**Input**:
```typescript
{
  containerId: string
}
```

**Output**:
```typescript
ContainerStats // specs/types.md 기반
```

**구현 로직**:
1. 컨테이너 실행 상태 확인
2. dockerode `stats()` 호출
3. CPU%, Memory% 계산
4. `ContainerStats` 타입으로 변환

**에러 케이스**:
- 컨테이너 중지 시: `CONTAINER_NOT_RUNNING` 에러

---

#### 4.2.5 diagnose_container (킬러 피처)

**Input**:
```typescript
{
  containerId: string,
  includeLogs?: boolean,   // 기본 true
  logTail?: number         // 기본 200
}
```

**Output**:
```typescript
DiagnosisReport // specs/types.md 기반
```

**구현 로직** (룰 기반):

1. **데이터 수집**:
   - 컨테이너 정보 (`inspect`)
   - 리소스 사용량 (`stats`)
   - 로그 (에러 패턴 탐지)
   - 재시작 이력

2. **증상 탐지** (specs/behaviors.md 임계값):
   ```typescript
   // CPU 체크
   if (cpuPercent > 95) → Symptom: HIGH_CPU (CRITICAL)
   if (cpuPercent > 85) → Symptom: HIGH_CPU (ERROR)
   if (cpuPercent > 70) → Symptom: HIGH_CPU (WARNING)

   // Memory 체크
   if (memoryPercent > 95) → Symptom: HIGH_MEMORY (CRITICAL)
   if (memoryPercent > 85) → Symptom: HIGH_MEMORY (ERROR)
   if (memoryPercent > 75) → Symptom: HIGH_MEMORY (WARNING)

   // 재시작 루프
   if (restartCount >= 5 in last 1h) → Symptom: RESTART_LOOP (CRITICAL)
   if (restartCount >= 3 in last 1h) → Symptom: RESTART_LOOP (ERROR)

   // 로그 에러
   if (errorLogRate > 100/min) → Symptom: LOG_ERROR (CRITICAL)
   if (errorLogRate > 50/min) → Symptom: LOG_ERROR (ERROR)
   if (errorLogRate > 10/min) → Symptom: LOG_ERROR (WARNING)

   // OOM 킬
   if (logs contains "OOMKilled" or "Out of memory") → Symptom: OOM_KILLED (CRITICAL)

   // Exit 에러
   if (exitCode != 0 && exitCode != null) → Symptom: EXIT_ERROR
   ```

3. **원인 추정** (신뢰도 계산):
   ```typescript
   // 예시: HIGH_MEMORY + OOM_KILLED
   {
     description: "Memory limit exceeded, container was killed",
     confidence: 0.95,
     evidence: [
       "Memory usage at 98%",
       "OOMKilled detected in logs"
     ]
   }
   ```

4. **권장 조치 생성**:
   ```typescript
   {
     urgency: "immediate",
     action: "Increase memory limit or optimize memory usage",
     rationale: "Current memory usage has reached the limit"
   }
   ```

5. **요약 생성**:
   - 한 줄 요약: "Memory pressure detected (98% usage)"
   - 상세 설명: 증상/원인/권장조치 종합

---

#### 4.2.6 detect_drift

**Input**:
```typescript
{
  composeFile: string,     // Docker Compose 파일 경로
  projectName?: string     // 없으면 파일에서 추론
}
```

**Output**:
```typescript
DriftReport // specs/types.md 기반
```

**구현 로직**:

1. **Desired State 추출**:
   - Docker Compose 파일 파싱 (js-yaml)
   - 서비스별 정의 추출 (replicas, image, env 등)

2. **Actual State 조회**:
   - Docker API로 실행 중인 컨테이너 조회
   - 프로젝트명/라벨로 매칭

3. **매칭 규칙** (specs/behaviors.md):
   ```typescript
   // 우선순위 순
   1. container.labels["com.docker.compose.service"] === service.name
   2. container.name.startsWith(`${projectName}-${service.name}`)
   3. container.name === service.container_name (if specified)
   ```

4. **Drift 탐지**:
   ```typescript
   // NOT_RUNNING
   if (service in compose && containers.length === 0)
     → "Service should be running but is stopped"

   // REPLICA_MISMATCH
   if (service.deploy.replicas !== actualContainers.length)
     → "Replica count mismatch"

   // IMAGE_MISMATCH
   if (service.image !== container.image)
     → "Image version mismatch"

   // CONFIG_MISMATCH (환경변수, 포트)
   if (service.environment !== container.env)
     → "Environment variable mismatch"

   // EXTRA_CONTAINER
   if (container not in compose)
     → "Container running but not defined in Compose"
   ```

5. **MVP에서 지원하지 않는 케이스** (미래 추가):
   ```yaml
   # ❌ MVP 제외
   services:
     app:
       build: .              # build 디렉티브 (이미지 없음)
       profiles: [dev]       # 조건부 실행
       extends:              # Compose 파일 상속
         file: common.yml

   # ✅ MVP 지원
   services:
     app:
       image: myapp:v1       # 명시적 이미지
       replicas: 3
       environment:
         - KEY=VALUE
   ```

   **처리 방식**:
   - `build` 디렉티브: 경고 메시지 출력, 해당 서비스 스킵
   - `profiles`: 경고 메시지, 스킵
   - `extends`: 경고 메시지, 스킵

6. **심각도 판단** (specs/behaviors.md):
   ```
   NOT_RUNNING → ERROR
   MISSING_SERVICE → ERROR
   IMAGE_MISMATCH → WARNING
   REPLICA_MISMATCH → WARNING
   CONFIG_MISMATCH → INFO
   EXTRA_CONTAINER → INFO
   ```

7. **리포트 생성**:
   ```typescript
   {
     timestamp: "2024-12-23T...",
     status: "drifted",
     differences: [...],
     untracked: [...],
     unsupported: [           // MVP에서 미지원 서비스
       {
         service: "app",
         reason: "build directive not supported in MVP",
         suggestion: "Use explicit 'image:' field"
       }
     ],
     summary: "2 services drifted (api: replica mismatch, redis: stopped)"
   }
   ```

---

## 5. 국제화 (i18n)

### 5.1 지원 언어

| 언어 | 로케일 | 우선순위 |
|-----|--------|---------|
| 영어 | `en` | 기본 (Default) |
| 한국어 | `ko` | 옵션 |

### 5.2 메시지 구조

```typescript
// src/locales/en.json
{
  "errors": {
    "docker_connection_failed": "Failed to connect to Docker daemon. Is Docker running?",
    "container_not_found": "Container '{{containerId}}' not found"
  },
  "diagnosis": {
    "high_cpu": "CPU usage is high ({{percent}}%)",
    "high_memory": "Memory usage is high ({{percent}}%)"
  }
}

// src/locales/ko.json
{
  "errors": {
    "docker_connection_failed": "Docker 데몬에 연결할 수 없습니다. Docker가 실행 중인가요?",
    "container_not_found": "컨테이너 '{{containerId}}'를 찾을 수 없습니다"
  },
  "diagnosis": {
    "high_cpu": "CPU 사용률이 높습니다 ({{percent}}%)",
    "high_memory": "메모리 사용률이 높습니다 ({{percent}}%)"
  }
}
```

### 5.3 로케일 선택

```typescript
// 우선순위:
// 1. 환경변수 BCON_LANG
// 2. 시스템 로케일 (process.env.LANG)
// 3. 기본값: en

const locale = process.env.BCON_LANG
  || process.env.LANG?.split('.')[0]
  || 'en';
```

---

## 6. 에러 처리

### 6.1 에러 타입

```typescript
enum ErrorCode {
  DOCKER_CONNECTION_FAILED = "docker_connection_failed",
  CONTAINER_NOT_FOUND = "container_not_found",
  CONTAINER_NOT_RUNNING = "container_not_running",
  COMPOSE_FILE_NOT_FOUND = "compose_file_not_found",
  COMPOSE_PARSE_ERROR = "compose_parse_error",
  PERMISSION_DENIED = "permission_denied",
  INTERNAL_ERROR = "internal_error"
}

interface BconError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}
```

### 6.2 에러 응답 형식

```typescript
// MCP Tool 에러 응답
{
  "error": {
    "code": "container_not_found",
    "message": "Container 'abc123' not found",
    "details": {
      "containerId": "abc123"
    }
  }
}
```

### 6.3 Graceful Degradation

```typescript
// 예: diagnose_container에서 stats 조회 실패 시
try {
  stats = await getContainerStats(containerId);
} catch (error) {
  stats = null;
  warnings.push("Unable to retrieve stats (container may be stopped)");
}
// stats 없이도 로그 분석은 계속 진행
```

---

## 7. 보안

### 7.1 민감 정보 마스킹

```typescript
const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
  /token\s*[:=]\s*\S+/gi,
];

function maskSensitive(text: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (masked, pattern) => masked.replace(pattern, '[MASKED]'),
    text
  );
}
```

### 7.2 경로 검증

```typescript
import * as nodePath from 'path';
import * as fs from 'fs';

// Compose 파일 경로 검증
function validateComposePath(filePath: string): boolean {
  const resolved = nodePath.resolve(filePath);  // ✅ 변수명 충돌 방지

  // 절대 경로 또는 현재 디렉토리 기준 상대 경로만 허용
  // 심볼릭 링크 해석 후 검증

  return fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}
```

### 7.3 Read-Only 강제

```typescript
// Docker API 호출 whitelist
const ALLOWED_OPERATIONS = [
  'listContainers',
  'getContainer',
  'inspectContainer',
  'logs',
  'stats',
  'listImages',
  'listNetworks',
  'listVolumes',
];

// 금지된 작업 시도 시 에러
const FORBIDDEN_OPERATIONS = [
  'createContainer',
  'startContainer',
  'stopContainer',
  'restartContainer',
  'removeContainer',
  // ...
];
```

---

## 8. 성능 요구사항

### 8.1 응답 시간

| Tool | 목표 응답 시간 | 비고 |
|------|--------------|------|
| health_check | < 100ms | 캐싱 불필요 |
| list_containers | < 500ms | 컨테이너 50개 기준 |
| get_container_logs | < 1s | tail=100 기준 |
| get_container_stats | < 300ms | 단일 컨테이너 |
| diagnose_container | < 3s | 로그 분석 포함 |
| detect_drift | < 2s | 서비스 10개 기준 |

### 8.2 리소스 제한

```typescript
const LIMITS = {
  MAX_LOG_TAIL: 1000,              // 최대 로그 라인
  DEFAULT_LOG_TAIL: 100,
  MAX_CONTAINERS_IN_LIST: 100,     // 한 번에 조회할 최대 컨테이너
  ANALYSIS_TIMEOUT_MS: 30000,      // 개별 분석 타임아웃
  MAX_COMPOSE_FILE_SIZE_MB: 5,     // Compose 파일 최대 크기
};
```

### 8.3 캐싱 전략 (미래 최적화)

```typescript
// Level 1 MVP에서는 캐싱 미구현
// 추후 필요 시 추가:
const CACHE_TTL = {
  containerList: 5,      // 5초
  containerStats: 10,    // 10초
  containerLogs: 30,     // 30초
  driftReport: 60,       // 60초
};
```

---

## 9. 개발 워크플로우

### 9.1 개발 환경 설정

```bash
# 프로젝트 초기화
npm init -y

# 의존성 설치
npm install dockerode js-yaml @modelcontextprotocol/sdk commander

# 개발 의존성
npm install -D typescript @types/node @types/dockerode tsup vitest eslint prettier

# TypeScript 설정
npx tsc --init
```

### 9.2 스크립트

```json
{
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:integration": "vitest run tests/integration",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "typecheck": "tsc --noEmit"
  }
}
```

### 9.3 빌드 설정 (tsup.config.ts)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  shims: true,
  target: 'node18',
});
```

---

## 10. 테스트 전략

### 10.1 테스트 레벨

| 레벨 | 도구 | 범위 |
|-----|------|-----|
| **Unit** | vitest | 개별 함수/클래스 (docker.service, diagnosis-engine 등) |
| **Integration** | vitest + Docker | Tool 전체 플로우 (실제 Docker 컨테이너 사용) |
| **E2E** | 수동 | MCP 클라이언트 연동 (Claude Code) |

### 10.2 테스트 컨테이너 관리

```yaml
# tests/fixtures/docker-compose.test.yml
version: '3.8'

services:
  test-nginx:
    image: nginx:alpine
    ports:
      - "18080:80"
    deploy:
      replicas: 2
    labels:
      - "bcon.test=true"

  test-redis:
    image: redis:alpine
    labels:
      - "bcon.test=true"

  test-failing:
    image: alpine:latest
    command: sh -c "exit 1"  # 즉시 종료 (EXIT_ERROR 테스트용)
    labels:
      - "bcon.test=true"
```

**Integration 테스트 워크플로우**:
```typescript
// tests/integration/setup.ts
import { execSync } from 'child_process';

export async function setupTestContainers() {
  execSync('docker-compose -f tests/fixtures/docker-compose.test.yml up -d');
}

export async function teardownTestContainers() {
  execSync('docker-compose -f tests/fixtures/docker-compose.test.yml down -v');
}

// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: './tests/integration/setup.ts',
  },
});
```

### 10.3 Mock 전략

```typescript
// Unit 테스트: dockerode mock
vi.mock('dockerode');

// Integration 테스트: 실제 Docker 컨테이너
// - docker-compose.test.yml로 미리 띄우고 테스트
```

### 10.4 CI/CD

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test       # Unit 테스트
      - run: docker-compose -f tests/fixtures/docker-compose.test.yml up -d
      - run: npm run test:integration
      - run: docker-compose -f tests/fixtures/docker-compose.test.yml down -v
```

---

## 11. 배포

### 11.1 package.json 설정

```json
{
  "name": "bcon",
  "version": "0.1.0",
  "description": "AI-mediated Container Operations MCP Server",
  "bin": {
    "bcon": "./dist/index.js"
  },
  "files": [
    "dist",
    "src/locales"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 11.2 배포 방식

```bash
# 1. npx로 즉시 실행
npx bcon

# 2. 전역 설치
npm install -g bcon
bcon

# 3. Claude Code 설정 (~/.config/claude-code/mcp-servers.json)
{
  "bcon": {
    "command": "npx",
    "args": ["bcon"]
  }
}
```

---

## 12. 성공 지표 (Level 1 MVP)

| 메트릭 | 목표 | 측정 방법 |
|-------|-----|---------|
| **Docker 연결 성공률** | 99%+ | health_check 성공률 |
| **진단 정확도** | 80%+ | 수동 검증 (샘플 10개) |
| **응답 시간** | 모든 Tool < 3s | 성능 테스트 |
| **에러 메시지 명확도** | "이해했다" 80%+ | 사용자 피드백 |

---

## 13. 마일스톤

### Phase 0: 프로젝트 초기화 (1일)
- ✅ TRD 작성
- 프로젝트 구조 생성
- package.json, tsconfig.json, tsup.config.ts 설정
- MCP Server 기본 골격
- i18n 구조 (en.json, ko.json)

### Phase 1: 기본 Tool 구현 (2-3일)
- health_check
- list_containers
- get_container_logs (**로그 파싱 +0.5일**)
- get_container_stats

### Phase 2: 고급 Tool 구현 (3-4일)
- diagnose_container (룰 기반 엔진)
- detect_drift (Compose 파싱 + 매칭)
  - MVP 지원 범위 제한 (build/profiles/extends 제외)

### Phase 3: 테스트 & 문서화 (2-3일)
- Unit 테스트 (커버리지 70%+)
- Integration 테스트 (docker-compose.test.yml)
- README.md, 사용 예시
- i18n 테스트 (en, ko)

### Phase 4: 배포 준비 (1일)
- npm 퍼블리싱
- Claude Code 설정 예시
- 초기 사용자 피드백 수집

**전체 예상 기간**: 8-11일 (로그 파싱 + 테스트 컨테이너 관리 추가 시간 반영)

---

## 14. 위험 요소 & 대응

| 위험 | 영향도 | 대응 |
|-----|-------|-----|
| **MCP SDK 변경** | 중 | SDK 버전 고정, 업데이트 주기적 확인 |
| **dockerode 버그** | 중 | 대체 옵션 없음, 이슈 트래킹 |
| **Docker 로그 파싱 복잡도** | 중 | 8바이트 헤더 처리 구현 시간 +0.5일 확보 |
| **Docker Compose 스펙 변화** | 낮 | 주요 버전(v3, v4)만 지원 명시 |
| **성능 이슈** | 낮 | 캐싱 추가 (미래 최적화) |
| **국제화 유지보수** | 낮 | 초기 2개 언어만 지원, 추후 확장 |

---

## 15. 미래 확장 (Level 2+)

Level 1 완성 후 고려사항:

- **Level 2**:
  - 승인 기반 실행 (restart, scale)
  - Intent-to-YAML 변환
  - Cost Budgeting

- **다중 런타임 지원**:
  - Podman
  - Containerd

- **원격 Docker 지원**:
  - SSH 터널링
  - Docker Context 활용

- **Compose 고급 기능**:
  - `build` 디렉티브 지원
  - `profiles` 조건부 실행
  - `extends` 상속

- **Transport 확장**:
  - SSE (웹 환경)
  - HTTP API

---

## 16. 참고 자료

- [MCP Protocol Spec](https://modelcontextprotocol.io/docs)
- [dockerode API](https://github.com/apocas/dockerode)
- [Docker Compose Spec](https://docs.docker.com/compose/compose-file/)
- [Docker Stream Multiplexing](https://docs.docker.com/engine/api/v1.43/#tag/Container/operation/ContainerAttach)
- specs/ 디렉토리 (rfc-v1.md, tools.md, behaviors.md, types.md)

---

## 17. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|-----|-----|---------|
| 2024-12-23 | 1.0 | 초기 TRD 작성 |
| 2024-12-23 | 1.1 | 피드백 반영:<br>- MCP Transport 명시 (stdio 기본, SSE/HTTP 미래)<br>- 로그 파싱 복잡도 추가 (8바이트 헤더)<br>- detect_drift MVP 범위 명확화<br>- i18n 구조 추가 (en 기본, ko 옵션)<br>- 테스트 컨테이너 관리 방법 (docker-compose.test.yml)<br>- 경로 검증 변수명 충돌 수정 |

---

**승인 요청**: 이 TRD를 기반으로 구현을 시작해도 될까요?
