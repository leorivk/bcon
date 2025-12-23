# bcon - AI-mediated Container Operations

**bcon**은 AI Agent가 Docker 컨테이너를 관찰하고 진단할 수 있도록 돕는 MCP (Model Context Protocol) Server입니다.

## 특징

- **Read-Only**: 컨테이너 상태를 변경하지 않고 안전하게 관찰
- **AI-Powered 진단**: 룰 기반 엔진으로 컨테이너 문제 자동 진단
- **Drift Detection**: Docker Compose 파일과 실제 상태 비교
- **한국어 우선**: 모든 메시지가 한국어로 제공

## 요구사항

- Node.js >= 18
- Docker

## 설치

```bash
# npm으로 전역 설치
npm install -g bcon

# 또는 npx로 즉시 실행
npx bcon
```

## 사용법

### Claude Code에서 사용

`~/.config/claude-code/mcp-servers.json`에 다음 설정 추가:

```json
{
  "bcon": {
    "command": "npx",
    "args": ["bcon"]
  }
}
```

### 사용 가능한 Tools

#### 1. `health_check`
bcon과 Docker 데몬의 상태를 확인합니다.

```typescript
// 입력: 없음
// 출력: HealthCheck
```

#### 2. `list_containers`
실행 중인 컨테이너 목록을 조회합니다.

```typescript
// 입력
{
  "all": boolean,        // true면 중지된 컨테이너도 포함
  "filters": {           // 필터 (선택)
    "label": "app=web",
    "name": "nginx"
  }
}
// 출력: ContainerInfo[]
```

#### 3. `get_container_logs`
컨테이너 로그를 조회합니다.

```typescript
// 입력
{
  "containerId": string,
  "tail": number,        // 마지막 N줄 (기본: 100)
  "since": string,       // ISO 8601 datetime
  "timestamps": boolean  // 타임스탬프 포함 (기본: true)
}
// 출력: ContainerLogs
```

#### 4. `get_container_stats`
컨테이너 리소스 사용량을 조회합니다.

```typescript
// 입력
{
  "containerId": string
}
// 출력: ContainerStats
```

#### 5. `diagnose_container` ⭐ 킬러 피처
컨테이너 상태를 분석하고 문제를 진단합니다.

```typescript
// 입력
{
  "containerId": string,
  "includeLogs": boolean,  // 로그 분석 포함 (기본: true)
  "logTail": number        // 분석할 로그 줄 수 (기본: 200)
}
// 출력: DiagnosisReport
```

**진단 예시:**
- CPU/메모리 사용률 높음
- OOM (Out of Memory) 감지
- 재시작 루프 감지
- 로그 에러 패턴 분석
- 권장 조치 제안

#### 6. `detect_drift`
Docker Compose 파일과 실제 Docker 상태를 비교합니다.

```typescript
// 입력
{
  "composeFile": string,      // Compose 파일 경로
  "projectName": string       // 프로젝트 이름 (선택)
}
// 출력: DriftReport
```

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드
npm run dev

# 빌드
npm run build

# 타입 체크
npm run typecheck

# 린트
npm run lint

# 포맷
npm run format
```

## 아키텍처

```
src/
├── index.ts              # 엔트리포인트
├── server.ts             # MCP Server 초기화
├── tools/                # MCP Tool 구현
│   ├── health-check.ts
│   ├── list-containers.ts
│   ├── get-container-logs.ts
│   ├── get-container-stats.ts
│   ├── diagnose-container.ts  # 킬러 피처
│   └── detect-drift.ts
├── services/             # 비즈니스 로직
│   ├── docker.service.ts
│   ├── diagnosis-engine.ts    # 룰 기반 진단
│   └── drift-detector.ts
├── types/                # 타입 정의
├── utils/                # 유틸리티
└── locales/              # 국제화 (한국어 기본)
```

## 라이선스

MIT

## 관련 문서

- [RFC](./docs/rfc-v1.md) - 프로젝트 철학 및 비전
- [TRD](./docs/trd-v1.md) - 기술 요구사항 문서
- [Specs](./specs/) - 상세 스펙 (tools, types, behaviors)

## Level 1 (Read-Only)

bcon은 **Judgment before Action** 원칙을 따릅니다.

- ✅ 관찰, 진단, 설명
- ❌ 생성, 수정, 삭제

모든 작업은 Read-only이며, 시스템 상태를 절대 변경하지 않습니다.

---

Made with ❤️ for container operators
